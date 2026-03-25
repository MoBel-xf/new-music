// src/utils/lrcFetch.ts
// 歌词需要拿原始 text/arraybuffer，统一走 axios request（responseType: arraybuffer）
import request from '@/utils/request'
import { CanceledError } from 'axios'

const LRC_PROXY_BASE = import.meta.env.VITE_LRC_PROXY_BASE || ''

const FALLBACK_PROXIES = [
  (url: string) => `https://cors.isomorphic-git.org/${url}`,
  (url: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
]

function buildProxyUrl(base: string, targetUrl: string) {
  const normalizedBase = base.replace(/\/$/, '')
  if (/api\.codetabs\.com\/v1\/proxy$/i.test(normalizedBase) || /\/api\/lrc$/i.test(normalizedBase)) {
    return `${normalizedBase}?quest=${encodeURIComponent(targetUrl)}`
  }
  return `${normalizedBase}?url=${encodeURIComponent(targetUrl)}`
}

function normalizeText(buf: ArrayBuffer): string {
  const s = new TextDecoder()
    .decode(buf)
    .replace(/^\uFEFF/, '')
    .trim()
  if (!s) return ''
  if (/^<!doctype html/i.test(s) || /^<html/i.test(s)) return ''
  return s
}

async function downloadText(url: string, cancelKey?: string): Promise<string> {
  const buf = await request.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    headers: { Accept: 'text/plain,text/*,*/*' },
    noRetry: true, // 歌词单次失败直接走下一个代理，不在此重试
    cancelKey,
    timeout: 8_000
  })
  return normalizeText(buf)
}

export async function fetchLyricText(url: string): Promise<string> {
  if (!url) return ''
  const safeUrl = url.replace(/^http:\/\//i, 'https://')

  let isCrossOrigin = true
  try {
    isCrossOrigin = new URL(safeUrl).origin !== window.location.origin
  } catch {
    /* noop */
  }

  const candidateSet = new Set<string>()
  candidateSet.add(safeUrl)
  if (LRC_PROXY_BASE) {
    candidateSet.add(buildProxyUrl(LRC_PROXY_BASE, safeUrl))
  }
  if (import.meta.env.DEV) {
    candidateSet.add(buildProxyUrl('/api/lrc', safeUrl))
  }
  if (isCrossOrigin) {
    FALLBACK_PROXIES.forEach((fn) => candidateSet.add(fn(safeUrl)))
  }

  const candidates = Array.from(candidateSet)

  for (const [i, endpoint] of candidates.entries()) {
    try {
      const text = await downloadText(endpoint, `lrc-${safeUrl}-${i}`)
      if (text) return text
    } catch (err) {
      // 被取消则直接停止，不继续尝试下一个代理
      if (err instanceof CanceledError) break
      // 其他错误继续尝试下一个代理
      if (import.meta.env.DEV) console.debug('[lrc fallback]', endpoint, err)
    }
  }
  return ''
}
