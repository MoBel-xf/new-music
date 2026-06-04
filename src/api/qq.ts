// src/api/qq.ts
// 使用 tang QQ 音乐接口：
// 搜索：GET BASE?msg=关键词&type=json
// 详情：GET BASE?msg=关键词&type=json&mid=song_mid
import request from '@/utils/request'
import type { Track, SearchOptions } from '@/types/music'
import { buildCoverUrl, inferQualityLabel } from '@/utils/format'

const BASE = import.meta.env.VITE_QQ_API_BASE || ''

interface QQSearchItem {
  song_mid?: string
  song_title?: string
  singer_name?: string
  pay?: string
}

interface QQDetailResp {
  song_mid?: string
  song_title?: string
  song_name?: string
  singer_name?: string
  album_name?: string
  album_title?: string
  album_pic?: string
  singer_pic?: string
  song_h5_url?: string
  song_lyric?: string
  lyric?: string
  vip?: string | number
  kbps_sq?: string
  kbps_pq?: string
  kbps_accom?: string
  kbps_hq?: string
  kbps_standard?: string
  kbps_fq?: string
  song_play_url_sq?: string
  song_play_url_pq?: string
  song_play_url_accom?: string
  song_play_url_hq?: string
  song_play_url_standard?: string
  song_play_url_fq?: string
  song_play_url?: string
}

function pickBestPlayUrl(d: QQDetailResp): { url: string; tag: string; label: string; text: string } {
  if (d.song_play_url_sq) return { url: d.song_play_url_sq, tag: 'lossless', label: 'LOSSLESS', text: `SQ ${d.kbps_sq || ''}`.trim() }
  if (d.song_play_url_pq) return { url: d.song_play_url_pq, tag: 'lossless', label: 'LOSSLESS', text: `PQ ${d.kbps_pq || ''}`.trim() }
  if (d.song_play_url_accom) return { url: d.song_play_url_accom, tag: 'hq', label: 'HQ', text: `ACCOM ${d.kbps_accom || ''}`.trim() }
  if (d.song_play_url_hq) return { url: d.song_play_url_hq, tag: 'hq', label: 'HQ', text: `HQ ${d.kbps_hq || ''}`.trim() }
  if (d.song_play_url_standard) return { url: d.song_play_url_standard, tag: 'standard', label: 'STD', text: `STD ${d.kbps_standard || ''}`.trim() }
  if (d.song_play_url_fq) return { url: d.song_play_url_fq, tag: 'low', label: 'LOW', text: `FQ ${d.kbps_fq || ''}`.trim() }
  if (d.song_play_url) return { url: d.song_play_url, tag: '', label: '', text: '' }
  return { url: '', tag: '', label: '', text: '' }
}

export async function searchSongs(opts: SearchOptions): Promise<Track[]> {
  if (!BASE) return []
  const { keyword, limit = 12 } = opts

  const json = await request.safeGet<QQSearchItem[] | { data?: QQSearchItem[] }>(BASE, {
    params: { msg: keyword, type: 'json' },
    cancelKey: `qq-search-${keyword}`
  })

  const rawList = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []
  if (!rawList.length) return []

  return rawList
    .slice(0, limit || rawList.length)
    .map((it, idx): Track => {
      const mid = (it.song_mid || '').trim()
      const indexInList = idx + 1
      return {
        uid: `qq-${mid || indexInList}-${keyword}`,
        source: 'qq',
        title: it.song_title || 'Unknown',
        artist: it.singer_name || '',
        album: '',
        cover: '',
        audioUrl: '',
        lrc: '',
        displayIndex: indexInList,
        keyword,
        qqSearchKey: keyword,
        qqId: mid,
        songMid: mid,
        songId: mid,
        pay: it.pay || '',
        qqQualityText: it.pay || '',
        detailsLoaded: false
      }
    })
    .filter((t) => !!t.songId)
}

export async function fetchDetails(track: Track): Promise<Track> {
  if (!BASE) return track

  const msg = (track.qqSearchKey || track.keyword || '').trim() || `${track.title || ''} ${track.artist || ''}`.trim()
  const mid = (track.qqId || track.songMid || track.songId || '').trim()
  if (!mid) return track

  const d = await request.safeGet<QQDetailResp>(BASE, {
    params: { msg, type: 'json', mid },
    cancelKey: `qq-detail-${track.uid}`
  })
  if (!d || typeof d !== 'object' || !d.song_mid) return track

  const best = pickBestPlayUrl(d)
  const audioUrl = buildCoverUrl(best.url || track.audioUrl || '')
  const qualityLabel = best.label || inferQualityLabel(audioUrl)

  return {
    ...track,
    title: d.song_title || d.song_name || track.title,
    artist: d.singer_name || track.artist,
    album: d.album_name || d.album_title || track.album,
    cover: buildCoverUrl(d.album_pic || d.singer_pic || track.cover || ''),
    pageUrl: d.song_h5_url || track.pageUrl,
    audioUrl,
    lrc: d.song_lyric || d.lyric || track.lrc,
    qqQualityText: best.text || (d.vip ? `VIP:${d.vip}` : '') || track.qqQualityText,
    quality: best.tag || track.quality,
    qualityLabel,
    detailsLoaded: !!audioUrl,
    lyricFetched: true
  }
}
