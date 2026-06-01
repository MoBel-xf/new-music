// src/composables/useColorExtract.ts
import { ref } from 'vue'
import { getColorSync } from 'colorthief'

const DEFAULT_COLOR = '#2C2C2C'
const CACHE_LIMIT = 80
const IMG_PROXY_BASE = import.meta.env.VITE_IMG_PROXY_BASE || ''
const cache = new Map<string, string>()
const pendingTasks = new Map<string, Promise<string>>()

const FALLBACK_IMAGE_PROXIES = [
  (url: string) => `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//i, ''))}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
]

export function useColorExtract() {
  const dominantColor = ref(DEFAULT_COLOR)
  const isExtracting = ref(false)

  async function extract(imageUrl: string): Promise<string> {
    if (!imageUrl) return DEFAULT_COLOR
    const cachedColor = peek(imageUrl)
    if (cachedColor) {
      dominantColor.value = cachedColor
      return dominantColor.value
    }

    if (pendingTasks.has(imageUrl)) {
      const color = await pendingTasks.get(imageUrl)!
      dominantColor.value = color
      return color
    }

    isExtracting.value = true
    const task = extractFromUrl(imageUrl)
    pendingTasks.set(imageUrl, task)
    try {
      const color = await task
      remember(imageUrl, color)
      dominantColor.value = color
      return color
    } catch {
      dominantColor.value = DEFAULT_COLOR
      return DEFAULT_COLOR
    } finally {
      pendingTasks.delete(imageUrl)
      isExtracting.value = false
    }
  }

  async function prefetch(imageUrls: Array<string | undefined | null>) {
    const urls = imageUrls.filter((item): item is string => Boolean(item && item.trim()))
    await Promise.all(
      urls.map(async (url) => {
        if (peek(url) || pendingTasks.has(url)) return
        try {
          const color = await extract(url)
          remember(url, color)
        } catch {
          // 预热失败不影响主流程
        }
      })
    )
  }

  return { dominantColor, isExtracting, extract, peek, prefetch }
}

function remember(imageUrl: string, color: string) {
  cache.set(imageUrl, color)
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
}

function peek(imageUrl: string) {
  if (!cache.has(imageUrl)) return null
  const cachedColor = cache.get(imageUrl)!
  cache.delete(imageUrl)
  cache.set(imageUrl, cachedColor)
  return cachedColor
}

function extractFromUrl(url: string): Promise<string> {
  if (!url || typeof window === 'undefined') return Promise.resolve(DEFAULT_COLOR)

  // 跳过已知 CORS 无法访问的域名
  const BLOCKED_HOSTS = ['d.musicapp.migu.cn', 'm.musicapp.migu.cn']
  try {
    const host = new URL(url.replace(/^http:\/\//i, 'https://')).hostname
    if (BLOCKED_HOSTS.includes(host)) return Promise.resolve(DEFAULT_COLOR)
  } catch { /* ignore */ }

  return new Promise((resolve) => {
    const candidates = buildImageCandidates(url)

    const run = async () => {
      for (const candidate of candidates) {
        const img = await loadImage(candidate)
        if (!img) continue
        try {
          const color = getColorSync(img)
          if (!color) continue
          const [r, g, b] = color.array()
          const tuned = tuneColor(r, g, b)
          resolve(`rgb(${tuned.r}, ${tuned.g}, ${tuned.b})`)
          return
        } catch {
          // 当前地址无法提色，继续尝试下一个候选地址
        }
      }
      resolve(DEFAULT_COLOR)
    }

    run().catch(() => resolve(DEFAULT_COLOR))
  })
}

function buildImageCandidates(rawUrl: string) {
  const safeUrl = rawUrl.replace(/^http:\/\//i, 'https://')
  const candidates = new Set<string>()

  let isCrossOrigin = true
  try {
    isCrossOrigin = new URL(safeUrl).origin !== window.location.origin
  } catch {
    /* noop */
  }

  if (IMG_PROXY_BASE) {
    candidates.add(buildQueryProxyUrl(IMG_PROXY_BASE, safeUrl))
  }

  if (import.meta.env.DEV) {
    candidates.add(`/img-proxy/${encodeURIComponent(safeUrl)}`)
  }

  candidates.add(safeUrl)

  if (isCrossOrigin) {
    FALLBACK_IMAGE_PROXIES.forEach((proxyBuilder) => candidates.add(proxyBuilder(safeUrl)))
  }

  return Array.from(candidates)
}

function buildQueryProxyUrl(base: string, targetUrl: string) {
  const normalizedBase = base.replace(/\/$/, '')
  if (normalizedBase.includes('/img-proxy/')) {
    return `${normalizedBase}${encodeURIComponent(targetUrl)}`
  }
  return `${normalizedBase}?url=${encodeURIComponent(targetUrl)}`
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.referrerPolicy = 'no-referrer'

    const timer = setTimeout(() => {
      img.onload = null
      img.onerror = null
      resolve(null)
    }, 5000)

    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }

    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }

    img.src = src
  })
}

// 调整饱和度和亮度到舒适范围
function tuneColor(r: number, g: number, b: number) {
  const { hue, saturation, lightness } = rgbToHsl(r, g, b)
  return hslToRgb(hue, Math.min(Math.max(saturation, 0.34), 0.82), Math.min(Math.max(lightness, 0.38), 0.58))
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255,
    g = green / 255,
    b = blue / 255
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { hue: 0, saturation: 0, lightness }
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue = 0
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
  else if (max === g) hue = (b - r) / delta + 2
  else hue = (r - g) / delta + 4
  return { hue: hue / 6, saturation, lightness }
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  if (saturation === 0) {
    const v = Math.round(lightness * 255)
    return { r: v, g: v, b: v }
  }
  const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation
  const p = 2 * lightness - q
  const toChannel = (h: number) => {
    let v = h
    if (v < 0) v += 1
    if (v > 1) v -= 1
    if (v < 1 / 6) return p + (q - p) * 6 * v
    if (v < 1 / 2) return q
    if (v < 2 / 3) return p + (q - p) * (2 / 3 - v) * 6
    return p
  }
  return {
    r: Math.round(toChannel(hue + 1 / 3) * 255),
    g: Math.round(toChannel(hue) * 255),
    b: Math.round(toChannel(hue - 1 / 3) * 255)
  }
}
