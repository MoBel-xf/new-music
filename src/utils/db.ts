// src/utils/db.ts
import { openDB, type IDBPDatabase } from 'idb'
import type { Track, Playlist } from '@/types/music'

const DB_NAME = 'pikachu-music'
const DB_VERSION = 2
const TRACK_CACHE_LIMIT = 500
const HOME_RECOMMEND_KEY = 'home-recommend'

function buildHomeRecommendKey(cacheKey = 'default') {
  return `${HOME_RECOMMEND_KEY}:${cacheKey}`
}

// ── IDB Schema 类型 ────────────────────────────────────────────────────────
interface PikachuDBSchema {
  favorites: {
    key: string
    value: Track
  }
  history: {
    key: string
    value: Track & { historyAt: number }
    indexes: { historyAt: number }
  }
  playlists: {
    key: string
    value: Playlist
  }
  track_cache: {
    key: string
    value: Track & { cachedAt: number }
    indexes: { cachedAt: number }
  }
  home_recommend: {
    key: string
    value: { id: string; tracks: Track[]; updatedAt: number }
  }
}

// 使用 any 绕过 idb 复杂泛型，实际运行时类型安全由操作函数保证
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: IDBPDatabase<any> | null = null

async function getDB(): Promise<IDBPDatabase<any>> {
  if (_db) return _db
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'uid' })
      }
      if (!db.objectStoreNames.contains('history')) {
        const s = db.createObjectStore('history', { keyPath: 'uid' })
        s.createIndex('historyAt', 'historyAt')
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('track_cache')) {
        const s = db.createObjectStore('track_cache', { keyPath: 'uid' })
        s.createIndex('cachedAt', 'cachedAt')
      }
      if (!db.objectStoreNames.contains('home_recommend')) {
        db.createObjectStore('home_recommend', { keyPath: 'id' })
      }
    }
  })
  return _db
}

// ── 收藏 ──────────────────────────────────────────────────────────────────
export async function dbGetAllFavorites(): Promise<Track[]> {
  const db = await getDB()
  return db.getAll('favorites')
}

export async function dbPutFavorite(track: Track): Promise<void> {
  const db = await getDB()
  await db.put('favorites', track)
}

export async function dbDeleteFavorite(uid: string): Promise<void> {
  const db = await getDB()
  await db.delete('favorites', uid)
}

// ── 历史 ──────────────────────────────────────────────────────────────────
export async function dbGetHistory(): Promise<Track[]> {
  const db = await getDB()
  // 按 historyAt 倒序取最近 50 条
  const all: (Track & { historyAt: number })[] = await db.getAllFromIndex('history', 'historyAt')
  return all
    .sort((a, b) => b.historyAt - a.historyAt)
    .slice(0, 50)
    .map(({ historyAt: _, ...track }) => track as Track)
}

export async function dbPushHistory(track: Track): Promise<void> {
  const db = await getDB()
  await db.put('history', { ...track, historyAt: Date.now() })
  // 超出 200 条时清理最旧的
  const all: { historyAt: number; uid: string }[] = await db.getAllFromIndex('history', 'historyAt')
  if (all.length > 200) {
    const sorted = all.sort((a, b) => a.historyAt - b.historyAt)
    const toDelete = sorted.slice(0, sorted.length - 200)
    const tx = db.transaction('history', 'readwrite')
    await Promise.all(toDelete.map((t) => tx.store.delete(t.uid)))
    await tx.done
  }
}

export async function dbClearHistory(): Promise<void> {
  const db = await getDB()
  await db.clear('history')
}

// ── 歌单 ──────────────────────────────────────────────────────────────────
export async function dbGetAllPlaylists(): Promise<Playlist[]> {
  const db = await getDB()
  return db.getAll('playlists')
}

export async function dbPutPlaylist(playlist: Playlist): Promise<void> {
  const db = await getDB()
  await db.put('playlists', playlist)
}

