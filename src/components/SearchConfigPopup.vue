<template>
  <slot name="trigger" :open="open" :selected-source-text="selectedSourceText" :per-source-limit="searchStore.perSourceLimit" />

  <van-popup v-model:show="show" round position="bottom" :style="{ padding: '16px 16px 20px' }">
    <div class="config-title">搜索配置</div>

    <div class="config-block">
      <div class="config-label">搜索平台（可多选）</div>
      <div class="source-chips">
        <button
          v-for="src in AVAILABLE_SOURCES"
          :key="src"
          class="chip"
          :class="{ active: searchStore.enabledSources[src] }"
          :style="
            searchStore.enabledSources[src] ? { background: sourceColor(src) + '18', color: sourceColor(src), borderColor: sourceColor(src) } : {}
          "
          @click="toggleSource(src)"
        >
          <span class="chip-dot" :style="{ background: sourceColor(src) }" />
          {{ sourceLabel(src) }}
        </button>
      </div>
    </div>

    <div class="config-block">
      <div class="config-label">每页数量</div>
      <div class="limit-row">
        <button class="limit-btn" :class="{ active: searchStore.perSourceLimit === 8 }" @click="searchStore.perSourceLimit = 8">8条</button>
        <button class="limit-btn" :class="{ active: searchStore.perSourceLimit === 12 }" @click="searchStore.perSourceLimit = 12">12条</button>
        <button class="limit-btn" :class="{ active: searchStore.perSourceLimit === 20 }" @click="searchStore.perSourceLimit = 20">20条</button>
      </div>
    </div>
  </van-popup>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { showToast } from 'vant'
import { AVAILABLE_SOURCES, getSourceConfig } from '@/api/sources'
import { useSearchStore } from '@/stores/search'
import type { MusicSource } from '@/types/music'

defineOptions({ name: 'SearchConfigPopup' })

const searchStore = useSearchStore()
const show = ref(false)

const selectedSourceText = computed(() => {
  const list = searchStore.getEnabledSources().map((s) => getSourceConfig(s).label)
  return list.length ? list.join(' / ') : '未选择'
})

function open() {
  show.value = true
}

function sourceLabel(src: MusicSource) {
  return getSourceConfig(src).label
}

function sourceColor(src: MusicSource) {
  return getSourceConfig(src).color
}

function toggleSource(src: MusicSource) {
  const enabledCount = searchStore.getEnabledSources().length
  if (searchStore.enabledSources[src] && enabledCount <= 1) {
    showToast('至少保留一个平台')
    return
  }
  searchStore.enabledSources[src] = !searchStore.enabledSources[src]
}
</script>

<style scoped>
.config-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 14px;
  letter-spacing: -0.03em;
}

.config-block {
  margin-top: 14px;
  padding: 14px;
  border-radius: 20px;
  background: var(--dominant-tint-1);
  border: 1px solid var(--dominant-border);
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

.config-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.source-chips {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.source-chips::-webkit-scrollbar {
  display: none;
}

.chip {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-full);
  border: 1px solid var(--dominant-border);
  background: var(--dominant-tint-1);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.chip:active {
  transform: scale(0.98);
}

.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.limit-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.limit-btn {
  border: 1px solid var(--dominant-border);
  background: var(--dominant-tint-1);
  border-radius: var(--radius-full);
  padding: 8px 14px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
  transition:
    border-color 0.5s ease,
    background 0.5s ease,
    color 0.3s ease;
}

.limit-btn.active {
  border-color: var(--dominant-border-strong);
  background: var(--dominant-tint-3);
  color: var(--dominant-text);
}
</style>
