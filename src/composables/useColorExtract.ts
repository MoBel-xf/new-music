// src/composables/useColorExtract.ts
import { ref } from 'vue'
import { getColorSync } from 'colorthief'

const DEFAULT_COLOR = '#2C2C2C'
const CACHE_LIMIT = 80
const cache = new Map<string, string>()

export function useColorExtract() {
  const dominantColor = ref(DEFAULT_COLOR)
  const isExtracting = ref(false)

  async function extract(imageUrl: string): Promise<string> {
    if (!imageUrl) return DEFAULT_COLOR
    if (cache.has(imageUrl)) {
      const cachedColor = cache.get(imageUrl)!
      cache.delete(imageUrl)
      cache.set(imageUrl, cachedColor)
      dominantColor.value = cachedColor
      return dominantColor.value
    }

    isExtracting.value = true
    try {
      const color = await extractFromUrl(imageUrl)
      cache.set(imageUrl, color)
      if (cache.size > CACHE_LIMIT) {
        const oldest = cache.keys().next().value
        if (oldest) cache.delete(oldest)
      }
      dominantColor.value = color
      return color
    } catch {
      dominantColor.value = DEFAULT_COLOR
      return DEFAULT_COLOR
    } finally {
      isExtracting.value = false
    }
  }

  return { dominantColor, isExtracting, extract }
}

function extractFromUrl(url: string): Promise<string> {
  if (!url || typeof window === 'undefined') return Promise.resolve(DEFAULT_COLOR)

  return new Promise((resolve) => {
    const img = new Image()
    // 通过本地代理加载跨域图片，绕过 CORS 限制
    const proxyUrl = `/img-proxy/${encodeURIComponent(url)}`

    const timer = setTimeout(() => {
      img.onload = null
      img.onerror = null
      resolve(DEFAULT_COLOR)
    }, 5000)

    img.onload = () => {
      clearTimeout(timer)
      try {
        const color = getColorSync(img)
        if (!color) {
          resolve(DEFAULT_COLOR)
          return
        }
        const [r, g, b] = color.array()
        const tuned = tuneColor(r, g, b)
        resolve(`rgb(${tuned.r}, ${tuned.g}, ${tuned.b})`)
      } catch {
        resolve(DEFAULT_COLOR)
      }
    }

    img.onerror = () => {
      clearTimeout(timer)
      resolve(DEFAULT_COLOR)
    }

    img.src = proxyUrl
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