export async function dbDeletePlaylist(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('playlists', id)
}

// ── 曲目详情缓存（LRU 500 条）──────────────────────────────────────────────
const TRACK_CACHE_TTL = 2 * 60 * 60 * 1000 // 音频链接 2 小时过期

export async function dbGetCachedTrack(uid: string): Promise<Track | null> {
  try {
    const db = await getDB()
    const item: (Track & { cachedAt: number }) | undefined = await db.get('track_cache', uid)
    if (!item) return null
    // 超过过期时间则视为缓存失效
    if (Date.now() - item.cachedAt > TRACK_CACHE_TTL) {
      db.delete('track_cache', uid)
      return null
    }
    // 更新访问时间（LRU touch）
    db.put('track_cache', { ...item, cachedAt: Date.now() })
    const { cachedAt: _, ...track } = item
    return track as Track
  } catch {
    return null
  }
}

export async function dbDeleteCachedTrack(uid: string): Promise<void> {
  try {
    const db = await getDB()
    await db.delete('track_cache', uid)
  } catch {
    /* noop */
  }
}

export async function dbSetCachedTrack(track: Track): Promise<void> {
  try {
    const db = await getDB()
    await db.put('track_cache', { ...track, cachedAt: Date.now() })
    // 超出限制则删最旧
    const all: { cachedAt: number; uid: string }[] = await db.getAllFromIndex('track_cache', 'cachedAt')
    if (all.length > TRACK_CACHE_LIMIT) {
      const toDelete = all.sort((a, b) => a.cachedAt - b.cachedAt).slice(0, all.length - TRACK_CACHE_LIMIT)
      const tx = db.transaction('track_cache', 'readwrite')
      await Promise.all(toDelete.map((t) => tx.store.delete(t.uid)))
      await tx.done
    }
  } catch {
    /* noop */
  }
}

// ── 首页推荐缓存 ───────────────────────────────────────────────────────────
export async function dbGetHomeRecommend(cacheKey?: string): Promise<Track[] | null> {
  try {
    const db = await getDB()
    const item: { id: string; tracks: Track[]; updatedAt: number } | undefined = await db.get('home_recommend', buildHomeRecommendKey(cacheKey))
    if (!item || !Array.isArray(item.tracks) || !item.tracks.length) return null
    return item.tracks
  } catch {
    return null
  }
}

export async function dbSetHomeRecommend(tracks: Track[], cacheKey?: string): Promise<void> {
  try {
    const db = await getDB()
    await db.put('home_recommend', {
      id: buildHomeRecommendKey(cacheKey),
      tracks,
      updatedAt: Date.now()
    })
  } catch {
    // 忽略缓存失败
  }
}

// ── 缓存管理 ────────────────────────────────────────────────────────────────
export interface CacheStats {
  history: number
  trackCache: number
  homeRecommend: number
  favorites: number
  playlists: number
  searchHistory: number
}

export async function dbGetCacheStats(): Promise<CacheStats> {
  const db = await getDB()
  const [history, trackCache, homeRecommend, favorites, playlists] = await Promise.all([
    db.count('history'),
    db.count('track_cache'),
    db.count('home_recommend'),
    db.count('favorites'),
    db.count('playlists')
  ])
  const searchHistory = JSON.parse(localStorage.getItem('pikachu-search-history') || '[]').length
  return { history, trackCache, homeRecommend, favorites, playlists, searchHistory }
}

export async function dbClearTrackCache(): Promise<void> {
  const db = await getDB()
  await db.clear('track_cache')
}

export async function dbClearHomeRecommend(): Promise<void> {
  const db = await getDB()
  await db.clear('home_recommend')
}

export async function dbClearAllCache(): Promise<void> {
  const db = await getDB()
  await Promise.all([db.clear('history'), db.clear('track_cache'), db.clear('home_recommend')])
  localStorage.removeItem('pikachu-search-history')
}
