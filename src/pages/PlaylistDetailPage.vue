<template>
  <div class="detail-page" :class="{ 'collection-mode': isCollectionMode }">
    <template v-if="isCollectionMode">
      <div class="collection-hero" :style="heroStyle">
        <div class="hero-top">
          <button class="icon-btn" @click="router.back()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="hero-top-right">
            <button v-if="mode === 'playlist' && !isEditing" class="icon-btn" @click="isEditing = true">
              <Icon name="icon-more" size="18" />
            </button>
            <button v-if="isEditing" class="pill-btn" @click="isEditing = false">完成</button>
            <button class="icon-btn" @click="playShuffle" :disabled="!tracks.length">
              <Icon name="icon-shuffle" size="18" />
            </button>
          </div>
        </div>

        <div class="hero-main">
          <h1 class="hero-title">{{ pageTitle }}</h1>
          <p class="hero-sub">{{ pageSubText }}</p>
        </div>

        <div class="hero-actions">
          <button class="hero-play-btn glass-panel" @click="playAll" :disabled="!tracks.length">
            <Icon name="icon-play" size="18" />
            <span>播放全部</span>
          </button>
          <button class="hero-shuffle-btn glass-panel" @click="playShuffle" :disabled="!tracks.length">
            <Icon name="icon-shuffle" size="18" />
          </button>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="banner" :style="playlistBannerStyle">
        <button class="back-btn" @click="router.back()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div class="banner-content">
          <div class="banner-icon">{{ pageIcon }}</div>
          <div class="banner-info">
            <h1 class="banner-title">{{ pageTitle }}</h1>
            <p class="banner-sub">{{ tracks.length }} 首歌曲</p>
          </div>
        </div>
      </div>

      <div class="action-bar">
        <button class="play-all-btn" @click="playAll" :disabled="!tracks.length">播放全部</button>
        <button class="shuffle-btn" @click="playShuffle" :disabled="!tracks.length">
          <Icon name="icon-shuffle" />
          随机播放
        </button>
        <button v-if="isEditing" class="edit-done-btn" @click="isEditing = false">完成</button>
        <button v-else-if="mode === 'playlist'" class="edit-btn" @click="isEditing = true">编辑</button>
      </div>
    </template>

    <div class="track-list" :class="{ 'collection-list': isCollectionMode }">
      <div v-if="!tracks.length" class="empty-tip">
        <span v-if="mode === 'favorites'">还没有收藏，快去搜索歌曲吧!❤️</span>
        <span v-else-if="mode === 'history'">播放记录为空，快去听点音乐吧 🎵</span>
        <span v-else>歌单还是空的，快去添加歌曲吧 🎶</span>
      </div>

      <template v-else-if="isCollectionMode">
        <div
          v-for="(track, i) in tracks"
          :key="track.uid"
          class="collection-row-wrap"
          :class="{ featured: i === 0 }"
          :style="{ '--i': i }"
        >
          <van-swipe-cell :disabled="mode === 'history'">
            <div
              class="collection-row"
              :class="{ 'glass-card': i === 0 }"
              role="button"
              tabindex="0"
              @click="isEditing ? toggleSelect(track.uid) : playTrackInList(track)"
            >
              <van-checkbox v-if="isEditing" v-model="selected" :name="track.uid" class="collection-checkbox" @click.stop />
              <div class="collection-cover">
                <img v-if="track.cover" :src="track.cover" referrerpolicy="no-referrer" :alt="track.title" />
                <div v-else class="collection-cover-fallback dominant-surface">
                  <Icon name="icon-music" size="18" />
                </div>
              </div>

              <div class="collection-meta">
                <p class="collection-title text-primary">{{ track.title }}</p>
                <p class="collection-sub text-secondary">{{ track.artist || '未知歌手' }}</p>
              </div>

              <div class="collection-right">
                <span class="collection-duration text-secondary">{{ formatTrackTime(track.duration) }}</span>
                <button class="collection-more" type="button" @click.stop="openAction(track)">
                  <Icon name="icon-more" size="16" />
                </button>
              </div>
            </div>
            <template #right>
              <button class="delete-swipe" @click="removeTrack(track.uid)">
                {{ mode === 'favorites' ? '取消收藏' : '移除' }}
              </button>
            </template>
          </van-swipe-cell>
        </div>
      </template>

      <template v-else>
        <div v-for="(track, i) in tracks" :key="track.uid" class="track-row-wrap" :style="{ '--i': i }">
          <div v-if="isEditing" class="track-row editing">
            <van-checkbox v-model="selected" :name="track.uid" />
            <div class="track-info" @click="toggleSelect(track.uid)">
              <p class="t-title text-primary">{{ track.title }}</p>
              <p class="t-sub text-secondary"><SourceBadge :source="track.source" /></p>
            </div>
          </div>

          <van-swipe-cell v-else :disabled="mode === 'history'">
            <TrackItem
              :track="track"
              :queue="tracks"
              :context-type="mode === 'history' ? 'results' : mode"
              :context-id="playlistId"
              @action="openAction"
            />
            <template #right>
              <button class="delete-swipe" @click="removeTrack(track.uid)">移除</button>
            </template>
          </van-swipe-cell>
        </div>
      </template>
    </div>

    <div v-if="isEditing" class="edit-bar glass-panel">
      <span class="sel-count text-secondary">已选择 {{ selected.length }} 首歌曲</span>
      <button class="del-sel-btn" :disabled="!selected.length" @click="deleteSelected">删除所选</button>
    </div>

    <TrackActionSheet v-model:show="showAction" :track="actionTrack" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PlaylistDetailPage' })
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { formatTime } from '@/utils/format'
import Icon from '@/components/Icon.vue'
import TrackItem from '@/components/TrackItem.vue'
import SourceBadge from '@/components/SourceBadge.vue'
import TrackActionSheet from '@/components/TrackActionSheet.vue'
import { showConfirmDialog, showToast } from 'vant'
import type { Track } from '@/types/music'

