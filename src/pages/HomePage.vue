<template>
  <div class="home-page">
    <!-- 全部内容在一个滚动容器里 -->
    <div class="page-scroll-inner">
      <!-- 封面区（随页面滚动） -->
      <div class="cover-stage" :style="coverBgStyle">
        <div class="cover-top">
          <span class="cover-greeting">{{ greeting }} · {{ timeStr }}</span>
          <button class="cover-btn" @click="goSearch()">
            <Icon name="icon-search" size="20" />
          </button>
        </div>

        <!-- 均衡器（覆盖在封面底部） -->
        <div class="ecg-stage">
          <EcgWaveform :playing="isHeroPlaying" :color="ecgColor" />
        </div>

        <!-- 浮动粒子（播放时） -->
        <div v-if="isHeroPlaying" class="floating-particles">
          <div v-for="i in 8" :key="i" class="particle" :class="`p${i}`" />
        </div>

        <div class="cover-bottom">
          <div class="cover-info">
            <h1 class="cover-title">{{ heroTrack?.title || '发现音乐' }}</h1>
            <p class="cover-artist">{{ heroTrack?.artist || '为你推荐好听的歌曲' }}</p>
          </div>
          <div class="cover-actions">
            <button class="ca-btn ca-primary" @click.stop="toggleHeroPlay"><Icon :name="isHeroPlaying ? 'icon-pause' : 'icon-play'" size="18" /></button>
            <button class="ca-btn" :class="{ 'ca-fav': isHeroFav }" @click.stop="toggleFav"><Icon :name="isHeroFav ? 'icon-like' : 'icon-like-o'" size="18" /></button>
            <button class="ca-btn" @click.stop="loadRecommend(true)" :disabled="loading"><Icon name="icon-replay" size="18" :class="{ spinning: loading }" /></button>
          </div>
        </div>
      </div>

      <!-- 瀑布流区 -->
      <div class="waterfall-section">
        <!-- 区域标题 + 播放全部 -->
        <div v-if="tracks.length" class="wf-header">
          <span class="wf-header-title">推荐歌曲</span>
          <button class="wf-play-all" @click="playAll" :disabled="loading">
            <Icon name="icon-play" size="14" />
            <span>播放全部</span>
          </button>
        </div>
        <!-- 骨架 -->
        <div v-if="loading && !tracks.length" class="wf-grid">
          <div v-for="i in 6" :key="i" class="wf-sk" :class="i % 2 === 1 ? 'tall' : 'short'">
            <div class="sk-img" /><div class="sk-line w-70" /><div class="sk-line w-45" />
          </div>
        </div>

        <!-- 瀑布流 -->
        <div v-else class="wf-grid">
          <div class="wf-col">
            <div
              v-for="(track, i) in colLeft"
              :key="track.uid"
              class="wf-card"
              :class="i % 3 === 0 ? 'tall' : 'short'"
              :style="{ '--i': i }"
              @click="playTrack(track)"
            >
              <div class="wf-img">
                <img v-if="track.cover" :src="track.cover" referrerpolicy="no-referrer" loading="lazy" alt="" />
                <div v-else class="wf-img-empty"><Icon name="icon-music" size="24" /></div>
                <div v-if="loadingTrackUid === track.uid" class="wf-img-loading"><div class="loading-spinner" /></div>
              </div>
              <div class="wf-meta">
                <p class="wf-name">{{ track.title }}</p>
                <p class="wf-artist">{{ track.artist }}</p>
              </div>
            </div>
          </div>
          <div class="wf-col">
            <div
              v-for="(track, i) in colRight"
              :key="track.uid"
              class="wf-card"
              :class="i % 3 === 1 ? 'tall' : 'short'"
              :style="{ '--i': i }"
              @click="playTrack(track)"
            >
              <div class="wf-img">
                <img v-if="track.cover" :src="track.cover" referrerpolicy="no-referrer" loading="lazy" alt="" />
                <div v-else class="wf-img-empty"><Icon name="icon-music" size="24" /></div>
                <div v-if="loadingTrackUid === track.uid" class="wf-img-loading"><div class="loading-spinner" /></div>
              </div>
              <div class="wf-meta">
                <p class="wf-name">{{ track.title }}</p>
                <p class="wf-artist">{{ track.artist }}</p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="!loading && !tracks.length" class="wf-empty">点击上方刷新按钮获取推荐</div>
      </div>

      <div class="bottom-pad" />
    </div>

    <TrackActionSheet v-model:show="showAction" :track="actionTrack" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchAllSources, fetchTrackDetails } from '@/api'
