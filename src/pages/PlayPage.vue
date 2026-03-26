<template>
  <div
    class="play-page"
    :style="pageToneStyle"
    @touchstart.passive="onSwipeTouchStart"
    @touchmove.passive="onSwipeTouchMove"
    @touchend.passive="onSwipeTouchEnd"
  >
    <div class="swipe-content" :style="swipeContentStyle">
      <div class="top-bar" @touchstart.stop @touchmove.stop @touchend.stop>
        <button class="top-action-btn" @click="showModePicker = true">
          <Icon name="icon-todo-list-o" size="22" />
        </button>
        <div class="top-center"></div>
        <button class="top-action-btn" @click="goToSearch">
          <Icon name="icon-search" size="22" />
        </button>
      </div>

      <main class="play-body">
        <section class="cover-view">
          <div class="cover-stage">
            <div class="cover-wrap" :class="{ spinning: player.isPlaying, 'has-cover': !!track?.cover }">
              <div v-if="!track?.cover" class="cover-fallback"><Icon name="icon-music" size="72" /></div>
            </div>
          </div>
          <div class="immersive-panel">
            <div class="track-info-row">
              <div class="track-info">
                <h1 class="track-title">{{ track?.title ?? '—' }}</h1>
                <p class="track-artist">{{ track?.artist ?? '未知歌手' }}</p>
              </div>

              <div class="info-actions">
                <button class="fav-icon-btn" :class="{ active: isFav }" @click="toggleFav">
                  <Icon :name="isFav ? 'icon-like' : 'icon-like-o'" size="20" />
                </button>
                <button class="mode-icon-btn" @click="cycleMode">
                  <Icon :name="modeIcon" size="20" />
                </button>
                <button class="more-icon-btn" @click="showMore = true">
                  <Icon name="icon-more" size="20" />
                </button>
              </div>
            </div>

            <div class="lyric-container" ref="lyricZoneRef">
              <div class="lyric-scroll-inner">
                <button
                  v-for="(line, index) in player.lyricLines"
                  :key="`${line.time}-${index}`"
                  :ref="(el) => setLyricLineRef(el, index)"
                  class="lyric-line"
                  :class="{ active: index === player.currentLyricIndex }"
                  @click="onLyricClick(line.time, index)"
                >
                  {{ line.text || '…' }}
                </button>
                <div class="lyric-spacer" :style="lyricSpacerStyle" aria-hidden="true" />
                <div v-if="!player.lyricLines.length" class="lyric-empty">暂无歌词</div>
              </div>
            </div>
          </div>
        </section>

        <div v-if="player.isLoadingDetails" class="loading-overlay">
          <van-loading color="var(--brand-from)" size="32px" />
          <p>正在加载…</p>
        </div>
      </main>

      <div class="progress-area">
        <div class="progress-wrap">
          <span class="time-text">{{ formatTime(player.currentTime) }}</span>
          <div
            class="progress-track"
            ref="progressRef"
            @click="onProgressClick"
            @touchstart.passive="onProgressTouchStart"
            @touchmove.passive="onProgressTouchMove"
            @touchend="onProgressTouchEnd"
          >
            <div class="progress-fill" :style="{ width: `${player.progress * 100}%` }" />
            <div class="progress-thumb" :style="{ left: `${player.progress * 100}%` }" />
          </div>
          <span class="time-text">{{ formatTime(player.duration) }}</span>
        </div>
      </div>
    </div>

    <van-popup v-model:show="showModePicker" position="left" :style="{ width: '80%', height: '100%', border: 'none' }">
      <div class="mode-panel" @touchstart.stop @touchmove.stop @touchend.stop>
        <div class="mode-panel-header">
          <span class="mode-panel-title">推荐类型</span>
          <span class="mode-panel-subtitle">按热词快速切换一组推荐歌曲</span>
        </div>

        <button
          v-for="keyword in hotKeywordOptions"
          :key="keyword"
          class="mode-option"
          :class="{ active: keyword === recommendKeyword }"
          @click="pickRecommendKeyword(keyword)"
        >
          <span class="mode-option-icon">
            <Icon name="icon-music" size="18" />
          </span>
          <span class="mode-option-copy">
            <span class="mode-option-label">{{ keyword }}</span>
            <!-- <span class="mode-option-desc">按该关键词重新生成当前播放队列</span> -->
          </span>
          <!-- <span v-if="keyword === recommendKeyword" class="mode-option-check">当前</span> -->
        </button>
      </div>
    </van-popup>

    <van-popup v-model:show="showQueue" position="bottom" round :style="{ height: '65%', border: 'none' }">
      <div class="queue-panel" :style="{ background: 'color-mix(in srgb, #000 92%, transparent)' }" @touchstart.stop @touchmove.stop @touchend.stop>
        <div class="queue-header">
          <span class="queue-title">播放队列</span>
          <span class="queue-count">{{ player.queue.length }} 首</span>
        </div>
        <div class="queue-list" @touchstart.stop @touchmove.stop @touchend.stop>
          <div
            v-for="(t, i) in player.queue"
            :key="t.uid"
            class="queue-item"
            :class="{ 'queue-active': t.uid === track?.uid }"
            @click="playFromQueue(t)"
          >
            <span class="queue-idx">{{ i + 1 }}</span>
            <div class="queue-meta">
              <p class="queue-name" :class="{ 'queue-active': t.uid === track?.uid }">{{ t.title }}</p>
              <p class="queue-artist">{{ t.artist }}</p>
            </div>
            <SourceBadge :source="t.source" />
          </div>
        </div>
      </div>
    </van-popup>

    <van-action-sheet v-model:show="showMore" :actions="moreActions" cancel-text="取消" @select="onMoreAction" />

    <van-popup v-model:show="showPlaylistPicker" position="bottom" round :style="{ maxHeight: '50%' }">
      <div class="playlist-picker">
        <div class="picker-header">
          <span>选择歌单</span>
          <button class="picker-close" @click="showPlaylistPicker = false">×</button>
        </div>
        <div class="picker-item picker-create" @click="createPlaylistAndAdd">
          <span class="picker-icon">＋</span>
          <div class="picker-meta">
            <p class="picker-name">新建歌单</p>
            <p class="picker-count">创建并添加到新歌单</p>
          </div>
        </div>
        <div v-if="!playlistStore.playlists.length" class="picker-empty">还没有歌单，点击上方新建一个吧 🎶</div>
        <div v-for="pl in playlistStore.playlists" :key="pl.id" class="picker-item" @click="addToPlaylistFromDetail(pl.id)">
          <span class="picker-icon">🎵</span>
          <div class="picker-meta">
            <p class="picker-name">{{ pl.name }}</p>
            <p class="picker-count">{{ pl.trackUids.length }} 首</p>
          </div>
          <span v-if="pl.trackUids.includes(track?.uid ?? '')" class="picker-already">✓ 已添加</span>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { searchAllSources } from '@/api'