type PageMode = 'playlist' | 'favorites' | 'history'

const props = defineProps<{ mode?: PageMode }>()
const router = useRouter()
const route = useRoute()
const player = usePlayerStore()
const plStore = usePlaylistStore()

const mode = computed<PageMode>(() => props.mode ?? (route.params.id ? 'playlist' : 'favorites'))
const playlistId = computed(() => route.params.id as string | undefined)
const isCollectionMode = computed(() => true)

// 数据源
const tracks = computed<Track[]>(() => {
  if (mode.value === 'favorites') return plStore.favorites
  if (mode.value === 'history') return plStore.history
  if (playlistId.value) return plStore.getPlaylistTracks(playlistId.value)
  return []
})

const playlist = computed(() => (playlistId.value ? plStore.playlists.find((p) => p.id === playlistId.value) : null))

const pageTitle = computed(() => {
  if (mode.value === 'favorites') return '我的收藏'
  if (mode.value === 'history') return '播放历史'
  return playlist.value?.name ?? '歌单'
})

const pageIcon = computed(() => {
  if (mode.value === 'favorites') return '❤️'
  if (mode.value === 'history') return '🕒'
  return '🎵'
})

const pageSubText = computed(() => {
  if (mode.value === 'favorites') return 'Created by XF Music'
  if (mode.value === 'history') return '最近播放清单'
  return `${tracks.value.length} 首歌曲`
})

const heroCover = computed(() => tracks.value[0]?.cover || '')

const heroStyle = computed(() => {
  const bgLayers = [
    'linear-gradient(165deg, color-mix(in srgb, var(--dominant-color) 30%, transparent) 0%, color-mix(in srgb, var(--bg-base) 88%, transparent) 100%)',
    'radial-gradient(circle at 20% 10%, var(--dominant-tint-3) 0%, transparent 58%)'
  ]
  if (heroCover.value) {
    bgLayers.push(`url("${heroCover.value}")`)
  }
  return {
    backgroundImage: bgLayers.join(', '),
    backgroundSize: heroCover.value ? 'cover, cover, cover' : 'cover, cover',
    backgroundPosition: heroCover.value ? 'center, center, center' : 'center, center'
  }
})

