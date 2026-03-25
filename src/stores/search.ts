// src/stores/search.ts
import { defineStore } from 'pinia'
import { ref, reactive, watch } from 'vue'
import type { Track, MusicSource } from '@/types/music'
import { AVAILABLE_SOURCES } from '@/api/sources'
import * as miguApi from '@/api/migu'
import * as neteaseApi from '@/api/netease'
import * as qqApi from '@/api/qq'
import * as kuwoApi from '@/api/kuwo'
import type { SearchOptions } from '@/types/music'

const SEARCH_PREFS_KEY = 'pikachu-search-prefs-v1'

interface SearchPrefs {
  enabledSources: MusicSource[]
  perSourceLimit: number
}

const apiMap: Record<MusicSource, { searchSongs: (o: SearchOptions) => Promise<Track[]> }> = {
  migu: miguApi,
  netease: neteaseApi,
  qq: qqApi,
  kuwo: kuwoApi
}

export const useSearchStore = defineStore('search', () => {
  const keyword = ref('')
  const results = ref<Track[]>([])
  const trackMap = reactive(new Map<string, Track>())

  const enabledSources = reactive<Record<MusicSource, boolean>>({
    migu: AVAILABLE_SOURCES.includes('migu'),
    netease: AVAILABLE_SOURCES.includes('netease'),
    qq: AVAILABLE_SOURCES.includes('qq'),
    kuwo: AVAILABLE_SOURCES.includes('kuwo')
  })

  // 每个平台独立维护当前页码
  const perSourcePage = reactive<Record<MusicSource, number>>({
    migu: 1,
    netease: 1,
    qq: 1,
    kuwo: 1
  })

  const perSourceLimit = ref(12)
  const isLoading = ref(false)
  const noMore = ref(false)

  function loadPrefs() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(SEARCH_PREFS_KEY)
      if (!raw) return
      const prefs = JSON.parse(raw) as Partial<SearchPrefs>

      if (typeof prefs.perSourceLimit === 'number' && prefs.perSourceLimit > 0) {
        perSourceLimit.value = prefs.perSourceLimit
      }

      if (Array.isArray(prefs.enabledSources)) {
        const enabledSet = new Set(prefs.enabledSources.filter((s): s is MusicSource => AVAILABLE_SOURCES.includes(s as MusicSource)))
        ;(Object.keys(enabledSources) as MusicSource[]).forEach((s) => {
          enabledSources[s] = enabledSet.has(s)
        })
      }

      // 至少保留一个可用平台
      if (!getEnabledSources().length && AVAILABLE_SOURCES.length) {
        enabledSources[AVAILABLE_SOURCES[0]] = true
      }
    } catch {
      // 忽略损坏缓存
    }
  }

  function savePrefs() {
    if (typeof window === 'undefined') return
    const prefs: SearchPrefs = {
      enabledSources: getEnabledSources(),
      perSourceLimit: perSourceLimit.value
    }
    window.localStorage.setItem(SEARCH_PREFS_KEY, JSON.stringify(prefs))
  }

  function getEnabledSources(): MusicSource[] {
    return (Object.keys(enabledSources) as MusicSource[]).filter((k) => enabledSources[k] && AVAILABLE_SOURCES.includes(k))
  }

  async function search(kw: string) {
    if (!kw.trim()) return
    keyword.value = kw.trim()
    results.value = []
    trackMap.clear()
    ;(Object.keys(perSourcePage) as MusicSource[]).forEach((k) => (perSourcePage[k] = 1))
    noMore.value = false
    await _doSearch()
  }

  async function loadMore() {
    if (isLoading.value || noMore.value) return
    // 每个启用平台各自翻页
    getEnabledSources().forEach((s) => {
      perSourcePage[s]++
    })
    await _doSearch()
  }

  async function _doSearch() {
    const sources = getEnabledSources()
    if (!sources.length || !keyword.value) return
    isLoading.value = true
    try {
      // 每个平台用各自的 page
      const perSourceResults = await Promise.all(
        sources.map((src) =>
          apiMap[src]
            .searchSongs({
              keyword: keyword.value,
              page: perSourcePage[src],
              limit: perSourceLimit.value
            })
            .catch(() => [] as Track[])
        )
      )

      // 交叉排列去重插入
      let added = 0
      const maxLen = Math.max(0, ...perSourceResults.map((r) => r.length))
      for (let i = 0; i < maxLen; i++) {
        for (const tracks of perSourceResults) {
          const t = tracks[i]
          if (t && !trackMap.has(t.uid)) {
            trackMap.set(t.uid, t)
            results.value.push(t)
            added++
          }
        }
      }
      if (added === 0) noMore.value = true
    } finally {
      isLoading.value = false
    }
  }

  function updateTrack(track: Track) {
    trackMap.set(track.uid, track)
    const idx = results.value.findIndex((t) => t.uid === track.uid)
    if (idx !== -1) results.value[idx] = track
  }

  function reset() {
    keyword.value = ''
    results.value = []
    trackMap.clear()
    noMore.value = false
  }

  loadPrefs()

  watch([perSourceLimit, () => enabledSources.migu, () => enabledSources.netease, () => enabledSources.qq, () => enabledSources.kuwo], () => {
    savePrefs()
  })

  return {
    keyword,
    results,
    enabledSources,
    perSourceLimit,
    isLoading,
    noMore,
    search,
    loadMore,
    updateTrack,
    reset,
    getEnabledSources
  }
})
