<template>
  <van-action-sheet v-model:show="visible" class="soda-action-sheet" cancel-text="取消">
    <div class="soda-sheet-content">
      <div v-if="track" class="track-preview">
        <div class="preview-cover">
          <img v-if="track.cover" :src="track.cover" referrerpolicy="no-referrer" />
          <span v-else><Icon name="icon-music" size="20" /></span>
        </div>
        <div class="preview-meta">
          <p class="preview-title">{{ track.title }}</p>
          <p class="preview-artist">{{ track.artist }}</p>
        </div>
        <SourceBadge :source="track.source" class="preview-badge" />
      </div>

      <div class="action-list">
        <button class="action-item" :class="{ 'is-active': isFav }" @click="toggleFav">
          <span class="ai-icon">
            <Icon :name="isFav ? 'icon-like' : 'icon-like-o'" size="22" :color="isFav ? '#ff4d4f' : 'inherit'" />
          </span>
          <span class="ai-label">{{ isFav ? '取消收藏' : '加入收藏' }}</span>
        </button>

        <button class="action-item" @click="showPlaylistPicker = true">
          <span class="ai-icon"><Icon name="icon-friends-o" size="22" /></span>
          <span class="ai-label">加入歌单</span>
        </button>

        <button class="action-item" @click="download" :disabled="!track?.audioUrl">
          <span class="ai-icon"><Icon name="icon-down" size="22" /></span>
          <span class="ai-label">{{ track?.audioUrl ? '下载歌曲' : '需先播放以加载' }}</span>
        </button>

        <button class="action-item play-btn" @click="play">
          <span class="ai-icon"><Icon name="icon-play" size="22" /></span>
          <span class="ai-label">立即播放</span>
        </button>
      </div>
    </div>

    <van-popup v-model:show="showPlaylistPicker" position="bottom" round :style="{ maxHeight: '50%' }">
      <div class="playlist-picker">
        <div class="picker-header">
          <span>选择歌单</span>
          <button class="picker-close" @click="showPlaylistPicker = false">×</button>
        </div>

        <!-- 新建歌单入口 -->
        <div class="picker-item picker-create" @click="createAndAdd">
          <span class="picker-icon">＋</span>
          <div class="picker-meta">
            <p class="picker-name">新建歌单</p>
            <p class="picker-count">创建并添加到新歌单</p>
          </div>
        </div>

        <div v-if="!plStore.playlists.length" class="picker-empty">还没有歌单，点击上方新建一个吧 🎶</div>

        <div v-for="pl in plStore.playlists" :key="pl.id" class="picker-item" @click="addToPlaylist(pl.id)">
          <span class="picker-icon">🎵</span>
          <div class="picker-meta">
            <p class="picker-name">{{ pl.name }}</p>
            <p class="picker-count">{{ pl.trackUids.length }} 首</p>
          </div>
          <span v-if="pl.trackUids.includes(track?.uid ?? '')" class="already-in">✓ 已添加</span>
        </div>
      </div>
    </van-popup>
  </van-action-sheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { showToast } from 'vant'
import SourceBadge from './SourceBadge.vue'
import type { Track } from '@/types/music'

const props = defineProps<{ track: Track | null }>()
const visible = defineModel<boolean>('show')

const router = useRouter()
const player = usePlayerStore()
const plStore = usePlaylistStore()

const showPlaylistPicker = ref(false)
const showCreateDialog = ref(false)
const newPlaylistName = ref('')

const isFav = computed(() => (props.track ? plStore.isFavorited(props.track.uid) : false))

async function toggleFav() {
  if (!props.track) return
  const wasFav = isFav.value
  await plStore.toggleFavorite(props.track)
  showToast(wasFav ? '已取消收藏' : '已收藏 ❤️')
}

async function addToPlaylist(playlistId: string) {
  if (!props.track) return
  const pl = plStore.playlists.find((p) => p.id === playlistId)
  if (pl?.trackUids.includes(props.track.uid)) {
    showToast('已在歌单中')
    return
  }
  await plStore.addToPlaylist(playlistId, props.track)
  showPlaylistPicker.value = false
  visible.value = false
  showToast('已添加到歌单 🎶')
}

async function createAndAdd() {
  const name = window.prompt('请输入歌单名称')
  if (!name?.trim()) return
  const pl = await plStore.createPlaylist(name.trim())
  if (!props.track) return
  await plStore.addToPlaylist(pl.id, props.track)
  showPlaylistPicker.value = false
  visible.value = false
  showToast('已创建歌单并添加 🎶')
}

function download() {
  if (!props.track?.audioUrl) return
  const a = document.createElement('a')
  a.href = props.track.audioUrl
  a.download = `${props.track.title} - ${props.track.artist}`
  a.target = '_blank'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  visible.value = false
}

async function play() {
  if (!props.track) return
  await player.playTrack(props.track)
  visible.value = false
  router.push({ name: 'play' })
}
</script>

<style scoped>
/* Soda-style overrides for Vant ActionSheet */
:global(.soda-action-sheet) {
  background: rgba(18, 18, 20, 0.75) !important;
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
  border-top-left-radius: 28px !important;
  border-top-right-radius: 28px !important;
  color: #fff;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}
:global(.soda-action-sheet .van-action-sheet__cancel) {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.6) !important;
  font-size: 16px;
  position: relative;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 18px 0;
}
:global(.soda-action-sheet .van-action-sheet__cancel::before) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.02);
  z-index: -1;
}

.soda-sheet-content {
  padding: 24px 20px 10px;
}

.track-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 20px;
}

.preview-cover {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--dominant-color, #000) 40%, rgba(0, 0, 0, 0.5));
}

.preview-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.preview-title {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.3px;
}

.preview-artist {
  margin: 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 400;
}

.preview-badge {
  transform: scale(0.9);
  transform-origin: right top;
}

.action-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 0 0 10px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  gap: 10px;
  cursor: pointer;
  padding: 10px 0;
  border-radius: 16px;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.action-item:active {
  transform: scale(0.92);
  background: rgba(255, 255, 255, 0.06);
}

.action-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  background: transparent;
}

.ai-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  font-size: 22px;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.action-item.is-active .ai-icon {
  background: rgba(255, 77, 79, 0.15);
  border-color: rgba(255, 77, 79, 0.3);
}

.play-btn .ai-icon {
  background: linear-gradient(135deg, var(--brand-from, #1fd6ff) 0%, var(--brand-to, #00ffcc) 100%);
  color: #000;
  border: none;
  box-shadow: 0 6px 16px color-mix(in srgb, var(--brand-from, #1fd6ff) 40%, transparent);
}

.ai-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 500;
  text-align: center;
}

/* Playlist Picker Pop-up */
:deep(.van-popup) {
  background: color-mix(in srgb, var(--bg-sheet) 92%, transparent);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  color: var(--text-primary);
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
  transition: all 0.2s ease;
}
.picker-close:active {
  transform: scale(0.9);
  background: var(--surface-2);
}
.picker-create {
  border: 1px dashed var(--line-strong) !important;
  background: transparent !important;
}
.picker-create:active {
  background: var(--surface-1) !important;
}
.picker-empty {
  padding: 24px 24px;
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
  transition: all 0.2s ease;
  border-radius: 16px;
  margin: 4px 16px;
  border: 1px solid var(--line-soft);
  background: var(--surface-1);
}
.picker-item:active {
  transform: scale(0.96);
  background: var(--surface-2);
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
.already-in {
  font-size: 13px;
  color: var(--brand-from, #1fd6ff);
  font-weight: 600;
  background: rgba(31, 214, 255, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
}
</style>