const playlistBannerStyle = computed(() => {
  return {
    background:
      'linear-gradient(160deg, color-mix(in srgb, var(--dominant-color) 68%, black), color-mix(in srgb, var(--dominant-color) 52%, var(--brand-to)))'
  }
})

// 编辑模式
const isEditing = ref(false)
const selected = ref<string[]>([])

function toggleSelect(uid: string) {
  const idx = selected.value.indexOf(uid)
  idx === -1 ? selected.value.push(uid) : selected.value.splice(idx, 1)
}

async function deleteSelected() {
  if (!selected.value.length) return
  await showConfirmDialog({ title: '确认删除', message: `删除 ${selected.value.length} 首歌曲？` })
  for (const uid of selected.value) {
    await removeTrack(uid)
  }
  selected.value = []
  showToast('已删除')
}

// 播放
function getContext() {
  return {
    type: mode.value === 'history' ? ('results' as const) : mode.value,
    playlistId: playlistId.value
  }
}

async function playAll() {
  if (!tracks.value.length) return
  await player.playTrack(tracks.value[0], [...tracks.value], getContext())
  router.push({ name: 'play' })
}

async function playShuffle() {
  if (!tracks.value.length) return
  player.setPlayMode('shuffle')
  const shuffled = [...tracks.value].sort(() => Math.random() - 0.5)
  await player.playTrack(shuffled[0], shuffled, getContext())
  router.push({ name: 'play' })
}

async function playTrackInList(track: Track) {
  const ctx = getContext()
  // 统一播放逻辑：首次播放设置队列，之后只替换当前歌曲
  if (!player.queue.length || player.playContext.type !== ctx.type || player.playContext.playlistId !== ctx.playlistId) {
    await player.playTrack(track, [...tracks.value], ctx)
  } else {
    await player.playTrack(track)
  }
}

function formatTrackTime(sec?: number) {
  if (!sec || sec <= 0) return ''
  return formatTime(sec)
}

// 删除
async function removeTrack(uid: string) {
  if (mode.value === 'favorites') {
    const track = plStore.favorites.find((t) => t.uid === uid)
    if (track) await plStore.toggleFavorite(track)
  } else if (mode.value === 'playlist' && playlistId.value) {
    await plStore.removeFromPlaylist(playlistId.value, uid)
  }
}

// 操作菜单
const showAction = ref(false)
const actionTrack = ref<Track | null>(null)

function openAction(track: Track) {
  actionTrack.value = track
  showAction.value = true
}

// 进入页面时自动刷新过期的音频链接
onMounted(() => {
  if (mode.value === 'favorites') {
    plStore.refreshExpiredTracks('favorites')
  } else if (mode.value === 'history') {
    plStore.refreshExpiredTracks('history')
  } else if (playlistId.value) {
    plStore.refreshExpiredTracks('playlist', playlistId.value)
  }
})
</script>

<style scoped>
/* ── Base layout ── */
.detail-page {
  @apply flex flex-col h-full;
  background: transparent;
}

.collection-mode {
  @apply relative;
}

/* ── Fade-in-up stagger animation ── */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.collection-row-wrap,
.track-row-wrap {
  animation: fadeInUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--i, 0) * 38ms);
}

/* ── Hero section ── */
.collection-hero {
  @apply relative overflow-hidden rounded-b-[30px] mx-0 mb-2 px-3.5 pb-5;
  min-height: 232px;
  box-shadow: var(--shadow-float);
}

.collection-hero::after {
  content: '';
  @apply absolute inset-0 pointer-events-none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.38) 100%);
}

.hero-top,
.hero-main,
.hero-actions {
  @apply relative z-1;
}

.hero-top {
  @apply flex items-center justify-between;
}

.hero-top-right {
  @apply flex items-center gap-2;
}