import { useAppConfigStore } from '@/stores/appConfig'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { formatTime } from '@/utils/format'
import { parseColor, mixColor } from '@/utils/color'
import { showToast } from 'vant'
import type { LyricLine, PlayMode, Track } from '@/types/music'
import Icon from '@/components/Icon.vue'
import SourceBadge from '@/components/SourceBadge.vue'

defineOptions({ name: 'PlayPage' })

const HOT_KEYWORD_CACHE_KEY = 'pika-play-hot-keyword'

const router = useRouter()
const appConfig = useAppConfigStore()
const player = usePlayerStore()
const playlistStore = usePlaylistStore()

const showModePicker = ref(false)
const showQueue = ref(false)
const showMore = ref(false)
const recommendKeyword = ref(readCachedHotKeyword())
const progressRef = ref<HTMLElement>()
const lyricZoneRef = ref<HTMLElement>()
const lyricLineRefs = ref<Array<HTMLElement | null>>([])
const lyricSpacerHeight = ref(140)
const viewportHeight = ref(typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 0)
let lyricZoneObserver: ResizeObserver | null = null

function readCachedHotKeyword() {
  if (typeof window === 'undefined') return appConfig.playQueryKeyword
  const cached = window.localStorage.getItem(HOT_KEYWORD_CACHE_KEY)
  return cached?.trim() || appConfig.playQueryKeyword
}

function cacheHotKeyword(keyword: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(HOT_KEYWORD_CACHE_KEY, keyword)
}

let swipeTouchStartY = 0
let dragging = false
let swipeHandled = false
let swipeLocked = false
const swipeOffset = ref(0)
const swipeTransiting = ref(false)
const swipeAnimating = ref(false)