import { useColorExtract } from '@/composables/useColorExtract'
import { useAppConfigStore } from '@/stores/appConfig'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { useSearchStore } from '@/stores/search'
import TrackActionSheet from '@/components/TrackActionSheet.vue'
import Icon from '@/components/Icon.vue'
import EcgWaveform from '@/components/EcgWaveform.vue'
import type { Track } from '@/types/music'
import { showToast } from 'vant'
import { dbGetHomeRecommend, dbSetHomeRecommend } from '@/utils/db'
import { getLuminance } from '@/utils/color'

defineOptions({ name: 'HomePage' })

const router = useRouter()
const appConfig = useAppConfigStore()
const player = usePlayerStore()
const plStore = usePlaylistStore()
const searchStore = useSearchStore()
const { prefetch } = useColorExtract()

const RECOMMEND_POOL = [
  '抖音热歌', '华语流行', '欧美热单', '日语歌曲', '韩语流行', '经典老歌', '轻音乐', '民谣',
  '说唱', '电子音乐', '摇滚', 'R&B', '古风', '粤语经典', '网络热歌', '治愈系',
  '动漫音乐', 'lo-fi', '爵士', '新歌推荐', '情歌对唱', '伤感情歌'
]

function pickRandom(n: number) {
  const pool = [...RECOMMEND_POOL]; const res: string[] = []
  for (let i = 0; i < Math.min(n, pool.length); i++) { const idx = Math.floor(Math.random() * pool.length); res.push(pool[idx]); pool.splice(idx, 1) }
  return res
}

const loading = ref(false)
const tracks = ref<Track[]>([])
const showAction = ref(false)
const actionTrack = ref<Track | null>(null)
const loadingTrackUid = ref<string | null>(null)
/** 上次尝试播放失败的 uid，避免重复点击同一首歌触发"双击"感 */
let lastFailedUid: string | null = null

const cacheKey = computed(() => `${appConfig.homeQueryKeyword}:${appConfig.homeQueryLimit}`)
const heroTrack = computed(() => player.currentTrack || tracks.value[0] || null)
const heroCover = computed(() => heroTrack.value?.cover || '')
const isPlaying = computed(() => !!player.currentTrack && player.isPlaying)
const isHeroPlaying = computed(() => heroTrack.value && player.currentTrack?.uid === heroTrack.value.uid && player.isPlaying)
const isHeroFav = computed(() => heroTrack.value ? plStore.isFavorited(heroTrack.value.uid) : false)
const ecgColor = computed(() => {
  const c = player.dominantColor || 'rgba(255,107,107,0.9)'
  return c.startsWith('rgb(') ? c.replace('rgb(', 'rgba(').replace(')', ', 0.85)') : 'rgba(255,107,107,0.85)'
})

// 瀑布流两列分配
const colLeft = computed(() => tracks.value.filter((_, i) => i % 2 === 0))
const colRight = computed(() => tracks.value.filter((_, i) => i % 2 === 1))

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'; if (h < 12) return '早上好'; if (h < 14) return '中午好'; if (h < 18) return '下午好'; return '晚上好'
})

const timeStr = ref(formatTimeHM())
let _timeTimer: ReturnType<typeof setInterval> | null = null
function formatTimeHM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const coverBgStyle = computed(() => {
  const color = player.dominantColor || '#ff6b6b'
  const cover = heroCover.value
  const dark = getLuminance(color) > 0.5 ? '#0c0c18' : '#080810'
  return { background: cover ? `linear-gradient(180deg, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(${cover}) center/cover no-repeat` : `linear-gradient(180deg, ${color}, ${dark})` }
})

