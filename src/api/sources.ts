// src/api/sources.ts
// 根据环境变量动态决定哪些平台可用

import type { SourceConfig, MusicSource } from '@/types/music'

export const SOURCE_CONFIGS: SourceConfig[] = [
  {
    id: 'migu',
    label: '咪咕',
    color: '#FF9040',
    enabled: !!import.meta.env.VITE_MIGU_API_BASE
  },
  {
    id: 'netease',
    label: '网易云',
    color: '#FF3B30',
    enabled: !!import.meta.env.VITE_NETEASE_API_BASE
  },
  {
    id: 'qq',
    label: 'QQ音乐',
    color: '#1BACED',
    enabled: !!import.meta.env.VITE_QQ_API_BASE
  },
  {
    id: 'kuwo',
    label: '酷我',
    color: '#A259FF',
    enabled: !!import.meta.env.VITE_KUWO_API_BASE
  }
]

/** 当前环境下可用的平台 ID 列表 */
export const AVAILABLE_SOURCES: MusicSource[] = SOURCE_CONFIGS.filter((s) => s.enabled).map((s) => s.id)

export function getSourceConfig(id: MusicSource): SourceConfig {
  return SOURCE_CONFIGS.find((s) => s.id === id)!
}