const swipeContentStyle = computed(() => ({
  transform: `translateY(${swipeOffset.value}px)`,
  transition: swipeTransiting.value ? 'transform 0.35s cubic-bezier(0.22, 0.68, 0.32, 1)' : 'none'
}))

function shouldLockSwipe(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('button, a, input, textarea, select, [role="button"], .progress-track, .queue-panel, .playlist-picker, .mode-panel'))
}

function onSwipeTouchStart(e: TouchEvent) {
  if (swipeAnimating.value) return
  swipeLocked = shouldLockSwipe(e.target)
  if (swipeLocked) return
  swipeTouchStartY = e.touches[0].clientY
  swipeHandled = false
  swipeTransiting.value = false
}

function onSwipeTouchMove(e: TouchEvent) {
  if (swipeLocked || dragging || swipeAnimating.value) return
  const dy = e.touches[0].clientY - swipeTouchStartY
  if (Math.abs(dy) < 8) return
  swipeOffset.value = dy * 0.35
}

function onSwipeTouchEnd(e: TouchEvent) {
  if (swipeLocked || dragging || swipeAnimating.value) {
    swipeLocked = false
    return
  }
  const dy = e.changedTouches[0].clientY - swipeTouchStartY
  if (Math.abs(dy) > 60) {
    swipeHandled = true
    const dir = dy < 0 ? 'next' : 'prev'
    const exitY = dy < 0 ? -window.innerHeight : window.innerHeight
    swipeAnimating.value = true
    swipeTransiting.value = true
    swipeOffset.value = exitY

    setTimeout(() => {
      player.playNext(dir)
      swipeTransiting.value = false
      swipeOffset.value = -exitY
      requestAnimationFrame(() => {
        swipeTransiting.value = true
        swipeOffset.value = 0
        setTimeout(() => {
          swipeTransiting.value = false
          swipeAnimating.value = false
        }, 350)
      })
    }, 300)
  } else {
    swipeTransiting.value = true
    swipeOffset.value = 0
    setTimeout(() => {
      swipeTransiting.value = false
    }, 250)
  }

  swipeLocked = false
}

function goToSearch() {
  router.push({ name: 'search' })
}

const track = computed(() => player.currentTrack)
const isFav = computed(() => (track.value ? playlistStore.isFavorited(track.value.uid) : false))
const isLightBg = computed(() => {
  const rgb = parseColor(player.dominantColor)
  if (!rgb) return false
  const [r, g, b] = rgb
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.65
})

const pageToneStyle = computed(() => {
  const accent = player.dominantColor
  const isLight = isLightBg.value
  const textPrimary = isLight ? '#000000' : '#FFFFFF'
  const textSecondary = isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)'
  const controlBg = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'
  const accentBright = mixColor(accent, '#FFFFFF', isLight ? 0.24 : 0.32)
  const bgGlow = mixColor(accent, isLight ? '#FFFFFF' : '#1A1A2E', isLight ? 0.56 : 0.12)
  const bgStart = mixColor(accent, isLight ? '#FFF7EF' : '#1A1A2E', isLight ? 0.82 : 0.08)
  const bgMid = mixColor(accent, isLight ? '#F4F7FB' : '#141428', isLight ? 0.9 : 0.18)
  const bgEnd = mixColor(accent, isLight ? '#EEF2F8' : '#0E0E1C', isLight ? 0.96 : 0.35)

  return {
    '--page-bg-color': accent,
    '--page-cover-image': track.value?.cover ? `url("${track.value.cover}")` : 'none',
    '--page-accent': accent,
    '--page-accent-bright': accentBright,
    '--page-bg-glow': bgGlow,
    '--page-bg-start': bgStart,
    '--page-bg-mid': bgMid,
    '--page-bg-end': bgEnd,
    '--page-text-primary': textPrimary,
    '--page-text-secondary': textSecondary,
    '--page-icon-color': textPrimary,
    '--page-control-bg': controlBg,
    '--page-progress-fill': `linear-gradient(90deg, ${accentBright}, ${accent})`,
    '--page-progress-track': isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
    '--page-vh': `${viewportHeight.value}px`,
    color: textPrimary
  }
})

const lyricSpacerStyle = computed(() => ({
  height: `${lyricSpacerHeight.value}px`
}))

function updateLyricSpacer() {
  const zone = lyricZoneRef.value
  if (!zone) return
  lyricSpacerHeight.value = Math.max(96, Math.round(zone.clientHeight / 2 - 28))
}

