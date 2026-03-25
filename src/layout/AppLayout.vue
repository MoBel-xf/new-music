<template>
  <div class="app-layout">
    <main class="layout-body">
      <router-view v-slot="{ Component, route: currentRoute }">
        <keep-alive :include="['HomePage', 'MinePage']">
          <component :is="Component" :key="currentRoute.name" />
        </keep-alive>
      </router-view>
    </main>

    <nav class="tabbar" :class="{ 'tabbar-play': isPlayRoute }" :style="tabbarStyle">
      <div class="tabbar-ring"></div>

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
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { searchAllSources } from '@/api'
import Icon from '@/components/Icon.vue'
import { usePlayerStore } from '@/stores/player'
import { dbGetHomeRecommend, dbSetHomeRecommend } from '@/utils/db'

const router = useRouter()
const route = useRoute()
const player = usePlayerStore()

const loadingDefault = ref(false)
const HOT_KEYWORD_CACHE_KEY = 'pika-play-hot-keyword'

const DEFAULT_RECOMMEND_KEYWORDS = ['爆火', '流行', '热歌', '热门单曲', '抖音热歌', '华语流行', '飙升榜', '新歌榜', '网络热歌', '年度热单']

const routeTabMap: Record<string, string> = {
  home: 'home',
  play: 'play',
  mine: 'mine'
}

const isPlayRoute = computed(() => route.name === 'play')

const tabbarStyle = computed(() => {
  const base: Record<string, string> = {
    '--tabbar-progress-turn': player.currentTrack ? `${player.progress}turn` : '0turn'
  }
  if (isPlayRoute.value) {
    base['--tabbar-bg'] = player.dominantColor
  }
  return base
})

const routeTab = computed(() => routeTabMap[route.name as string] ?? 'home')

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
      searchAllSources({ keyword, limit: 6 })
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
    const cachedTracks = await dbGetHomeRecommend()
    if (cachedTracks?.length) {
      await player.loadTrackOnly(cachedTracks[0], cachedTracks)
      return
    }

    const cachedKeyword = typeof window !== 'undefined' ? window.localStorage.getItem(HOT_KEYWORD_CACHE_KEY)?.trim() : ''
    const keywords = [cachedKeyword, ...DEFAULT_RECOMMEND_KEYWORDS.sort(() => Math.random() - 0.5)].filter(
      (keyword, index, list): keyword is string => Boolean(keyword) && list.indexOf(keyword) === index
    )

    const hotTrackResult = await resolveFirstTracks(keywords.slice(0, 4))

    if (hotTrackResult?.tracks.length) {
      await dbSetHomeRecommend(hotTrackResult.tracks)
      await player.loadTrackOnly(hotTrackResult.tracks[0], hotTrackResult.tracks)
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
  if (!player.currentTrack) {
    await loadDefaultTrack()
  }
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
  color: rgba(255, 255, 255, 0.6);
}

.tabbar.tabbar-play .tab-side.active {
  color: #fff;
}

.tabbar.tabbar-play .tab-center {
  background: transparent;
  border-color: transparent;
}

.tabbar.tabbar-play .center-title {
  color: #fff;
}

.tabbar.tabbar-play .center-artist {
  color: rgba(255, 255, 255, 0.6);
}

.tabbar.tabbar-play .center-play-btn {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.tabbar.tabbar-play .tabbar-ring {
  opacity: 0;
}

.tabbar-ring {
  position: absolute;
  inset: 0;
  padding: 2px;
  border-radius: inherit;
  pointer-events: none;
  background: conic-gradient(
    from -90deg,
    var(--tabbar-progress-color, #73f0bb) 0turn var(--tabbar-progress-turn, 0turn),
    rgba(255, 255, 255, 0.04) var(--tabbar-progress-turn, 0turn) 1turn
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
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
  background: rgba(255, 255, 255, 0.1);
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
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.center-artist {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.center-play-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: color-mix(in srgb, var(--dominant-color, #1fd6ff) 25%, rgba(255, 255, 255, 0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-primary);
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
  color: #fff;
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
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
