import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const APP_CONFIG_KEY = 'xf-app-config-v1'

export const DEFAULT_HOME_QUERY_KEYWORD = '抖音热歌'
export const DEFAULT_PLAY_QUERY_KEYWORD = '抖音热歌'

interface AppConfigSnapshot {
  homeQueryKeyword: string
  homeQueryLimit: number
  playQueryKeyword: string
  playQueryLimit: number
  prefetchCount: number
  colorPrefetchCount: number
  keepTabbarDominantColor: boolean
  /** 会话有效期（分钟），超过后重新拉取歌曲详情 */
  sessionTTLMinutes: number
}

function normalizeKeyword(value: unknown, fallback: string) {
  const keyword = String(value ?? '').trim()
  return keyword || fallback
}

function normalizeCount(value: unknown, fallback: number, min: number, max: number) {
  const count = Number(value)
  if (!Number.isFinite(count)) return fallback
  return Math.min(max, Math.max(min, Math.round(count)))
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true'
  return fallback
}

export const useAppConfigStore = defineStore('app-config', () => {
  const homeQueryKeyword = ref(DEFAULT_HOME_QUERY_KEYWORD)
  const homeQueryLimit = ref(12)
  const playQueryKeyword = ref(DEFAULT_PLAY_QUERY_KEYWORD)
  const playQueryLimit = ref(12)
  const prefetchCount = ref(4)
  const colorPrefetchCount = ref(6)
  const keepTabbarDominantColor = ref(false)
  /** 会话有效期（分钟），默认 60 分钟 */
  const sessionTTLMinutes = ref(60)

  function applySnapshot(snapshot?: Partial<AppConfigSnapshot>) {
    homeQueryKeyword.value = normalizeKeyword(snapshot?.homeQueryKeyword, DEFAULT_HOME_QUERY_KEYWORD)
    homeQueryLimit.value = normalizeCount(snapshot?.homeQueryLimit, 12, 4, 40)
    playQueryKeyword.value = normalizeKeyword(snapshot?.playQueryKeyword, DEFAULT_PLAY_QUERY_KEYWORD)
    playQueryLimit.value = normalizeCount(snapshot?.playQueryLimit, 12, 4, 40)
    prefetchCount.value = normalizeCount(snapshot?.prefetchCount, 4, 0, 12)
    colorPrefetchCount.value = normalizeCount(snapshot?.colorPrefetchCount, 6, 0, 16)
    keepTabbarDominantColor.value = normalizeBoolean(snapshot?.keepTabbarDominantColor, false)
    sessionTTLMinutes.value = normalizeCount(snapshot?.sessionTTLMinutes, 60, 5, 1440)
  }

  function load() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(APP_CONFIG_KEY)
      if (!raw) return
      applySnapshot(JSON.parse(raw) as Partial<AppConfigSnapshot>)
    } catch {
      applySnapshot()
    }
  }

  function save() {
    if (typeof window === 'undefined') return
    const snapshot: AppConfigSnapshot = {
      homeQueryKeyword: homeQueryKeyword.value,
      homeQueryLimit: homeQueryLimit.value,
      playQueryKeyword: playQueryKeyword.value,
      playQueryLimit: playQueryLimit.value,
      prefetchCount: prefetchCount.value,
      colorPrefetchCount: colorPrefetchCount.value,
      keepTabbarDominantColor: keepTabbarDominantColor.value,
      sessionTTLMinutes: sessionTTLMinutes.value
    }
    window.localStorage.setItem(APP_CONFIG_KEY, JSON.stringify(snapshot))
  }

  function patchConfig(snapshot: Partial<AppConfigSnapshot>) {
    applySnapshot({
      homeQueryKeyword: snapshot.homeQueryKeyword ?? homeQueryKeyword.value,
      homeQueryLimit: snapshot.homeQueryLimit ?? homeQueryLimit.value,
      playQueryKeyword: snapshot.playQueryKeyword ?? playQueryKeyword.value,
      playQueryLimit: snapshot.playQueryLimit ?? playQueryLimit.value,
      prefetchCount: snapshot.prefetchCount ?? prefetchCount.value,
      colorPrefetchCount: snapshot.colorPrefetchCount ?? colorPrefetchCount.value,
      keepTabbarDominantColor: snapshot.keepTabbarDominantColor ?? keepTabbarDominantColor.value,
      sessionTTLMinutes: snapshot.sessionTTLMinutes ?? sessionTTLMinutes.value
    })
  }

  load()

  watch(
    [
      homeQueryKeyword,
      homeQueryLimit,
      playQueryKeyword,
      playQueryLimit,
      prefetchCount,
      colorPrefetchCount,
      keepTabbarDominantColor,
      sessionTTLMinutes
    ],
    () => {
      save()
    }
  )

  return {
    homeQueryKeyword,
    homeQueryLimit,
    playQueryKeyword,
    playQueryLimit,
    prefetchCount,
    colorPrefetchCount,
    keepTabbarDominantColor,
    sessionTTLMinutes,
    patchConfig
  }
})
