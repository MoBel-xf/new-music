// src/api/kuwo.ts
// 使用 kw-api.cenguigui.cn 接口：
// 搜索：GET BASE?name=关键词&page=页码&limit=数量
// 详情：GET BASE?id=歌曲ID&type=song&level=zp&format=json
import request from '@/utils/request'
import type { Track, SearchOptions } from '@/types/music'
import { buildCoverUrl, inferQualityLabel } from '@/utils/format'

const BASE = import.meta.env.VITE_KUWO_API_BASE || ''

interface KuwoSong {
  rid?: string | number
  name?: string
  artist?: string
  album?: string
  pic?: string
}

interface KuwoSearchResp {
  code: number
  data?: KuwoSong[]
}

interface KuwoDetailData {
  name?: string
  artist?: string
  album?: string
  pic?: string
  url?: string
  lyric?: string
}

interface KuwoDetailResp {
  code: number
  data?: KuwoDetailData
}

export async function searchSongs(opts: SearchOptions): Promise<Track[]> {
  if (!BASE) return []
  const { keyword, page = 1, limit = 12 } = opts

  const json = await request.safeGet<KuwoSearchResp>(BASE, {
    params: { name: keyword, page, limit },
    cancelKey: `kuwo-search-${keyword}-${page}`
  })
  if (!json || json.code !== 200 || !Array.isArray(json.data)) return []

  return json.data
    .map((it, idx): Track => {
      const songId = String(it.rid || '').trim()
      return {
        uid: `kuwo-${songId || idx + 1}-${keyword}`,
        source: 'kuwo',
        title: it.name || 'Unknown',
        artist: it.artist || '',
        album: it.album || '',
        cover: buildCoverUrl(it.pic || ''),
        audioUrl: '',
        lrc: '',
        songId,
        displayIndex: idx + 1,
        keyword,
        detailsLoaded: false
      }
    })
    .filter((t) => !!t.songId)
}

export async function fetchDetails(track: Track): Promise<Track> {
  if (!BASE || !track.songId) return track

  const json = await request.safeGet<KuwoDetailResp>(BASE, {
    params: { id: track.songId, type: 'song', level: 'zp', format: 'json' },
    cancelKey: `kuwo-detail-${track.uid}`
  })
  if (!json || json.code !== 200 || !json.data) return track

  const d = json.data
  const audioUrl = buildCoverUrl(d.url || track.audioUrl || '')

  return {
    ...track,
    title: d.name || track.title,
    artist: d.artist || track.artist,
    album: d.album || track.album,
    cover: buildCoverUrl(d.pic || track.cover || ''),
    audioUrl,
    lrc: d.lyric || track.lrc,
    qualityLabel: inferQualityLabel(audioUrl),
    detailsLoaded: true,
    lyricFetched: true
  }
}