function disconnectLyricObserver() {
  lyricZoneObserver?.disconnect()
  lyricZoneObserver = null
}

function observeLyricZone() {
  disconnectLyricObserver()
  if (typeof ResizeObserver === 'undefined' || !lyricZoneRef.value) return
  lyricZoneObserver = new ResizeObserver(() => {
    updateLyricSpacer()
  })
  lyricZoneObserver.observe(lyricZoneRef.value)
}

function updateViewportMetrics() {
  viewportHeight.value = window.visualViewport?.height ?? window.innerHeight
  updateLyricSpacer()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updateViewportMetrics)
  nextTick(() => {
    updateViewportMetrics()
    observeLyricZone()
    if (player.currentLyricIndex >= 0) {
      centerLyricLine(player.currentLyricIndex, false)
    }
  })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updateViewportMetrics)
  disconnectLyricObserver()
})

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    router.push({ name: 'home' })
  }
}

async function toggleFav() {
  if (!track.value) return
  await playlistStore.toggleFavorite(track.value)
}

const MODE_ICONS: Record<PlayMode, string> = { list: 'list', single: 'single', shuffle: 'shuffle' }
const modeIcon = computed(() => `icon-${MODE_ICONS[player.playMode]}`)

const hotKeywordOptions = computed(() => {
  const defaults = ['爆火', '流行', '热歌', '热门单曲', '抖音热歌', '华语流行', '飙升榜', '新歌榜', '网络热歌', '年度热单']
  return Array.from(new Set([appConfig.playQueryKeyword, ...defaults].filter(Boolean)))
})

function cycleMode() {
  const order: PlayMode[] = ['list', 'single', 'shuffle']
  player.setPlayMode(order[(order.indexOf(player.playMode) + 1) % order.length])
}

async function pickRecommendKeyword(keyword: string) {
  showModePicker.value = false
  try {
    const tracks = await searchAllSources({ keyword, limit: appConfig.playQueryLimit })
    if (!tracks.length) {
      showToast(`未找到“${keyword}”相关歌曲`)
      return
    }
    await player.loadTrackOnly(tracks[0], tracks, { type: 'results' })
    recommendKeyword.value = keyword
    cacheHotKeyword(keyword)
    showToast(`已切换到${keyword}`)
  } catch {
    showToast('加载失败，请稍后重试')
  }
}

function onProgressClick(event: MouseEvent) {
  if (!progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  player.seek((event.clientX - rect.left) / rect.width)
}

function onProgressTouchStart() {
  dragging = true
}

function onProgressTouchMove(event: TouchEvent) {
  if (!dragging || !progressRef.value) return
  const rect = progressRef.value.getBoundingClientRect()
  player.seek(Math.max(0, Math.min(1, (event.touches[0].clientX - rect.left) / rect.width)))
}

function onProgressTouchEnd() {
  dragging = false
}

function setLyricLineRef(element: Element | { $el?: Element } | null, index: number) {
  lyricLineRefs.value[index] = (element && '$el' in element ? (element.$el as HTMLElement | null) : (element as HTMLElement | null)) ?? null
}

function centerLyricLine(index: number, smooth = true) {
  const zone = lyricZoneRef.value
  const line = lyricLineRefs.value[index]
  if (!zone || !line) return

  const zoneRect = zone.getBoundingClientRect()
  const lineRect = line.getBoundingClientRect()
  const nextTop = zone.scrollTop + (lineRect.top - zoneRect.top) - zone.clientHeight / 2 + lineRect.height / 2

  zone.scrollTo({
    top: Math.max(0, nextTop),
    behavior: smooth ? 'smooth' : 'auto'
  })
}

function onLyricClick(time: LyricLine['time'], index: number) {
  player.seekToTime(time)
  centerLyricLine(index)
}

function playFromQueue(nextTrack: Track) {
  showQueue.value = false
  player.playTrack(nextTrack)
}

const showPlaylistPicker = ref(false)
const moreActions = computed(() => [{ name: isFav.value ? '取消收藏' : '加入收藏' }, { name: '加入歌单' }, { name: '播放列表' }])

function onMoreAction(action: { name: string }) {
  showMore.value = false
  if (action.name.includes('收藏')) toggleFav()
  if (action.name.includes('歌单')) showPlaylistPicker.value = true
  if (action.name === '播放列表') showQueue.value = true
}

async function createPlaylistAndAdd() {
  const name = window.prompt('请输入歌单名称')
  if (!name?.trim() || !track.value) return
  const pl = await playlistStore.createPlaylist(name.trim())
  await playlistStore.addToPlaylist(pl.id, track.value)
  showPlaylistPicker.value = false
  showToast('已创建歌单并添加 🎶')
}

async function addToPlaylistFromDetail(playlistId: string) {
  if (!track.value) return
  const pl = playlistStore.playlists.find((p) => p.id === playlistId)
  if (pl?.trackUids.includes(track.value.uid)) {
    showToast('已在歌单中')
    return
  }
  await playlistStore.addToPlaylist(playlistId, track.value)
  showPlaylistPicker.value = false
  showToast('已添加到歌单 🎶')
}

watch(
  () => player.currentLyricIndex,
  (index) => {
    if (index < 0) return
    nextTick(() => {
      updateViewportMetrics()
      centerLyricLine(index)
    })
  }
)

watch(
  () => player.lyricLines,
  () => {
    lyricLineRefs.value = []
    nextTick(() => {
      updateViewportMetrics()
      lyricZoneRef.value?.scrollTo({ top: 0, behavior: 'auto' })
    })
  },
  { deep: true }
)
</script>

<style scoped>
.play-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  touch-action: pan-y;
  overflow: hidden;
  background-color: var(--page-bg-start, rgb(12, 14, 20));
  transition:
    background-color 0.6s ease,
    color 0.6s ease;
}