function goSearch(kw?: string) { router.push({ name: 'search', query: kw ? { q: kw } : undefined }) }

function goToPlay() {
  if (player.currentTrack) router.push({ name: 'play' })
}

async function toggleHeroPlay() {
  if (!heroTrack.value) return
  if (player.currentTrack?.uid === heroTrack.value.uid) {
    const wasPlaying = player.isPlaying
    player.togglePlayPause()
    if (wasPlaying) showToast('已暂停')
  } else {
    await doPlayTrack(heroTrack.value)
  }
}

async function toggleFav() { if (heroTrack.value) await plStore.toggleFavorite(heroTrack.value) }

/** 统一播放逻辑：首次播放设置队列，之后只替换当前歌曲 */
async function doPlayTrack(track: Track) {
  if (!player.queue.length || player.playContext.type !== 'home') {
    // 队列为空或不是首页上下文 → 设置新队列
    await player.playTrack(track, tracks.value, { type: 'home' })
  } else {
    // 已有队列 → 只替换当前歌曲，不替换队列
    await player.playTrack(track)
  }
}

/** 播放全部：替换整个队列 */
async function playAll() {
  if (!tracks.value.length || loading.value) return
  await player.playTrack(tracks.value[0], tracks.value, { type: 'home' })
}

async function playTrack(track: Track) {
  // 如果点击的是当前正在播放的歌曲 → 跳转到详情页
  if (player.currentTrack?.uid === track.uid && player.isPlaying) {
    router.push({ name: 'play' })
    return
  }
  // 如果点击的是正在加载的同一首歌且不是失败重试，忽略
  if (loadingTrackUid.value === track.uid && lastFailedUid !== track.uid) return
  // 允许切换到新歌：取消之前的 loading 状态
  lastFailedUid = null
  loadingTrackUid.value = track.uid
  try {
    await doPlayTrack(track)
    // 检查播放是否实际成功（audioUrl 存在）
    if (player.currentTrack && !player.currentTrack.audioUrl) {
      showToast('该歌曲暂无可用音源，已从列表移除')
      lastFailedUid = track.uid
      const idx = tracks.value.findIndex(t => t.uid === track.uid)
      if (idx !== -1) tracks.value.splice(idx, 1)
    }
  } catch (err: any) {
    console.warn('[HomePage playTrack]', err)
    showToast('播放失败，已从列表移除')
    lastFailedUid = track.uid
    const idx = tracks.value.findIndex(t => t.uid === track.uid)
    if (idx !== -1) tracks.value.splice(idx, 1)
  } finally {
    // 只有当前 loading 的还是这首歌时才清除，避免清除新歌的 loading 状态
    if (loadingTrackUid.value === track.uid) loadingTrackUid.value = null
  }
}

async function loadRecommend(force = false) {
  if (loading.value) return
  if (!force && tracks.value.length) return
  loading.value = true
  try {
    const kws = pickRandom(3); const limit = Math.max(12, appConfig.homeQueryLimit)
    // 优先使用酷我和 QQ（音频链接更稳定），网易作为补充
    const allSources = searchStore.getEnabledSources()
    const primarySources = allSources.filter(s => s === 'kuwo' || s === 'qq')
    const fallbackSources = allSources.filter(s => s === 'netease')
    const sources = primarySources.length ? primarySources : fallbackSources
    const results = await Promise.all(kws.map(k => searchAllSources({ keyword: k, limit }, sources).catch(() => [] as Track[])))
    const merged: Track[] = []; const seen = new Set<string>()
    const maxLen = Math.max(0, ...results.map(r => r.length))
    for (let i = 0; i < maxLen; i++) {
      for (const arr of results) {
        const t = arr[i]
        // 严格过滤：必须有封面、有标题、有歌手
        if (t && !seen.has(t.uid) && t.cover && t.title && t.artist) {
          seen.add(t.uid); merged.push(t)
        }
      }
    }
    if (!merged.length) {
      if (!tracks.value.length) showToast('暂无推荐，请稍后重试')
      return
    }

    // 预校验：获取前 6 首的详情，只保留有可用音频链接的
    const VALIDATE_COUNT = 6
    const toValidate = merged.slice(0, VALIDATE_COUNT)
    const rest = merged.slice(VALIDATE_COUNT)
    const validated = await Promise.all(
      toValidate.map(async (t) => {
        try {
          const fresh = await fetchTrackDetails(t)
          return fresh.audioUrl ? fresh : null
        } catch { return null }
      })
    )
    const validTracks = validated.filter((t): t is Track => !!t)
    // 合并已校验 + 未校验（后台会在播放时校验）
    const finalTracks = [...validTracks, ...rest]

    if (finalTracks.length) {
      tracks.value = finalTracks
      void prefetch(finalTracks.slice(0, appConfig.colorPrefetchCount).map(t => t.cover))
      await dbSetHomeRecommend(finalTracks, cacheKey.value)
    } else if (!tracks.value.length) {
      showToast('暂无可用推荐，请稍后重试')
    }
  } catch {
    if (!tracks.value.length) showToast('加载失败，请稍后重试')
  }
  finally { loading.value = false }
}

