<template>
  <div class="search-result-panel">
    <div v-if="!searchStore.keyword" class="empty-hint page-scroll">
      <!-- <div class="empty-card">
        <p class="empty-title">找一首现在就想点开的歌</p>
        <p class="empty-subtitle">支持多平台搜索，结果页直接沿用新的沉浸视觉，不会再像以前那样生硬。</p>
      </div> -->
      <div class="hot-words">
        <span v-for="kw in hotKeywords" :key="kw" class="hot-tag" @click="quickSearch(kw)">{{ kw }}</span>
      </div>
    </div>

    <div v-else-if="searchStore.isLoading && !searchStore.results.length" class="empty-hint page-scroll">
      <div class="empty-card loading-card">
        <!-- <div class="loading-badge">搜索中</div> -->
        <p class="empty-title">正在搜索“{{ searchStore.keyword }}”</p>
        <!-- <p class="empty-subtitle">正在从已启用的平台拉取结果，请稍等片刻。</p> -->
      </div>

      <div class="loading-list">
        <div v-for="i in 5" :key="i" class="loading-row">
          <div class="loading-cover"></div>
          <div class="loading-meta">
            <div class="loading-line loading-line-title"></div>
            <div class="loading-line loading-line-sub"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!searchStore.results.length" class="empty-hint page-scroll">
      <div class="empty-card empty-result-card">
        <p class="empty-title">没有找到“{{ searchStore.keyword }}”</p>
        <p class="empty-subtitle">可以试试更短的关键词，或者切换搜索平台后再搜一次。</p>
      </div>

      <div class="hot-words">
        <span v-for="kw in hotKeywords" :key="`retry-${kw}`" class="hot-tag" @click="quickSearch(kw)">{{ kw }}</span>
      </div>
    </div>

    <van-list
      v-else
      v-model:loading="searchStore.isLoading"
      :finished="searchStore.noMore"
      finished-text="没有更多了"
      class="result-list page-scroll"
      @load="searchStore.loadMore"
    >
      <div class="result-stats">
        <span>「{{ searchStore.keyword }}」共 {{ searchStore.results.length }} 条结果</span>
      </div>

      <div v-for="track in searchStore.results" :key="track.uid" class="result-row-wrap">
        <TrackItem :track="track" :queue="searchStore.results" context-type="results" @action="openAction" />
      </div>
    </van-list>

    <TrackActionSheet v-model:show="showAction" :track="actionTrack" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSearchStore } from '@/stores/search'
import TrackItem from '@/components/TrackItem.vue'
import TrackActionSheet from '@/components/TrackActionSheet.vue'
import type { Track } from '@/types/music'

defineOptions({ name: 'SearchResultPanel' })

const props = defineProps<{
  hotKeywords: string[]
}>()

const emit = defineEmits<{
  pickKeyword: [keyword: string]
}>()

const searchStore = useSearchStore()
const showAction = ref(false)
const actionTrack = ref<Track | null>(null)

function quickSearch(keyword: string) {
  emit('pickKeyword', keyword)
}

function openAction(track: Track) {
  actionTrack.value = track
  showAction.value = true
}
</script>

<style scoped>
.search-result-panel {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  /* border-radius: 24px 24px 0 0;
  background: color-mix(in srgb, var(--bg-sheet) 88%, transparent);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(18px) saturate(130%);
  -webkit-backdrop-filter: blur(18px) saturate(130%);
  overflow: hidden; */
}

.empty-hint {
  flex: 1;
  padding: 18px 20px 40px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.empty-card {
  padding: 10px 16px;
  margin-bottom: 18px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--dominant-color) 16%, transparent) 0%, transparent 26%), rgba(255, 255, 255, 0.05);
  border: 1px solid var(--line-soft);
  box-shadow: var(--shadow-card);
}

.loading-card,
.empty-result-card {
  position: relative;
  overflow: hidden;
}

.loading-badge {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  margin-bottom: 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dominant-color) 18%, rgba(255, 255, 255, 0.08));
  color: color-mix(in srgb, var(--dominant-color) 76%, white);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.empty-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  line-height: 1.15;
  letter-spacing: -0.04em;
}

.empty-subtitle {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.hot-words {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.loading-list {
  display: grid;
  gap: 10px;
}

.loading-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.loading-cover,
.loading-line {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.16) 50%, rgba(255, 255, 255, 0.08) 75%);
  background-size: 200% 100%;
  animation: panel-shimmer 1.2s linear infinite;
}

.loading-cover {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  flex-shrink: 0;
}

.loading-meta {
  flex: 1;
  min-width: 0;
}

.loading-line {
  height: 12px;
  border-radius: 999px;
}

.loading-line-title {
  width: 58%;
  margin-bottom: 10px;
}

.loading-line-sub {
  width: 34%;
}

.hot-tag {
  padding: 10px 16px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-full);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.hot-tag:active {
  transform: scale(0.98);
  background: color-mix(in srgb, var(--dominant-color) 16%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, var(--dominant-color) 30%, var(--line-soft));
  color: color-mix(in srgb, var(--dominant-color) 78%, white);
}

.result-list {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 14px 12px calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 18px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-sheet) 18%, transparent) 0%, transparent 52%), transparent;
}

.result-stats {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  margin: 0 8px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--dominant-color) 12%, rgba(255, 255, 255, 0.04));
  border: 1px solid color-mix(in srgb, var(--dominant-color) 18%, var(--line-soft));
  border-radius: var(--radius-full);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.result-row-wrap {
  margin-bottom: 10px;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--line-soft) 86%, rgba(255, 255, 255, 0.04));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.035)), color-mix(in srgb, var(--bg-card) 92%, transparent);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.14);
  backdrop-filter: blur(18px) saturate(120%);
  -webkit-backdrop-filter: blur(18px) saturate(120%);
  overflow: hidden;
}

:deep(.van-list__finished-text),
:deep(.van-list__loading) {
  color: var(--text-secondary);
}

:global(:root[data-theme='light']) .result-row-wrap {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.9)), var(--bg-card);
  box-shadow: 0 12px 24px rgba(20, 28, 40, 0.08);
}

@keyframes panel-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
