<template>
  <div class="app-layout" @click.capture="player.resumePendingPlay" @touchstart.capture.passive="player.resumePendingPlay">
    <main class="layout-body">
      <router-view v-slot="{ Component, route: currentRoute }">
        <transition :name="getTransitionName(currentRoute)" mode="out-in">
          <keep-alive :include="['HomePage', 'MinePage']">
            <component :is="Component" :key="currentRoute.name" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <nav ref="tabbarRef" class="tabbar" :class="{ 'tabbar-play': useDominantTabbarTone }" :style="tabbarStyle">
      <svg class="tabbar-ring" :viewBox="`0 0 ${ringBox.width} ${ringBox.height}`" aria-hidden="true">
        <path class="tabbar-ring-track" :d="ringPath" pathLength="100" />
        <path class="tabbar-ring-progress" :d="ringPath" pathLength="100" />
      </svg>

      <button class="tab-side" :class="{ active: routeTab === 'home' }" @click="goTo('home')">
        <Icon name="icon-wap-home-o" size="22" />
        <span>首页</span>
      </button>

      <div class="tab-center" @click="handlePlayTap" @touchstart.passive="onPlayTouchStart" @touchend.passive="onPlayTouchEnd">
        <template v-if="player.currentTrack">
          <template v-if="isPlayRoute">
            <button class="center-play-only" @click.stop="player.togglePlayPause">
              <Icon :name="player.isPlaying ? 'icon-pause' : 'icon-play'" size="32" />
            </button>
          </template>

          <template v-else>
            <div class="center-cover">
              <img v-if="player.currentTrack.cover" :src="player.currentTrack.cover" referrerpolicy="no-referrer" />
              <Icon v-else name="icon-music" size="16" />
            </div>

            <div class="center-info">
              <p class="center-title">{{ player.currentTrack.title }}</p>
              <p class="center-artist">{{ player.currentTrack.artist || '未知歌手' }}</p>
            </div>

            <button class="center-play-btn" @click.stop="player.togglePlayPause">
              <Icon :name="player.isPlaying ? 'icon-pause' : 'icon-play'" size="20" />
            </button>
          </template>
        </template>

        <template v-else>
          <div class="center-empty">
            <Icon name="icon-music" size="18" />
            <span>{{ loadingDefault ? '加载中…' : '点击播放' }}</span>
          </div>
        </template>
      </div>

      <button class="tab-side" :class="{ active: routeTab === 'mine' }" @click="goTo('mine')">
        <Icon name="icon-user-o" size="22" />
        <span>我的</span>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchAllSources } from '@/api'
import { useColorExtract } from '@/composables/useColorExtract'
import { useTheme } from '@/composables/useTheme'
import { parseColor, mixColor } from '@/utils/color'
import Icon from '@/components/Icon.vue'
import { useAppConfigStore } from '@/stores/appConfig'
import { usePlayerStore } from '@/stores/player'
import { dbGetHomeRecommend, dbSetHomeRecommend } from '@/utils/db'

const router = useRouter()
const route = useRoute()
const appConfig = useAppConfigStore()
const player = usePlayerStore()
const { prefetch } = useColorExtract()
const { theme } = useTheme()

const loadingDefault = ref(false)
const HOT_KEYWORD_CACHE_KEY = 'xf-play-hot-keyword'
const tabbarRef = ref<HTMLElement | null>(null)
const ringBox = ref({ width: 100, height: 56, radius: 28 })
let tabbarResizeObserver: ResizeObserver | null = null

const DEFAULT_RECOMMEND_KEYWORDS = ['爆火', '流行', '热歌', '热门单曲', '抖音热歌', '华语流行', '飙升榜', '新歌榜', '网络热歌', '年度热单']

const routeTabMap: Record<string, string> = {
  home: 'home',
  play: 'play',
  mine: 'mine'
}

const isPlayRoute = computed(() => route.name === 'play')
const useDominantTabbarTone = computed(
  () => Boolean(player.currentTrack) && (isPlayRoute.value || appConfig.keepTabbarDominantColor || theme.value === 'dominant')
)
const playRecommendCacheKey = computed(() => `${appConfig.playQueryKeyword}:${appConfig.playQueryLimit}`)

const isLightTabbarTone = computed(() => {
  const rgb = parseColor(player.dominantColor)
  if (!rgb) return false
  const [r, g, b] = rgb
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.67
})