onMounted(async () => {
  // 进入首页只恢复本地缓存，不发起网络请求；新推荐由用户点击刷新按钮触发。
  const cached = await dbGetHomeRecommend(cacheKey.value)
  if (cached?.length) {
    tracks.value = cached
    void prefetch(cached.slice(0, appConfig.colorPrefetchCount).map(t => t.cover))
  }
  // 时间更新
  _timeTimer = setInterval(() => { timeStr.value = formatTimeHM() }, 30000)
})

onUnmounted(() => {
  if (_timeTimer) { clearInterval(_timeTimer); _timeTimer = null }
})

</script>

<style scoped>
.home-page {
  height: 100%;
  overflow: hidden;
  background: var(--bg-base);
}

/* ── 滚动容器 ────────────────────────────────────────────────────────── */
.page-scroll-inner {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
}

/* ── 封面区（随页面滚动）────────────────────────────────────────────── */
.cover-stage {
  height: 65vh;
  min-height: 340px;
  position: relative;
  overflow: hidden;
  transition: background 0.8s ease;
}

.cover-top {
  position: absolute; top: 0; left: 0; right: 0; z-index: 2;
  display: flex; align-items: center; justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 20px 0;
}

.cover-greeting {
  font-size: 13px;
  color: rgba(255,255,255,0.92);
  text-shadow: 0 1px 10px rgba(0,0,0,0.6);
  font-weight: 600;
  letter-spacing: 0.5px;
}

.cover-btn {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px);
}
.cover-btn:active { transform: scale(0.92); }

/* ── 均衡器层 ──────────────────────────────────────────────────────────── */
.ecg-stage {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 35%;
  z-index: 1;
  pointer-events: none;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 30%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 30%);
}

/* ── 浮动粒子 ──────────────────────────────────────────────────────────── */
.floating-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--dominant-color, rgba(255,107,107,0.6));
  opacity: 0;
  animation: float-up linear infinite;
}
.p1 { left: 10%; animation-duration: 4.2s; animation-delay: 0s; width: 3px; height: 3px; }
.p2 { left: 22%; animation-duration: 3.8s; animation-delay: 0.5s; }
.p3 { left: 35%; animation-duration: 5.0s; animation-delay: 1.2s; width: 5px; height: 5px; }
.p4 { left: 48%; animation-duration: 3.5s; animation-delay: 0.3s; }
.p5 { left: 60%; animation-duration: 4.6s; animation-delay: 1.8s; width: 3px; height: 3px; }
.p6 { left: 72%; animation-duration: 3.2s; animation-delay: 0.8s; }
.p7 { left: 82%; animation-duration: 4.8s; animation-delay: 2.1s; width: 5px; height: 5px; }
.p8 { left: 92%; animation-duration: 3.9s; animation-delay: 1.5s; }
@keyframes float-up {
  0% { bottom: -5%; opacity: 0; }
  15% { opacity: 0.7; }
  85% { opacity: 0.4; }
  100% { bottom: 105%; opacity: 0; }
}

