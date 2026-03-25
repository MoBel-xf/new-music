// src/utils/lyric.ts
import type { LyricLine } from '@/types/music'

const TIME_RE = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g

export function parseLrc(lrc: string): LyricLine[] {
  if (!lrc) return []
  const lines: LyricLine[] = []

  for (const raw of lrc.split('\n')) {
    const text = raw.replace(TIME_RE, '').trim()
    if (!text) continue
    let match: RegExpExecArray | null
    TIME_RE.lastIndex = 0
    const timeTags = raw.matchAll(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g)
    for (const m of timeTags) {
      const min = parseInt(m[1])
      const sec = parseInt(m[2])
      const ms = m[3].length === 2 ? parseInt(m[3]) * 10 : parseInt(m[3])
      lines.push({ time: min * 60 + sec + ms / 1000, text })
    }
  }

  return lines.sort((a, b) => a.time - b.time)
}

export function findCurrentLyricIndex(lines: LyricLine[], currentTime: number): number {
  if (!lines.length) return -1
  let idx = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentTime) idx = i
    else break
  }
  return idx
}