const tabbarStyle = computed(() => {
  const progressValue = Math.max(0, Math.min(100, player.progress * 100))
  const accent = player.dominantColor || '#ff6b6b'
  const isLight = isLightTabbarTone.value
  const base: Record<string, string> = {
    '--tabbar-progress-value': player.currentTrack ? `${progressValue}` : '0',
    '--tabbar-progress-color': useDominantTabbarTone.value ? mixColor(accent, isLight ? '#202533' : '#ffffff', isLight ? 0.12 : 0.28) : '#73f0bb',
    '--tabbar-fg-primary': useDominantTabbarTone.value ? (isLight ? '#202533' : '#ffffff') : 'var(--text-primary)',
    '--tabbar-fg-secondary': useDominantTabbarTone.value ? (isLight ? 'rgba(32,37,51,0.66)' : 'rgba(255,255,255,0.68)') : 'var(--text-tertiary)',
    '--tabbar-center-bg': useDominantTabbarTone.value ? (isLight ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.08)') : 'var(--surface-1)',
    '--tabbar-center-border': useDominantTabbarTone.value ? (isLight ? 'rgba(32,37,51,0.1)' : 'rgba(255,255,255,0.12)') : 'var(--line-soft)',
    '--tabbar-control-bg': useDominantTabbarTone.value
      ? mixColor(accent, isLight ? '#ffffff' : '#0f1117', isLight ? 0.62 : 0.3)
      : 'color-mix(in srgb, var(--dominant-color, #1fd6ff) 25%, rgba(255, 255, 255, 0.1))',
    '--tabbar-cover-bg': useDominantTabbarTone.value ? (isLight ? 'rgba(255,255,255,0.44)' : 'rgba(255,255,255,0.12)') : 'rgba(255, 255, 255, 0.1)'
  }
  if (useDominantTabbarTone.value) {
    base['--tabbar-bg'] = player.dominantColor
  }
  return base
})

const routeTab = computed(() => routeTabMap[route.name as string] ?? 'home')

const SECONDARY_ROUTES = new Set(['search', 'playlist', 'favorites', 'history', 'cache'])
const TAB_ORDER: Record<string, number> = { home: 0, play: 1, mine: 2 }

