<template>
  <div class="detail-page" :class="{ 'collection-mode': isCollectionMode }">
    <template v-if="isCollectionMode">
      <div class="collection-hero" :style="heroStyle">
        <div class="hero-top">
          <button class="hero-icon-btn" @click="router.back()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div class="hero-top-right">
            <button v-if="mode === 'playlist' && !isEditing" class="hero-icon-btn" @click="isEditing = true">
              <Icon name="icon-more" size="18" />
            </button>
            <button v-if="isEditing" class="hero-edit-done-btn" @click="isEditing = false">完成</button>
            <button class="hero-icon-btn" @click="playShuffle" :disabled="!tracks.length">
              <Icon name="icon-shuffle" size="18" />
            </button>
          </div>
        </div>

        <div class="hero-main">
          <h1 class="hero-title">{{ pageTitle }}</h1>
          <p class="hero-sub">{{ pageSubText }}</p>
        </div>

        <div class="hero-actions">
          <button class="hero-play-btn" @click="playAll" :disabled="!tracks.length">
            <Icon name="icon-play" size="18" />
            <span>播放全部</span>
          </button>
          <button class="hero-shuffle-btn" @click="playShuffle" :disabled="!tracks.length">
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
        <div v-for="(track, i) in tracks" :key="track.uid" class="collection-row-wrap" :class="{ featured: i === 0 }">
          <van-swipe-cell :disabled="mode === 'history'">
            <div class="collection-row" role="button" tabindex="0" @click="isEditing ? toggleSelect(track.uid) : playTrackInList(track)">
              <van-checkbox v-if="isEditing" v-model="selected" :name="track.uid" class="collection-checkbox" @click.stop />
              <div class="collection-cover">
                <img v-if="track.cover" :src="track.cover" referrerpolicy="no-referrer" :alt="track.title" />
                <div v-else class="collection-cover-fallback">
                  <Icon name="icon-music" size="18" />
                </div>
              </div>

              <div class="collection-meta">
                <p class="collection-title">{{ track.title }}</p>
                <p class="collection-sub">{{ track.artist || '未知歌手' }}</p>
              </div>

              <div class="collection-right">
                <span class="collection-duration">{{ formatTrackTime(track.duration) }}</span>
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
        <div v-for="track in tracks" :key="track.uid" class="track-row-wrap">
          <div v-if="isEditing" class="track-row editing">
            <van-checkbox v-model="selected" :name="track.uid" />
            <div class="track-info" @click="toggleSelect(track.uid)">
              <p class="t-title">{{ track.title }}</p>
              <p class="t-sub">{{ track.artist }} <SourceBadge :source="track.source" /></p>
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

    <div v-if="isEditing" class="edit-bar">
      <span class="sel-count">已选择 {{ selected.length }} 首歌曲</span>
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
  await player.playTrack(track, [...tracks.value], getContext())
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
.detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.collection-mode {
  position: relative;
}

.collection-hero {
  position: relative;
  overflow: hidden;
  border-radius: 0 0 30px 30px;
  margin: 0 0 8px;
  padding: 14px 14px 20px;
  min-height: 232px;
  box-shadow: var(--shadow-float);
}

.collection-hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.18) 0%, rgba(0, 0, 0, 0.38) 100%);
  pointer-events: none;
}

.hero-top,
.hero-main,
.hero-actions {
  position: relative;
  z-index: 1;
}

