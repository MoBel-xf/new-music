// src/utils/format.ts

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function inferQualityLabel(url?: string): string {
  if (!url) return ''
  const ext = url.split('?')[0].toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? ''
  if (['flac', 'wav', 'ape', 'alac', 'aiff'].includes(ext)) return 'LOSSLESS'
  return '320K'
}

export function buildCoverUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/^http:\/\//i, 'https://')
}

export function nanoid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
