// src/stores/playlist.ts
import { defineStore } from 'pinia'
import { ref, toRaw } from 'vue'
import type { Track, Playlist } from '@/types/music'
import { nanoid } from '@/utils/format'
import {
  dbGetAllFavorites,
  dbPutFavorite,
  dbDeleteFavorite,
  dbGetAllPlaylists,
  dbPutPlaylist,
  dbDeletePlaylist,
  dbGetHistory,
  dbPushHistory,
  dbClearHistory
} from '@/utils/db'
import { fetchTrackDetails } from '@/api'
import { usePlayerStore } from '@/stores/player'

/** 音频链接有效期（2 小时） */
const URL_TTL = 2 * 60 * 60 * 1000

export const usePlaylistStore = defineStore('playlist', () => {
  const favorites = ref<Track[]>([])
  const playlists = ref<Playlist[]>([])
  const history = ref<Track[]>([])
  const trackCache = ref(new Map<string, Track>())
  const initialized = ref(false)

  async function init() {
    if (initialized.value) return
    const [favs, lists, hist] = await Promise.all([dbGetAllFavorites(), dbGetAllPlaylists(), dbGetHistory()])
    favorites.value = favs
    playlists.value = lists
    history.value = hist
    ;[...favs, ...hist].forEach((t) => trackCache.value.set(t.uid, t))
    initialized.value = true

    // 注册历史记录回调到 player store（解耦循环依赖）
    const playerStore = usePlayerStore()
    playerStore.registerHistoryCallback(async (track: Track) => {
      // 更新内存中的 history 列表
      history.value = [{ ...track }, ...history.value.filter((t) => t.uid !== track.uid)].slice(0, 50)
      trackCache.value.set(track.uid, track)
      // 持久化
      await dbPushHistory(track)
    })

    // 注册详情同步回调（播放时加载完详情后同步 duration 等字段到收藏/歌单）
    playerStore.registerSyncTrackCallback((track: Track) => {
      syncTrack(track)
    })
  }

  // ── 收藏 ────────────────────────────────────────────────────────────────
  function isFavorited(uid: string): boolean {
    return favorites.value.some((t) => t.uid === uid)
  }

  async function toggleFavorite(track: Track) {
    if (isFavorited(track.uid)) {
      favorites.value = favorites.value.filter((t) => t.uid !== track.uid)
      await dbDeleteFavorite(track.uid)
    } else {
      // 尽量使用带完整信息的版本
      const full = trackCache.value.get(track.uid) ?? track
      favorites.value.unshift(full)
      await dbPutFavorite({ ...toRaw(full) })
    }
  }

  // ── 歌单 ────────────────────────────────────────────────────────────────
  async function createPlaylist(name: string): Promise<Playlist> {
    const pl: Playlist = {
      id: nanoid('pl-'),
      name,
      createdAt: Date.now(),
      trackUids: []
    }
    playlists.value.push(pl)
    await dbPutPlaylist(pl)
    return pl
  }

  async function renamePlaylist(id: string, name: string) {
    const pl = playlists.value.find((p) => p.id === id)
    if (!pl) return
    pl.name = name
    await dbPutPlaylist({ ...pl })
  }

  async function deletePlaylist(id: string) {
    playlists.value = playlists.value.filter((p) => p.id !== id)
    await dbDeletePlaylist(id)
  }

  async function addToPlaylist(playlistId: string, track: Track) {
    const pl = playlists.value.find((p) => p.id === playlistId)
    if (!pl || pl.trackUids.includes(track.uid)) return
    pl.trackUids.push(track.uid)
    trackCache.value.set(track.uid, track)
    await dbPutPlaylist({ ...pl })
  }

  async function removeFromPlaylist(playlistId: string, uid: string) {
    const pl = playlists.value.find((p) => p.id === playlistId)
    if (!pl) return
    pl.trackUids = pl.trackUids.filter((u) => u !== uid)
    await dbPutPlaylist({ ...pl })
  }

  function getPlaylistTracks(playlistId: string): Track[] {
    const pl = playlists.value.find((p) => p.id === playlistId)
    if (!pl) return []
    return pl.trackUids.map((uid) => trackCache.value.get(uid)).filter((t): t is Track => !!t)
  }

  // ── 历史 ────────────────────────────────────────────────────────────────
  async function clearHistory() {
    history.value = []
    await dbClearHistory()
  }

  // 同步 trackCache（播放详情加载后调用）
  function syncTrack(track: Track) {
    trackCache.value.set(track.uid, track)
    const fi = favorites.value.findIndex((t) => t.uid === track.uid)
    if (fi !== -1) {
      favorites.value[fi] = track
      // 持久化更新后的收藏数据（含 duration 等完整字段）
      dbPutFavorite({ ...toRaw(track) }).catch(() => {})
    }
  }

  // ── 链接过期刷新 ──────────────────────────────────────────────────────────
  function isUrlExpired(track: Track): boolean {
    if (!track.audioUrl) return true
    if (!track.urlFetchedAt) return true
    return Date.now() - track.urlFetchedAt > URL_TTL
  }

  /**
   * 批量刷新过期音频链接，更新内存和持久化存储
   * @param source 指定数据来源（收藏 / 歌单 / 历史），用于更新对应列表
   */
  async function refreshExpiredTracks(source: 'favorites' | 'history' | 'playlist', playlistId?: string) {
    let tracksToCheck: Track[]
    if (source === 'favorites') {
      tracksToCheck = favorites.value
    } else if (source === 'history') {
      tracksToCheck = history.value
    } else if (playlistId) {
      tracksToCheck = getPlaylistTracks(playlistId)
    } else {
      return
    }

    const expired = tracksToCheck.filter((t) => t.detailsLoaded && isUrlExpired(t))
    if (!expired.length) return

    // 并发刷新（最多 5 个并发）
    const CONCURRENCY = 5
    for (let i = 0; i < expired.length; i += CONCURRENCY) {
      const batch = expired.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(async (t) => {
          const fresh = await fetchTrackDetails(t)
          return fresh
        })
      )

      for (const result of results) {
        if (result.status !== 'fulfilled') continue
        const fresh = result.value
        // 更新内存缓存
        trackCache.value.set(fresh.uid, fresh)
        // 更新对应列表中的引用
        if (source === 'favorites') {
          const idx = favorites.value.findIndex((t) => t.uid === fresh.uid)
          if (idx !== -1) {
            favorites.value[idx] = fresh
            dbPutFavorite({ ...toRaw(fresh) }).catch(() => {})
          }
        } else if (source === 'history') {
          const idx = history.value.findIndex((t) => t.uid === fresh.uid)
          if (idx !== -1) history.value[idx] = fresh
        }
      }
    }
  }

  return {
    favorites,
    playlists,
    history,
    initialized,
    init,
    isFavorited,
    toggleFavorite,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    getPlaylistTracks,
    clearHistory,
    syncTrack,
    refreshExpiredTracks
  }
})
