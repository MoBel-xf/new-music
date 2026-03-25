<template>
  <div class="detail-page">
    <!-- 顶部封面 Banner -->
    <div class="banner" :style="bannerStyle">
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

    <!-- 操作�?-->
    <div class="action-bar">
      <button class="play-all-btn" @click="playAll" :disabled="!tracks.length">播放全部</button>
      <button class="shuffle-btn" @click="playShuffle" :disabled="!tracks.length">
        <Icon name="icon-shuffle" />
        随机播放
      </button>
      <button v-if="isEditing" class="edit-done-btn" @click="isEditing = false">完成</button>
      <button v-else-if="mode === 'playlist'" class="edit-btn" @click="isEditing = true">编辑</button>
    </div>

    <!-- 曲目列表 -->
    <div class="track-list">
      <div v-if="!tracks.length" class="empty-tip">
        <span v-if="mode === 'favorites'">还没有收藏，快去搜索歌曲吧!❤️</span>
        <span v-else-if="mode === 'history'">播放记录为空，快去听点音乐吧 🎵</span>
        <span v-else>歌单还是空的，快去添加歌曲吧 🎶</span>
      </div>

      <div v-for="(track, i) in tracks" :key="track.uid" class="track-row-wrap">
        <!-- 编辑模式 -->
        <div v-if="isEditing" class="track-row editing">
          <van-checkbox v-model="selected" :name="track.uid" />
          <div class="track-info" @click="toggleSelect(track.uid)">
            <p class="t-title">{{ track.title }}</p>
            <p class="t-sub">{{ track.artist }} <SourceBadge :source="track.source" /></p>
          </div>
        </div>

        <!-- 正常模式：左滑删�?-->
        <van-swipe-cell v-else :disabled="mode === 'history'">
          <TrackItem
            :track="track"
            :queue="tracks"
            :context-type="mode === 'history' ? 'results' : mode"
            :context-id="playlistId"
            @action="openAction"
          />
          <template #right>
            <button class="delete-swipe" @click="removeTrack(track.uid)">
              {{ mode === 'favorites' ? '取消收藏' : '移除' }}
            </button>
          </template>
        </van-swipe-cell>
      </div>
    </div>

    <!-- 编辑底栏 -->
    <div v-if="isEditing" class="edit-bar">
      <span class="sel-count">已选择 {{ selected.length }} 首歌曲</span>
      <button class="del-sel-btn" :disabled="!selected.length" @click="deleteSelected">删除所选</button>
    </div>

    <!-- 操作菜单 -->
    <TrackActionSheet v-model:show="showAction" :track="actionTrack" />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'PlaylistDetailPage' })
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
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

// Banner 渐变
const bannerStyle = computed(() => {
  const gradMap: Record<PageMode, string> = {
    favorites: 'linear-gradient(160deg, #FF6B6B, #FF9A3C)',
    history: 'linear-gradient(160deg, #667EEA, #764BA2)',
    playlist: 'linear-gradient(160deg, #11998E, #38EF7D)'
  }
  return { background: gradMap[mode.value] }
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
</script>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
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
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--line-soft);
  border-radius: 22px;
  flex-shrink: 0;
  box-shadow: var(--shadow-card);
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
  box-shadow: 0 4px 14px rgba(255, 107, 107, 0.35);
}
.shuffle-btn {
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 600;
  padding: 9px 16px;
  border-radius: var(--radius-full);
  cursor: pointer;
}
.play-all-btn:disabled,
.shuffle-btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.edit-btn {
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.06);
  font-size: 13px;
  color: var(--text-primary);
  padding: 9px 14px;
  border-radius: var(--radius-full);
  cursor: pointer;
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

.empty-tip {
  text-align: center;
  padding: 48px 20px;
  font-size: 15px;
  color: var(--text-tertiary);
  border: 1px dashed var(--line-soft);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.04);
}

.track-row-wrap {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  margin-bottom: 10px;
  overflow: hidden;
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
  background: #ff3b30;
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
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--line-soft);
  border-radius: 22px;
  box-shadow: var(--glass-shadow);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
}
.sel-count {
  font-size: 14px;
  color: var(--text-secondary);
}
.del-sel-btn {
  border: none;
  background: #ff3b30;
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
</style>
