// src/api/migu.ts
// 字段映射见 fieldMap.ts → MIGU_SEARCH_MAP / MIGU_DETAIL_MAP
import request from '@/utils/request'
import type { Track, SearchOptions } from '@/types/music'
import { fetchLyricText } from '@/utils/lrcFetch'
import { buildCoverUrl, inferQualityLabel } from '@/utils/format'
import { MIGU_SEARCH_MAP, MIGU_DETAIL_MAP, getField } from './fieldMap'

const BASE = import.meta.env.VITE_MIGU_API_BASE || '/api/migu'
console.log(BASE, 'BASE')

// ── 搜索响应原始类型 ──────────────────────────────────────────────────────────
interface MiguSearchItem {
  n: number // MIGU_SEARCH_MAP.id
  title: string // MIGU_SEARCH_MAP.title
  singer: string // MIGU_SEARCH_MAP.artist
}
interface MiguSearchResp {
  code: number
  data: MiguSearchItem[]
}

// ── 详情响应原始类型 ──────────────────────────────────────────────────────────
interface MiguDetailResp {
  code: number
  music_url?: string // MIGU_DETAIL_MAP.audioUrl
  cover?: string // MIGU_DETAIL_MAP.cover
  lrc_url?: string // MIGU_DETAIL_MAP.lrcUrl
}

export async function searchSongs(opts: SearchOptions): Promise<Track[]> {
  const { keyword, limit = 12 } = opts
  const json = await request.safeGet<MiguSearchResp>(BASE, {
    params: { gm: keyword, n: '', num: limit, type: 'json' },
    cancelKey: `migu-search-${keyword}`
  })
  const list = json?.data ?? []

  return list.map((it): Track => {
    const n = Number(getField(it, MIGU_SEARCH_MAP.id) || 1)
    return {
      uid: `migu-${keyword}-${n}-${it.title}-${it.singer}`,
      source: 'migu',
      title: getField(it, MIGU_SEARCH_MAP.title) || 'Unknown',
      artist: getField(it, MIGU_SEARCH_MAP.artist) || '',
      album: '', // 咪咕搜索列表无专辑
      cover: '', // 咪咕搜索列表无封面
      displayIndex: n,
      keyword,
      detailsLoaded: false
    }
  })
}

export async function fetchDetails(track: Track): Promise<Track> {
  const json = await request.safeGet<MiguDetailResp>(BASE, {
    params: {
      gm: track.keyword || track.title,
      n: track.displayIndex || 1,
      num: 20,
      type: 'json'
    },
    cancelKey: `migu-detail-${track.uid}`
  })
  if (!json || json.code !== 200) return track

  const audioUrl = getField(json, MIGU_DETAIL_MAP.audioUrl) || track.audioUrl || ''
  const coverRaw = getField(json, MIGU_DETAIL_MAP.cover) || track.cover || ''
  const lrcUrl = getField(json, MIGU_DETAIL_MAP.lrcUrl!)
  const lyricText = lrcUrl ? await fetchLyricText(lrcUrl).catch(() => '') : ''

  const updated: Track = {
    ...track,
    cover: buildCoverUrl(coverRaw),
    audioUrl: buildCoverUrl(audioUrl), // http → https
    qualityLabel: inferQualityLabel(audioUrl),
    detailsLoaded: true,
    lrc: lyricText,
    lyricFetched: Boolean(lyricText) || !lrcUrl
  }
  return updated
}
