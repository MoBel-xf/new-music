// src/api/netease.ts
// 字段映射见 fieldMap.ts → NETEASE_SEARCH_MAP / NETEASE_DETAIL_MAP
// 真实接口字段已验证（vkeys.cn/v2/music/netease）
import request from '@/utils/request'
import type { Track, SearchOptions } from '@/types/music'
import { buildCoverUrl } from '@/utils/format'
import { NETEASE_SEARCH_MAP, NETEASE_DETAIL_MAP, getField } from './fieldMap'

const BASE = import.meta.env.VITE_NETEASE_API_BASE || '/api/netease'

// ── 搜索响应原始类型 ──────────────────────────────────────────────────────────
interface NeteaseSearchItem {
  id: number // NETEASE_SEARCH_MAP.id      → "id"
  song: string // NETEASE_SEARCH_MAP.title   → "song"
  singer: string // NETEASE_SEARCH_MAP.artist  → "singer"
  album: string // NETEASE_SEARCH_MAP.album   → "album"
  cover: string // NETEASE_SEARCH_MAP.cover   → "cover"
  quality?: string // NETEASE_SEARCH_MAP.quality → "quality"
  time?: string
}
interface NeteaseSearchResp {
  code: number
  data: NeteaseSearchItem[]
}

// ── 详情响应原始类型 ──────────────────────────────────────────────────────────
// 详情在 response.data 子对象里
interface NeteaseDetailData {
  id: number
  song: string
  singer: string
  album: string
  cover: string
  url: string // NETEASE_DETAIL_MAP.audioUrl → "url"
  quality?: string // NETEASE_DETAIL_MAP.quality  → "quality"
  kbps?: string // NETEASE_DETAIL_MAP.kbps     → "kbps"
  interval?: string
  size?: string
  link?: string
}
interface NeteaseDetailResp {
  code: number
  data: NeteaseDetailData
  message?: string
}

// ── 音质识别（netease 有 quality 文字描述，比 URL 扩展名更准确）────────────────
function resolveQuality(quality?: string, kbps?: string): string {
  const q = (quality || '').toLowerCase()
  const k = (kbps || '').toLowerCase()
  if (/lossless|无损|flac|ape|wav|spatial|臻音|sq|hi.?res/.test(q)) return 'LOSSLESS'
  if (/320/.test(k) || /超高/.test(q)) return '320K'
  if (/192/.test(k)) return '192K'
  if (/128/.test(k)) return '128K'
  return kbps ? kbps.replace('kbps', 'K') : ''
}

export async function searchSongs(opts: SearchOptions): Promise<Track[]> {
  const { keyword, page = 1, limit = 12 } = opts
  const json = await request.safeGet<NeteaseSearchResp>(BASE, {
    params: { word: keyword, page, num: limit },
    cancelKey: `netease-search-${keyword}-${page}`
  })
  if (!json || json.code !== 200 || !Array.isArray(json.data)) return []

  return json.data.map(
    (it, idx): Track => ({
      uid: `netease-${getField(it, NETEASE_SEARCH_MAP.id)}`,
      source: 'netease',
      title: getField(it, NETEASE_SEARCH_MAP.title) || 'Unknown',
      artist: getField(it, NETEASE_SEARCH_MAP.artist) || '',
      album: getField(it, NETEASE_SEARCH_MAP.album) || '',
      cover: buildCoverUrl(getField(it, NETEASE_SEARCH_MAP.cover) || ''),
      qualityLabel: NETEASE_SEARCH_MAP.quality ? getField(it, NETEASE_SEARCH_MAP.quality) || '' : '',
      // qualityLabel: resolveQuality(getField(it, NETEASE_SEARCH_MAP.quality!)),
      songId: String(getField(it, NETEASE_SEARCH_MAP.id)),
      displayIndex: (page - 1) * limit + idx + 1,
      keyword,
      detailsLoaded: false
    })
  )
}

export async function fetchDetails(track: Track): Promise<Track> {
  if (!track.songId) return track

  const json = await request.safeGet<NeteaseDetailResp>(BASE, {
    params: { id: track.songId },
    cancelKey: `netease-detail-${track.uid}`
  })
  if (!json || json.code !== 200 || !json.data) return track

  // 详情字段在 json.data 子对象里
  const d = json.data
  const audioUrl = buildCoverUrl(getField(d, NETEASE_DETAIL_MAP.audioUrl) || '')
  const cover = buildCoverUrl(getField(d, NETEASE_DETAIL_MAP.cover) || track.cover || '')
  const quality = resolveQuality(getField(d, NETEASE_DETAIL_MAP.quality!), getField(d, NETEASE_DETAIL_MAP.kbps!))
  // interval 为秒数字符串，转为数字作为 duration
  const rawInterval = d.interval ? Number(d.interval) : 0
  const duration = rawInterval > 0 && isFinite(rawInterval) ? Math.round(rawInterval) : track.duration

  return {
    ...track,
    title: d.song || track.title,
    artist: d.singer || track.artist,
    album: d.album || track.album,
    cover,
    audioUrl,
    qualityLabel: quality,
    duration,
    detailsLoaded: true,
    lyricFetched: true
  }
}