.swipe-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  will-change: transform;
}

.play-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(180deg, var(--page-bg-start) 0%, var(--page-bg-mid) 48%, var(--page-bg-end) 100%);
  transition: background 0.6s ease;
}

.play-page::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--page-accent) 28%, transparent) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, color-mix(in srgb, var(--page-accent-bright) 14%, transparent) 0%, transparent 40%);
}

.top-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 18px 0;
  gap: 14px;
  flex-shrink: 0;
}

.top-action-btn {
  width: 40px;
  height: 40px;
  border: 1px solid var(--page-control-bg);
  background: var(--page-control-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: var(--page-text-primary);
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.top-action-btn:active {
  background: rgba(255, 255, 255, 0.16);
  transform: scale(0.95);
}

.top-center {
  flex: 1;
  text-align: center;
}

.play-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.cover-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  justify-content: flex-start;
}

.cover-stage {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  height: clamp(360px, calc(var(--page-vh) * 0.48), 620px);
  margin: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 56px) 20px 0;
  position: relative;
  box-sizing: border-box;
}

.cover-stage::after {
  content: '';
  position: absolute;
  left: -6%;
  right: -6%;
  bottom: -24%;
  height: clamp(240px, calc(var(--page-vh) * 0.32), 380px);
  border-radius: 50%;
  background: radial-gradient(
    circle at 50% 50%,
    color-mix(in srgb, var(--page-accent) 20%, transparent) 0%,
    color-mix(in srgb, var(--page-accent-bright) 10%, transparent) 20%,
    color-mix(in srgb, var(--page-bg-glow) 10%, transparent) 40%,
    color-mix(in srgb, var(--page-bg-glow) 4%, transparent) 58%,
    transparent 88%
  );
  filter: blur(68px);
  opacity: 0.68;
  pointer-events: none;
  animation: heroGlowFloat 7.2s ease-in-out infinite;
}

.cover-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 30px 76px rgba(0, 0, 0, 0.22);
  background: color-mix(in srgb, var(--page-accent) 18%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.cover-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: var(--page-cover-image);
  background-size: cover;
  background-position: center 16%;
  opacity: 0;
  transform: scale(1.06);
  filter: saturate(1.08) contrast(1.04) brightness(1);
  transition: opacity 0.35s ease;
}

.cover-wrap.has-cover::before {
  opacity: 0.96;
}

.cover-wrap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.1) 0%, transparent 28%),
    linear-gradient(180deg, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.06) 70%, rgba(0, 0, 0, 0.14) 100%);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  animation: heroOverlayShift 8.5s ease-in-out infinite;
}

.cover-wrap.spinning {
  animation: none;
}

.cover-wrap:not(.spinning) {
  animation: none;
}

.cover-fallback {
  color: var(--page-text-primary);
  opacity: 0.5;
}

