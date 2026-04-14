// src/types/music.ts

export type MusicSource = 'migu' | 'netease' | 'qq' | 'kuwo'

export interface Track {
  uid: string
  source: MusicSource
  title: string
  artist: string
  album?: string
  cover?: string
  audioUrl?: string
  lrc?: string
  duration?: number
  qualityLabel?: string
  // 平台懒加载所需原始字段
  displayIndex?: number
  keyword?: string
  songId?: string
  pageUrl?: string
  quality?: string
  qqSearchKey?: string
  qqId?: string
  songMid?: string
  qqQualityText?: string
  pay?: string
  detailsLoaded?: boolean
  lyricFetched?: boolean
  /** 音频加载失败后标记已重试，防止死循环 */
  _retried?: boolean
  /** 音频链接获取时间戳，用于判断链接是否过期 */
  urlFetchedAt?: number
}

export interface LyricLine {
  time: number // 秒
  text: string
}

export interface Playlist {
  id: string
  name: string
  createdAt: number
  trackUids: string[]
}

export type PlayMode = 'list' | 'single' | 'shuffle'

export type PlayContextType = 'results' | 'favorites' | 'playlist' | 'home' | 'history'

export interface PlayContext {
  type: PlayContextType
  playlistId?: string
}

export interface SearchOptions {
  keyword: string
  page?: number
  limit?: number
}

// 平台是否可用（根据环境变量动态计算）
export interface SourceConfig {
  id: MusicSource
  label: string
  color: string
  enabled: boolean // 有对应 env 配置时才为 true
}
