<template>
  <!-- v-long-press="onLongPress" -->
  <div class="track-item" :class="{ active: isActive }" @click="onSwitch">
    <!-- 封面：点击跳转播放页 -->
    <div class="cover-wrap" @click.stop="onPlayAndGo">
      <img
        v-if="track.cover"
        :src="track.cover"
        referrerpolicy="no-referrer"
        class="cover-img"
        :class="{ spinning: isActive && player.isPlaying }"
        @error="onImgError"
      />
      <div v-else class="cover-placeholder"><Icon name="icon-music" size="22" /></div>
      <!-- 播放指示 -->
      <div v-if="isActive" class="playing-overlay">
        <span class="playing-dot" v-for="i in 3" :key="i" :style="{ animationDelay: `${i * 0.15}s` }" />
      </div>
    </div>

    <!-- 信息 -->
    <div class="track-meta">
      <p class="title" :class="{ 'title-active': isActive }">{{ track.title }}</p>
      <div class="sub">
        <span class="artist">{{ track.artist || '未知歌手' }}</span>
        <SourceBadge :source="track.source" />
        <span v-if="track.qualityLabel" class="quality-badge">{{ track.qualityLabel }}</span>
      </div>
    </div>

    <!-- 右侧操作 -->
    <div class="track-right" @click.stop="onLongPress">
      <van-loading v-if="isLoading" size="18px" color="#FF6B6B" />
      <!-- <button v-else class="more-btn">⋯</button> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import SourceBadge from './SourceBadge.vue'
import Icon from '@/components/Icon.vue'
import type { Track } from '@/types/music'

const props = defineProps<{
  track: Track
  queue?: Track[]
  contextType?: string
  contextId?: string
}>()

const emit = defineEmits<{ (e: 'action', track: Track): void }>()

const router = useRouter()
const player = usePlayerStore()

const isActive = computed(() => player.currentTrack?.uid === props.track.uid)
const isLoading = computed(() => isActive.value && player.isLoadingDetails)

function onImgError(e: Event) {
  ;(e.target as HTMLImageElement).style.display = 'none'
}

// 播放歌曲（不跳转）
async function playTrackOnly() {
  const contextType = (props.contextType as any) ?? 'results'
  if (contextType === 'results') {
    await player.insertAndPlay(props.track)
  } else {
    const q = props.queue ?? [props.track]
    await player.playTrack(props.track, q, {
      type: contextType,
      playlistId: props.contextId
    })
  }
}

// 点击卡片非封面区域：仅切歌
async function onSwitch() {
  await playTrackOnly()
}

// 点击封面：切歌 + 跳转播放页
async function onPlayAndGo() {
  await playTrackOnly()
  router.push({ name: 'play' })
}

function onLongPress() {
  emit('action', props.track)
}
</script>

<style scoped>
.track-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-radius: var(--radius-md);
  user-select: none;
}
.track-item:active {
  background: var(--surface-1);
}
.track-item.active {
  background: var(--dominant-tint-3);
}

.cover-wrap {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-active);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-img.spinning {
  animation: spin 8s linear infinite;
}
.cover-placeholder {
  font-size: 22px;
}

.playing-overlay {
  position: absolute;
  inset: 0;
  background: var(--dominant-muted);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  padding-bottom: 6px;
}
.playing-dot {
  width: 3px;
  background: var(--text-primary);
  border-radius: 2px;
  animation: wave 0.8s ease-in-out infinite alternate;
}
.playing-dot:nth-child(1) {
  height: 8px;
}
.playing-dot:nth-child(2) {
  height: 14px;
}
.playing-dot:nth-child(3) {
  height: 8px;
}

.track-meta {
  flex: 1;
  min-width: 0;
}
.title {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.title-active {
  color: var(--dominant-text);
  font-weight: 700;
}
.sub {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  flex-wrap: wrap;
}
.artist {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}
.quality-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: var(--radius-full);
  background: rgba(101, 220, 180, 0.15);
  color: #73f0bb;
}
.track-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.more-btn {
  border: none;
  background: none;
  font-size: 20px;
  color: var(--text-tertiary);
  cursor: pointer;
  padding: 4px 2px;
  line-height: 1;
}
</style>
