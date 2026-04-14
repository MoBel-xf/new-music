// src/api/index.ts
import type { Track, SearchOptions, MusicSource } from '@/types/music'
import { AVAILABLE_SOURCES } from './sources'
import * as miguApi from './migu'
import * as neteaseApi from './netease'
import * as qqApi from './qq'
import * as kuwoApi from './kuwo'

const apiMap: Record<
  MusicSource,
  {
    searchSongs: (opts: SearchOptions) => Promise<Track[]>
    fetchDetails: (track: Track) => Promise<Track>
  }
> = {
  migu: miguApi,
  netease: neteaseApi,
  qq: qqApi,
  kuwo: kuwoApi
}

/**
 * 并发搜索所有启用平台，结果交叉排列（供 HomePage 推荐等一次性搜索用）
 */
export async function searchAllSources(opts: SearchOptions, enabledSources?: MusicSource[]): Promise<Track[]> {
  const sources = (enabledSources ?? AVAILABLE_SOURCES).filter((s) => AVAILABLE_SOURCES.includes(s))
  if (!sources.length) return []

  const perSourceResults = await Promise.all(sources.map((src) => apiMap[src].searchSongs(opts).catch(() => [] as Track[])))

  // 交叉排列：migu[0], netease[0], ..., migu[1], netease[1], ...
  const out: Track[] = []
  const seen = new Set<string>()
  const maxLen = Math.max(0, ...perSourceResults.map((r) => r.length))
  for (let i = 0; i < maxLen; i++) {
    for (const tracks of perSourceResults) {
      const t = tracks[i]
      if (t && !seen.has(t.uid)) {
        seen.add(t.uid)
        out.push(t)
      }
    }
  }
  return out
}

/**
 * 按平台分发详情请求
 */
export async function fetchTrackDetails(track: Track): Promise<Track> {
  const result = await apiMap[track.source].fetchDetails(track)
  // 记录音频链接获取时间，用于判断链接是否过期
  if (result.audioUrl) result.urlFetchedAt = Date.now()
  return result
}

export { AVAILABLE_SOURCES }