.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.hero-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-icon-btn {
  width: 38px;
  height: 38px;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
  color: var(--text-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.hero-icon-btn:disabled {
  opacity: 0.5;
}

.hero-edit-done-btn {
  padding: 6px 14px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 700;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.collection-checkbox {
  flex-shrink: 0;
}

.hero-main {
  margin-top: 48px;
}

.hero-title {
  margin: 0;
  font-size: 52px;
  line-height: 1;
  letter-spacing: -0.04em;
  font-weight: 800;
  color: var(--text-primary);
}

.hero-sub {
  margin: 8px 0 0;
  font-size: 16px;
  color: var(--text-secondary);
}

.hero-actions {
  margin-top: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.hero-play-btn {
  flex: 1;
  border: 1px solid var(--line-strong);
  border-radius: 18px;
  padding: 15px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: color-mix(in srgb, var(--surface-3) 80%, transparent);
  color: var(--text-primary);
  font-size: 18px;
  font-weight: 700;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.hero-shuffle-btn {
  width: 70px;
  border: 1px solid var(--line-strong);
  border-radius: 18px;
  padding: 15px 0;
  background: color-mix(in srgb, var(--surface-2) 82%, transparent);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.hero-play-btn:disabled,
.hero-shuffle-btn:disabled {
  opacity: 0.5;
}

.banner {
  flex-shrink: 0;
  margin: 8px 12px 0;
  padding: 16px 16px 24px;
  position: relative;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
}
.banner::after {
  content: '';
  position: absolute;
  inset: auto -24px -48px auto;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
}
.back-btn {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  cursor: pointer;
  margin-bottom: 16px;
  backdrop-filter: blur(12px);
}
.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.banner-icon {
  width: 72px;
  height: 72px;
  font-size: 34px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.14);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}
.banner-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--text-primary);
  letter-spacing: -0.04em;
}
.banner-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 12px 0;
  padding: 12px;
  background: radial-gradient(circle at 50% 0%, var(--dominant-tint-2) 0%, transparent 50%), rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--dominant-border);
  border-radius: 22px;
  flex-shrink: 0;
  box-shadow: var(--dominant-glow);
  transition:
    border-color 0.5s ease,
    box-shadow 0.5s ease;
}
.play-all-btn {
  flex: 1;
  border: none;
  background: var(--brand-grad);
  color: var(--text-on-brand);
  font-size: 14px;
  font-weight: 700;
  padding: 10px 0;
  border-radius: var(--radius-full);
  cursor: pointer;
  box-shadow: var(--dominant-glow-strong);
}
.shuffle-btn {
  border: 1px solid var(--dominant-border);
  background: var(--dominant-tint-1);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 16px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}
.play-all-btn:disabled,
.shuffle-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.edit-btn {
  border: 1px solid var(--dominant-border);
  background: var(--dominant-tint-1);
  font-size: 13px;
  color: var(--text-primary);
  padding: 9px 14px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}
.edit-done-btn {
  border: none;
  background: var(--brand-grad);
  color: var(--text-on-brand);
  font-size: 13px;
  font-weight: 700;
  padding: 9px 16px;
  border-radius: var(--radius-full);
  cursor: pointer;
}

.track-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: transparent;
  padding: 12px 12px calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 60px);
}

.collection-list {
  padding: 0 12px calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 40px);
}

.empty-tip {
  text-align: center;
  padding: 48px 20px;
  font-size: 15px;
  color: var(--text-tertiary);
  border: 1px dashed var(--dominant-border);
  border-radius: 24px;
  background: var(--dominant-tint-1);
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

.track-row-wrap {
  background: radial-gradient(circle at 90% 20%, var(--dominant-tint-1) 0%, transparent 40%), rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--dominant-border);
  border-radius: 20px;
  margin-bottom: 10px;
  overflow: hidden;
  transition: border-color 0.5s ease;
}

.collection-row-wrap {
  border-bottom: 1px solid var(--line-soft);
}

.collection-row-wrap.featured {
  border-bottom: none;
  margin-bottom: 8px;
}

.collection-row {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 2px;
  text-align: left;
}

.collection-row-wrap.featured .collection-row {
  padding: 12px;
  border-radius: 18px;
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-2) 78%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.collection-cover {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-2);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collection-cover-fallback {
  color: var(--text-secondary);
}

.collection-meta {
  flex: 1;
  min-width: 0;
}

.collection-title {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.collection-duration {
  font-size: 14px;
  color: var(--text-secondary);
  min-width: 44px;
  text-align: right;
}

.collection-more {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-row.editing {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
  background: transparent;
}
.track-info {
  flex: 1;
  min-width: 0;
}
.t-title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}
.t-sub {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.delete-swipe {
  background: color-mix(in srgb, var(--dominant-color) 74%, rgba(0, 0, 0, 0.12));
  color: var(--text-primary);
  border: none;
  height: 100%;
  padding: 0 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.edit-bar {
  position: fixed;
  bottom: calc(var(--tabbar-height) + var(--playerbar-height) + var(--safe-bottom));
  left: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: radial-gradient(circle at 50% 0%, var(--dominant-tint-2) 0%, transparent 60%), rgba(255, 255, 255, 0.08);
  border: 1px solid var(--dominant-border);
  border-radius: 22px;
  box-shadow: var(--dominant-glow-strong);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  transition:
    border-color 0.5s ease,
    box-shadow 0.5s ease;
}
.sel-count {
  font-size: 14px;
  color: var(--text-secondary);
}
.del-sel-btn {
  border: none;
  background: color-mix(in srgb, var(--dominant-color) 74%, rgba(0, 0, 0, 0.12));
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  padding: 8px 20px;
  border-radius: var(--radius-full);
  cursor: pointer;
}
.del-sel-btn:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (max-width: 420px) {
  .hero-title {
    font-size: 44px;
  }
}
</style>
