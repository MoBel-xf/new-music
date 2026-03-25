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
import { usePlayerStore } from '@/stores/player'

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
    if (fi !== -1) favorites.value[fi] = track
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
    syncTrack
  }
})