/* Glass-morphism icon buttons for hero */
.icon-btn {
  @apply w-[38px] h-[38px] rounded-full flex items-center justify-center text-primary;
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-2) 75%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.icon-btn:disabled {
  @apply opacity-50;
}

/* Glass pill button */
.pill-btn {
  @apply px-3.5 py-1.5 rounded-full text-[13px] font-bold text-primary;
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.collection-checkbox {
  @apply shrink-0;
}

.hero-main {
  @apply mt-12;
}

.hero-title {
  @apply m-0 text-[52px] leading-none tracking-tight font-extrabold text-primary;
  letter-spacing: -0.04em;
}

.hero-sub {
  @apply mt-2 text-base text-secondary;
}

.hero-actions {
  @apply mt-[18px] flex items-center gap-2.5;
}

/* Glass-morphism play / shuffle buttons */
.hero-play-btn {
  @apply flex-1 flex items-center justify-center gap-2 py-[15px] px-3 text-lg font-bold text-primary rounded-[18px];
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.hero-shuffle-btn {
  @apply w-[70px] flex items-center justify-center py-[15px] text-primary rounded-[18px];
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-2) 82%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.hero-play-btn:disabled,
.hero-shuffle-btn:disabled {
  @apply opacity-50;
}

/* ── Non-collection banner (kept as-is) ── */
.banner {
  @apply shrink-0 relative overflow-hidden rounded-[30px] mx-3 mt-2 px-4 pb-6 pt-4;
  box-shadow: var(--shadow-card);
}

.banner::after {
  content: '';
  @apply absolute rounded-full;
  inset: auto -24px -48px auto;
  width: 120px;
  height: 120px;
  background: rgba(255, 255, 255, 0.14);
}

.back-btn {
  @apply w-[38px] h-[38px] rounded-full flex items-center justify-center text-primary mb-4 cursor-pointer;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(12px);
}

.banner-content {
  @apply flex items-center gap-4;
}

.banner-icon {
  @apply w-[72px] h-[72px] text-[34px] rounded-[22px] flex items-center justify-center;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.banner-title {
  @apply m-0 text-[26px] font-extrabold text-primary;
  letter-spacing: -0.04em;
}

.banner-sub {
  @apply mt-1.5 text-[13px];
  color: rgba(255, 255, 255, 0.82);
}

/* ── Action bar (non-collection) ── */
.action-bar {
  @apply flex items-center gap-2.5 mx-3 mt-3 px-3 py-3 shrink-0;
  background: radial-gradient(circle at 50% 0%, var(--dominant-tint-2) 0%, transparent 50%), rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--dominant-border);
  border-radius: 22px;
  box-shadow: var(--dominant-glow);
  transition: border-color 0.5s ease, box-shadow 0.5s ease;
}

.play-all-btn {
  @apply flex-1 border-none text-sm font-bold py-2.5 text-on-brand cursor-pointer;
  background: var(--brand-grad);
  border-radius: var(--radius-full);
  box-shadow: var(--dominant-glow-strong);
}

.shuffle-btn {
  @apply text-[13px] font-semibold py-[9px] px-4 cursor-pointer;
  border: 1px solid var(--dominant-border);
  background: var(--dominant-tint-1);
  color: var(--text-primary);
  border-radius: var(--radius-full);
  transition: border-color 0.5s ease, background 0.5s ease;
}

.play-all-btn:disabled,
.shuffle-btn:disabled {
  @apply opacity-50 cursor-default;
}

.edit-btn {
  @apply text-[13px] text-primary py-[9px] px-3.5 cursor-pointer;
  border: 1px solid var(--dominant-border);
  background: var(--dominant-tint-1);
  border-radius: var(--radius-full);
  transition: border-color 0.5s ease, background 0.5s ease;
}

.edit-done-btn {
  @apply border-none text-[13px] font-bold py-[9px] px-4 text-on-brand cursor-pointer;
  background: var(--brand-grad);
  border-radius: var(--radius-full);
}

/* ── Track list ── */
.track-list {
  @apply flex-1 overflow-y-auto;
  -webkit-overflow-scrolling: touch;
  background: transparent;
  padding: 12px 12px calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 60px);
}

.collection-list {
  padding: 0 12px calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 40px);
}

