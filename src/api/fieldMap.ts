/**
 * src/api/fieldMap.ts
 *
 * 各平台接口字段映射配置。
 * 接口字段变动时只需修改这里，不用动任何业务逻辑。
 *
 * 每个平台分两块：
 *   searchMap  —— 搜索列表接口的原始字段 → Track 字段
 *   detailMap  —— 详情接口的原始字段    → Track 字段
 *
 * 特殊逻辑（数组拼接、封面拼接、音质识别等）保留在各平台模块中处理，
 * 这里只描述「哪个原始 key 对应哪个 Track 字段」。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 通用类型
// ─────────────────────────────────────────────────────────────────────────────

/** 搜索列表字段映射 */
export interface SearchFieldMap {
  /** 歌曲唯一 ID（用于详情请求） */
  id: string
  /** 歌名 */
  title: string
  /** 歌手（字符串；数组情况在平台模块里单独处理） */
  artist: string
  /** 专辑名 */
  album: string
  /** 封面 URL（直接可用；需要拼接的在平台模块里处理） */
  cover: string
  /** 音质描述字符串（可选） */
  quality?: string
}

/** 详情接口字段映射 */
export interface DetailFieldMap {
  /** 音频直链 */
  audioUrl: string
  /** 封面 URL */
  cover: string
  /** 歌词文本（已解析好的 LRC；与 lrcUrl 二选一） */
  lrc?: string
  /** 歌词文件 URL（需下载；与 lrc 二选一） */
  lrcUrl?: string
  /** 音质描述字符串（可选） */
  quality?: string
  /** 码率字符串，如 "320kbps"（可选，辅助判断音质） */
  kbps?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 咪咕  xcvts.cn/api/music/migu
// ─────────────────────────────────────────────────────────────────────────────
export const MIGU_SEARCH_MAP: SearchFieldMap = {
  id:      'n',        // 第几条（用作 displayIndex，不作 songId）
  title:   'title',
  artist:  'singer',
  album:   '',         // 搜索列表无专辑字段
  cover:   '',         // 搜索列表无封面，详情才有
  quality: '',
}

export const MIGU_DETAIL_MAP: DetailFieldMap = {
  audioUrl: 'music_url',
  cover:    'cover',
  lrc:      '',
  lrcUrl:   'lrc_url',
  quality:  '',
}

// ─────────────────────────────────────────────────────────────────────────────
// 网易云  api.vkeys.cn/v2/music/netease
// 真实字段来源（已验证）：
//   搜索: { id, song, singer, album, cover, quality, time }
//   详情: { data: { id, song, singer, album, cover, url, quality, kbps, interval, size, link } }
// ─────────────────────────────────────────────────────────────────────────────
export const NETEASE_SEARCH_MAP: SearchFieldMap = {
  id:      'id',
  title:   'song',      // ← 不是 name/title
  artist:  'singer',    // ← 不是 ar[].name
  album:   'album',
  cover:   'cover',     // ← 直接字段，不是 al.picUrl
  quality: 'quality',
}

export const NETEASE_DETAIL_MAP: DetailFieldMap = {
  audioUrl: 'url',      // ← 在 data 子对象里
  cover:    'cover',
  lrc:      '',         // 此接口无 lrc 字段，有需要可走 lrcUrl
  lrcUrl:   '',
  quality:  'quality',
  kbps:     'kbps',     // e.g. "128kbps"，辅助音质判断
}

// ─────────────────────────────────────────────────────────────────────────────
// QQ音乐（可选，需配置 VITE_QQ_API_BASE + VITE_QQ_API_KEY）
// 字段为 yaohud.cn 风格（接入后按真实响应调整）
// ─────────────────────────────────────────────────────────────────────────────
export const QQ_SEARCH_MAP: SearchFieldMap = {
  id:      'mid',        // 或 id，优先 mid
  title:   'name',       // 或 title
  artist:  'singer',     // 数组时在模块里 join
  album:   'album.name',
  cover:   '',           // 需用 album.mid 拼接 CDN URL
  quality: '',
}

export const QQ_DETAIL_MAP: DetailFieldMap = {
  audioUrl: 'data',      // URL 接口返回 { data: "https://..." }
  cover:    '',          // 单独请求封面接口
  lrc:      'data',      // LRC 接口返回 { data: "[00:00]..." }
  lrcUrl:   '',
  quality:  '',
}

// ─────────────────────────────────────────────────────────────────────────────
// 酷我（可选，需配置 VITE_KUWO_API_BASE）
// 字段为占位，接入后按真实响应调整
// ─────────────────────────────────────────────────────────────────────────────
export const KUWO_SEARCH_MAP: SearchFieldMap = {
  id:      'rid',        // 或 id
  title:   'name',       // 或 title
  artist:  'artist',     // 或 singer
  album:   'album',
  cover:   'pic',        // 或 cover
  quality: '',
}

export const KUWO_DETAIL_MAP: DetailFieldMap = {
  audioUrl: 'url',       // 或 music_url
  cover:    'pic',       // 或 cover
  lrc:      'lrc',       // 已解析的 LRC 文本
  lrcUrl:   'lrc_url',
  quality:  '',
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数：安全地从嵌套对象取值（支持 "a.b.c" 路径）
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getField(obj: Record<string, any>, path: string): any {
  if (!path) return undefined
  return path.split('.').reduce((cur, key) => cur?.[key], obj)
}