.immersive-panel {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 14px;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-info-row {
  width: min(100%, 760px);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 8px 12px;
  flex-shrink: 0;
  background: transparent;
}

.track-title {
  margin: 0;
  font-size: clamp(28px, 6vw, 34px);
  font-weight: 700;
  color: var(--page-text-primary);
  line-height: 1.16;
  letter-spacing: -0.03em;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  margin: 6px 0 0;
  font-size: 16px;
  color: var(--page-text-secondary);
  font-weight: 500;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fav-icon-btn,
.mode-icon-btn,
.more-icon-btn {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border: 1px solid var(--page-control-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--page-control-bg) 92%, transparent);
  color: var(--page-text-primary);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
  transition:
    transform 0.2s ease,
    color 0.2s ease,
    background 0.2s ease;
  cursor: pointer;
}

.info-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.fav-icon-btn.active {
  color: #ff4d4f;
}

.fav-icon-btn:active,
.mode-icon-btn:active,
.more-icon-btn:active {
  background: rgba(255, 255, 255, 0.16);
  transform: scale(0.92);
}

.lyric-container {
  flex: 0 0 auto;
  position: relative;
  width: min(100%, 760px);
  height: calc(1.52em * 3 + 56px);
  max-height: calc(1.52em * 3 + 56px);
  margin: 14px auto 0;
  padding: 12px 22px 10px;
  overflow-y: auto;
  mask-image: linear-gradient(to bottom, transparent, #000 15%, #000 85%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 15%, #000 85%, transparent);
  scrollbar-width: none;
  scroll-behavior: smooth;
  overscroll-behavior: contain;
}

@keyframes heroGlowFloat {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.72;
  }

  50% {
    transform: translateY(-8px) scale(1.04);
    opacity: 0.92;
  }
}

@keyframes heroOverlayShift {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.92;
  }
}

.lyric-container::-webkit-scrollbar {
  display: none;
}

.lyric-scroll-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 0 0 8px;
}

.lyric-spacer {
  flex-shrink: 0;
}

.lyric-line {
  border: none;
  padding: 0;
  background: transparent;
  color: var(--page-text-secondary);
  font-size: 1.16rem;
  line-height: 1.5;
  font-weight: 500;
  text-align: left;
  transition: all 0.35s ease;
  word-break: break-word;
  scroll-margin-block: 50%;
}

.lyric-line.active {
  color: var(--page-text-primary);
  font-size: 1.4rem;
  font-weight: 700;
  transform: scale(1.02);
}

.lyric-empty {
  color: var(--page-text-secondary);
  font-size: 1rem;
  text-align: left;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  gap: 12px;
  z-index: 10;
  color: var(--page-text-primary);
  font-size: 14px;
}

.mode-panel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  /* grid-auto-rows: minmax(128px, auto); */
  align-content: flex-start;
  gap: 12px;
  width: 100%;
  height: 100%;
  padding: calc(env(safe-area-inset-top, 0px) + 18px) 16px calc(env(safe-area-inset-bottom, 0px) + 18px);
  background:
    radial-gradient(circle at 18% 16%, color-mix(in srgb, var(--page-accent) 26%, transparent) 0%, transparent 38%),
    radial-gradient(circle at 82% 78%, color-mix(in srgb, var(--page-accent-bright) 14%, transparent) 0%, transparent 34%),
    linear-gradient(180deg, var(--page-bg-start) 0%, var(--page-bg-mid) 48%, var(--page-bg-end) 100%);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.mode-panel-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 2px 8px 10px;
}

.mode-panel-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.mode-panel-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.mode-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  /* min-height: 128px; */
  border: 1px solid var(--line-soft);
  border-radius: 24px;
  background: color-mix(in srgb, var(--surface-1) 90%, transparent);
  padding: 16px 10px;
  color: var(--text-primary);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.mode-option:active {
  transform: scale(0.98);
}

.mode-option.active {
  border-color: color-mix(in srgb, var(--brand-from) 46%, var(--line-soft));
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--brand-from) 14%, var(--surface-1)),
    color-mix(in srgb, var(--page-accent, var(--brand-from)) 10%, var(--surface-1))
  );
}

.mode-option-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--brand-from) 10%, var(--surface-2));
  color: var(--text-primary);
  flex-shrink: 0;
}

.mode-option-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  width: 100%;
  text-align: center;
}

.mode-option-label {
  font-size: 14px;
  font-weight: 700;
  line-height: 1.3;
}

.mode-option-desc {
  font-size: 11px;
  line-height: 1.35;
  color: var(--text-secondary);
}