.cover-bottom {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
  padding: 0 24px 24px;
  display: flex; align-items: flex-end; justify-content: space-between; gap: 16px;
}

.cover-info { flex: 1; min-width: 0; }
.cover-title {
  margin: 0; font-size: 22px; font-weight: 800; color: #fff;
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cover-artist {
  margin: 4px 0 0; font-size: 14px; color: rgba(255,255,255,0.5);
  text-shadow: 0 1px 6px rgba(0,0,0,0.3);
}

.cover-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.ca-btn {
  width: 44px; height: 44px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.08);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(10px); transition: transform 0.15s ease;
}
.ca-btn:active { transform: scale(0.9); }
.ca-primary { background: var(--dominant-color, #ff6b6b); border-color: transparent; box-shadow: 0 4px 20px rgba(255,107,107,0.3); }
.ca-fav { border-color: rgba(255,77,79,0.4); background: rgba(255,77,79,0.12); color: #ff4d4f; }
.ca-btn .spinning { animation: spin 0.8s linear infinite; }

/* ── 瀑布流区 ────────────────────────────────────────────────────────── */
.waterfall-section {
  padding: 24px 16px 0;
  background: var(--bg-canvas);
  position: relative;
  z-index: 1;
  overflow: hidden;
}

/* ── 瀑布流区域标题 ─────────────────────────────────────────────────── */
.wf-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.wf-header-title {
  font-size: 16px; font-weight: 700; color: var(--text-primary);
}
.wf-play-all {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 999px;
  font-size: 13px; font-weight: 600;
  color: var(--text-primary);
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--dominant-color) 12%, var(--surface-2));
  cursor: pointer; transition: transform 0.15s ease, background 0.15s ease;
}
.wf-play-all:active { transform: scale(0.95); }
.wf-play-all:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── 两列瀑布流 ──────────────────────────────────────────────────────── */
.wf-grid {
  display: flex; gap: 10px;
  overflow: hidden;
}
.wf-col {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 10px;
}

.wf-card {
  cursor: pointer;
  border-radius: 14px; overflow: hidden;
  min-width: 0;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  animation: fadeInUp 0.4s ease both;
  animation-delay: calc(var(--i, 0) * 50ms);
  transition: transform 0.15s ease;
}
.wf-card:active { transform: scale(0.97); }

/* 高矮交替 */
.wf-card.tall .wf-img { aspect-ratio: 3/4; }
.wf-card.short .wf-img { aspect-ratio: 1; }

.wf-img {
  position: relative; width: 100%; overflow: hidden;
  background: rgba(255,255,255,0.04);
}
.wf-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.wf-img-empty {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.12);
}

.wf-meta { padding: 8px 10px 10px; }
.wf-name {
  margin: 0; font-size: 13px; font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.wf-artist {
  margin: 2px 0 0; font-size: 11px; color: var(--text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── 骨架 ────────────────────────────────────────────────────────────── */
.wf-sk {
  border-radius: 14px; overflow: hidden;
  background: rgba(255,255,255,0.03);
  padding-bottom: 10px;
}
.wf-sk.tall .sk-img { aspect-ratio: 3/4; }
.wf-sk.short .sk-img { aspect-ratio: 1; }
.sk-img {
  width: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%; animation: shimmer 1.6s infinite;
}
.sk-line {
  height: 10px; margin: 6px 10px 0; border-radius: 5px;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%; animation: shimmer 1.6s infinite;
}
.w-70 { width: 70%; }
.w-45 { width: 45%; }

.wf-empty { text-align: center; padding: 32px 0; font-size: 12px; color: var(--text-tertiary); }

.bottom-pad { height: calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 16px); }

/* ── 瀑布流 loading 遮罩 ─────────────────────────────────────────────── */
.wf-img-loading {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.5);
  z-index: 3;
}
.loading-spinner {
  width: 28px; height: 28px;
  border: 3px solid rgba(255,255,255,0.2);
  border-top-color: var(--dominant-color, #ff6b6b);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