.empty-tip {
  @apply text-center py-12 px-5 text-[15px] text-tertiary;
  border: 1px dashed var(--dominant-border);
  border-radius: 24px;
  background: var(--dominant-tint-1);
  transition: border-color 0.5s ease, background 0.5s ease;
}

/* Glass-morphism track rows */
.track-row-wrap {
  @apply rounded-[20px] mb-2.5 overflow-hidden;
  background: radial-gradient(circle at 90% 20%, var(--dominant-tint-1) 0%, transparent 40%), rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--dominant-border);
  transition: border-color 0.5s ease;
}

/* ── Collection rows ── */
.collection-row-wrap {
  @apply border-b border-solid;
  border-color: var(--line-soft);
}

.collection-row-wrap.featured {
  @apply border-b-0 mb-2;
}

.collection-row {
  @apply w-full flex items-center gap-3 py-3 px-0.5 text-left;
  border: none;
  background: transparent;
  color: inherit;
}

.collection-row-wrap.featured .collection-row {
  @apply p-3 rounded-[18px];
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-2) 78%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.collection-cover {
  @apply w-14 h-14 rounded-xl overflow-hidden shrink-0 flex items-center justify-center;
  background: var(--surface-2);
}

.collection-cover img {
  @apply w-full h-full object-cover;
}

.collection-cover-fallback {
  @apply text-secondary;
}

.collection-meta {
  @apply flex-1 min-w-0;
}

.collection-title {
  @apply m-0 text-base font-semibold text-primary whitespace-nowrap overflow-hidden text-ellipsis;
}

.collection-sub {
  @apply mt-1 text-[13px] text-secondary whitespace-nowrap overflow-hidden text-ellipsis;
}

.collection-right {
  @apply flex items-center gap-1.5;
}

.collection-duration {
  @apply text-sm text-secondary min-w-[44px] text-right;
}

.collection-more {
  @apply w-[26px] h-[26px] border-none rounded-full flex items-center justify-center text-secondary;
  background: transparent;
}

/* ── Edit mode rows ── */
.track-row.editing {
  @apply flex items-center py-2.5 px-4 gap-3;
  background: transparent;
}

.track-info {
  @apply flex-1 min-w-0;
}

.t-title {
  @apply m-0 text-sm font-medium text-primary;
}

.t-sub {
  @apply mt-[3px] text-xs text-secondary flex items-center gap-1.5;
}

/* ── Swipe delete ── */
.delete-swipe {
  @apply border-none h-full py-0 px-5 text-[13px] font-semibold text-primary cursor-pointer;
  background: color-mix(in srgb, var(--dominant-color) 74%, rgba(0, 0, 0, 0.12));
}

/* ── Glass-morphism edit bar ── */
.edit-bar {
  @apply fixed flex items-center justify-between py-3 px-5;
  bottom: calc(var(--tabbar-height) + var(--playerbar-height) + var(--safe-bottom));
  left: 12px;
  right: 12px;
  background: radial-gradient(circle at 50% 0%, var(--dominant-tint-2) 0%, transparent 60%), rgba(255, 255, 255, 0.08);
  border: 1px solid var(--dominant-border);
  border-radius: 22px;
  box-shadow: var(--dominant-glow-strong);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  transition: border-color 0.5s ease, box-shadow 0.5s ease;
}

.sel-count {
  @apply text-sm text-secondary;
}

.del-sel-btn {
  @apply border-none text-sm font-semibold py-2 px-5 text-primary cursor-pointer;
  background: color-mix(in srgb, var(--dominant-color) 74%, rgba(0, 0, 0, 0.12));
  border-radius: var(--radius-full);
}

.del-sel-btn:disabled {
  @apply opacity-40 cursor-default;
}

@media (max-width: 420px) {
  .hero-title {
    @apply text-[44px];
  }
}
</style>