.mode-option-check {
  font-size: 12px;
  font-weight: 700;
  color: var(--brand-from);
}

.mode-panel-header {
  grid-column: 1 / -1;
}

.progress-area {
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  margin-top: 28px;
  padding: 0 24px calc(var(--tabbar-height, 56px) + var(--safe-bottom, 0px) + 24px);
  background: transparent;
}

.progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-text {
  font-size: 12px;
  color: var(--page-text-secondary);
  font-variant-numeric: tabular-nums;
  min-width: 36px;
  text-align: center;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: var(--page-progress-track, var(--play-progress-track));
  border-radius: 999px;
  position: relative;
  cursor: pointer;
}

.progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: var(--page-progress-fill);
  border-radius: 999px;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--page-accent-bright);
  border: 3px solid rgba(255, 255, 255, 0.32);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24);
  transform: translate(-50%, -50%);
  transition: left 0.3s linear;
}

.queue-header {
  display: flex;
  align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--line-soft);
  gap: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent);
}

.queue-title {
  font-size: 17px;
  font-weight: 700;
  flex: 1;
  color: var(--page-text-primary);
}

.queue-count {
  font-size: 13px;
  color: var(--page-text-secondary);
}

.queue-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  touch-action: pan-y;
}

.queue-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  touch-action: pan-y;
}

.queue-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-radius: 20px;
  margin: 4px 12px;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
}

.queue-item:active {
  background: var(--surface-2);
}

.queue-item.queue-active {
  background: color-mix(in srgb, var(--dominant-color) 99%, var(--surface-1));
  border-color: color-mix(in srgb, var(--dominant-color) 99%, var(--line-soft));
}

.queue-idx {
  font-size: 13px;
  color: var(--page-text-secondary);
  min-width: 20px;
  text-align: center;
  font-weight: 500;
}

.queue-meta {
  flex: 1;
  min-width: 0;
}

.queue-name {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--page-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.15s;
}

.queue-name.queue-active {
  color: var(--page-text-primary);
  font-weight: 600;
}

.queue-artist {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--page-text-secondary);
}

.playlist-picker {
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 20px);
  max-height: 60vh;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  border-bottom: 1px solid var(--line-soft);
}

.picker-close {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--surface-1);
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.picker-close:active {
  transform: scale(0.9);
  background: var(--surface-2);
}

.picker-empty {
  padding: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary);
}

.picker-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  gap: 16px;
  cursor: pointer;
  border-radius: 16px;
  margin: 4px 16px;
  border: 1px solid var(--line-soft);
  background: var(--surface-1);
  transition: all 0.2s ease;
}

.picker-item:active {
  transform: scale(0.96);
  background: var(--surface-2);
}

.picker-create {
  border: 1px dashed var(--line-strong) !important;
  background: transparent !important;
}

.picker-create:active {
  background: var(--surface-1) !important;
}

.picker-icon {
  width: 48px;
  height: 48px;
  font-size: 20px;
  flex-shrink: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
}

.picker-meta {
  flex: 1;
}

.picker-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.picker-count {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.picker-already {
  font-size: 13px;
  color: var(--brand-from);
  font-weight: 600;
  background: color-mix(in srgb, var(--brand-from) 12%, transparent);
  padding: 4px 10px;
  border-radius: 20px;
}

@media (max-width: 480px) {
  .cover-stage {
    height: clamp(320px, calc(var(--page-vh) * 0.46), 520px);
    padding: calc(env(safe-area-inset-top, 0px) + 56px) 16px 0;
  }

  .immersive-panel {
    padding: 0 10px;
  }

  .track-info-row {
    padding: 8px 2px 10px;
  }

  .progress-area {
    padding-left: 18px;
    padding-right: 18px;
  }

  .track-info-row,
  .lyric-container {
    width: 100%;
  }

  .lyric-container {
    padding: 10px 16px 8px;
    border-radius: 22px;
  }

  .lyric-line.active {
    font-size: 1.28rem;
  }

  .mode-panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    padding-left: 12px;
    padding-right: 12px;
  }

  .mode-option {
    /* min-height: 114px; */
    border-radius: 20px;
    padding: 14px 8px;
  }

  .mode-option-icon {
    width: 36px;
    height: 36px;
  }

  .mode-option-label {
    font-size: 13px;
  }

  .mode-option-desc {
    font-size: 10px;
  }
}
</style>