function getTransitionName(currentRoute: { name?: string | symbol | null }) {
  const name = String(currentRoute.name ?? '')
  if (SECONDARY_ROUTES.has(name)) return 'slide-up'
  return 'fade'
}
const ringPath = computed(() => {
  const strokeInset = 1
  const width = Math.max(4, ringBox.value.width - strokeInset * 2)
  const height = Math.max(4, ringBox.value.height - strokeInset * 2)
  const inset = strokeInset
  const x = inset
  const y = inset
  const radius = Math.max(2, Math.min(ringBox.value.radius - inset, width / 2, height / 2))
  const right = x + width
  const bottom = y + height

  return [
    `M ${x + radius} ${y}`,
    `H ${right - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${y + radius}`,
    `V ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `H ${x + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x} ${bottom - radius}`,
    `V ${y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${x + radius} ${y}`
  ].join(' ')
})

function updateRingBox() {
  const element = tabbarRef.value
  if (!element) return
  const { width, height } = element.getBoundingClientRect()
  ringBox.value = {
    width: Math.max(16, Math.round(width)),
    height: Math.max(16, Math.round(height)),
    radius: Math.max(8, Math.round(height / 2))
  }
}

function observeTabbar() {
  updateRingBox()
  if (typeof ResizeObserver === 'undefined' || !tabbarRef.value) return
  tabbarResizeObserver?.disconnect()
  tabbarResizeObserver = new ResizeObserver(() => {
    updateRingBox()
  })
  tabbarResizeObserver.observe(tabbarRef.value)
}

function goTo(name: 'home' | 'mine') {
  if (route.name === name) return
  router.push({ name })
}

let touchStartY = 0
let swipeHandled = false

function onPlayTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0].clientY
  swipeHandled = false
}

function onPlayTouchEnd(e: TouchEvent) {
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dy) > 40) {
    swipeHandled = true
    player.playNext(dy < 0 ? 'next' : 'prev')
  }
}

async function resolveFirstTracks(keywords: string[]) {
  return new Promise<{ keyword: string; tracks: Awaited<ReturnType<typeof searchAllSources>> } | null>((resolve) => {
    let pending = keywords.length
    let settled = false

    if (!pending) {
      resolve(null)
      return
    }

    keywords.forEach((keyword) => {
      searchAllSources({ keyword, limit: appConfig.playQueryLimit })
        .then((tracks) => {
          if (!settled && tracks.length) {
            settled = true
            resolve({ keyword, tracks })
            return
          }
          pending -= 1
          if (!pending && !settled) {
            resolve(null)
          }
        })
        .catch(() => {
          pending -= 1
          if (!pending && !settled) {
            resolve(null)
          }
        })
    })
  })
}

async function handlePlayTap() {
  if (swipeHandled) {
    swipeHandled = false
    return
  }
  if (player.currentTrack) {
    router.push({ name: 'play' })
    return
  }

  await loadDefaultTrack()
  if (player.currentTrack) {
    router.push({ name: 'play' })
  }
}

async function loadDefaultTrack() {
  if (loadingDefault.value) return
  loadingDefault.value = true
  try {
    const cacheKey = playRecommendCacheKey.value
    const cachedTracks = await dbGetHomeRecommend(cacheKey)
    if (cachedTracks?.length) {
      void prefetch(cachedTracks.slice(0, appConfig.colorPrefetchCount).map((track) => track.cover))
      await player.playTrack(cachedTracks[0], cachedTracks)
      return
    }

    const cachedKeyword = typeof window !== 'undefined' ? window.localStorage.getItem(HOT_KEYWORD_CACHE_KEY)?.trim() : ''
    const keywords = [cachedKeyword, appConfig.playQueryKeyword, ...DEFAULT_RECOMMEND_KEYWORDS.sort(() => Math.random() - 0.5)].filter(
      (keyword, index, list): keyword is string => Boolean(keyword) && list.indexOf(keyword) === index
    )

    const hotTrackResult = await resolveFirstTracks(keywords.slice(0, 4))

    if (hotTrackResult?.tracks.length) {
      void prefetch(hotTrackResult.tracks.slice(0, appConfig.colorPrefetchCount).map((track) => track.cover))
      await dbSetHomeRecommend(hotTrackResult.tracks, cacheKey)
      await player.playTrack(hotTrackResult.tracks[0], hotTrackResult.tracks)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HOT_KEYWORD_CACHE_KEY, hotTrackResult.keyword)
      }
    }
  } catch {
    // 静默失败
  } finally {
    loadingDefault.value = false
  }
}

onMounted(async () => {
  observeTabbar()
  if (!player.currentTrack) {
    await loadDefaultTrack()
  }
})

onBeforeUnmount(() => {
  tabbarResizeObserver?.disconnect()
  tabbarResizeObserver = null
})
</script>

<style scoped>
.app-layout {
  height: var(--app-height);
  min-height: var(--app-height);
  display: flex;
  flex-direction: column;
  background: transparent;
}

.layout-body {
  flex: 1;
  min-height: 0;
}

.tabbar {
  position: fixed;
  bottom: calc(var(--safe-bottom) + 10px);
  left: 10px;
  right: 10px;
  height: var(--tabbar-height);
  background: color-mix(in srgb, var(--bg-sheet) 92%, transparent);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  border: none;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-float);
  display: flex;
  align-items: center;
  z-index: 100;
  padding: 0 6px;
  gap: 4px;
  box-sizing: border-box;
  width: auto;
  overflow: hidden;
  transition:
    background 0.4s ease,
    box-shadow 0.4s ease;
}

.tabbar.tabbar-play {
  background: color-mix(in srgb, var(--tabbar-bg, var(--bg-sheet)) 85%, rgba(0, 0, 0, 0.4));
  box-shadow: none;
}

.tabbar.tabbar-play .tab-side {
  color: var(--tabbar-fg-secondary);
}

.tabbar.tabbar-play .tab-side.active {
  color: var(--tabbar-fg-primary);
}

.tabbar.tabbar-play .tab-center {
  background: var(--tabbar-center-bg);
  border-color: var(--tabbar-center-border);
}

.tabbar.tabbar-play .center-title {
  color: var(--tabbar-fg-primary);
}

.tabbar.tabbar-play .center-artist {
  color: var(--tabbar-fg-secondary);
}

.tabbar.tabbar-play .center-play-btn {
  background: var(--tabbar-control-bg);
  color: var(--tabbar-fg-primary);
}

.tabbar.tabbar-play .center-cover {
  background: var(--tabbar-cover-bg);
}

.tabbar.tabbar-play .center-empty,
.tabbar.tabbar-play .center-play-only {
  color: var(--tabbar-fg-primary);
}

.tabbar-ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  shape-rendering: geometricPrecision;
}

.tabbar-ring-track,
.tabbar-ring-progress {
  fill: none;
  stroke-width: 2;
  vector-effect: non-scaling-stroke;
}

.tabbar-ring-track {
  stroke: transparent;
}

.tabbar-ring-progress {
  stroke: var(--tabbar-progress-color, #73f0bb);
  stroke-linecap: round;
  stroke-dasharray: var(--tabbar-progress-value, 0) 100;
  transition: stroke-dasharray 0.16s linear;
}

.tabbar > *:not(.tabbar-ring) {
  position: relative;
  z-index: 1;
}

.tab-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 60px;
  flex-shrink: 0;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--text-tertiary);
  font-size: 11px;
  font-weight: 500;
  border-radius: var(--radius-lg);
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.tab-side.active {
  color: var(--text-primary);
  font-weight: 700;
}

.tab-side:active {
  transform: scale(0.9);
  opacity: 0.8;
}

.tab-center {
  flex: 1;
  height: calc(100% - 10px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: calc(var(--radius-xl) - 6px);
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: background 0.2s ease;
}

.tab-center:active {
  background: var(--surface-2);
}

.center-cover {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--tabbar-cover-bg, rgba(255, 255, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.center-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.center-info {
  flex: 1;
  min-width: 0;
}

.center-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--tabbar-fg-primary, var(--text-primary));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.center-artist {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--tabbar-fg-secondary, var(--text-tertiary));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.center-play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--tabbar-control-bg, color-mix(in srgb, var(--dominant-color, #1fd6ff) 25%, rgba(255, 255, 255, 0.1)));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tabbar-fg-primary, var(--text-primary));
  flex-shrink: 0;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.center-play-btn:active {
  transform: scale(0.85);
}

.center-play-only {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: transparent;
  outline: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--tabbar-fg-primary, #fff);
  margin: auto;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
}

.center-play-only:active {
  transform: scale(0.85);
}

.center-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  color: var(--tabbar-fg-secondary, var(--text-tertiary));
  font-size: 12px;
}
</style>
