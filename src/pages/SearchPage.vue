<template>
  <div class="search-page dominant-surface">
    <SearchConfigPopup v-slot:trigger="{ open }">
      <div class="search-header">
        <van-search
          v-model="inputVal"
          placeholder="搜索歌曲、歌手…"
          shape="round"
          background="transparent"
          :clearable="true"
          size="small"
          right-icon="bars"
          ref="searchRef"
          @search="onSearch"
          @click-right-icon="open"
        >
          <template #left>
            <button class="back-btn" type="button" @click="goBack">
              <van-icon name="arrow-left" />
            </button>
          </template>
        </van-search>
      </div>
    </SearchConfigPopup>

    <section v-if="searchStore.historyKeywords.length" class="history-panel glass-panel">
      <div class="history-header">
        <div class="inline-flex items-center gap-2.5">
          <button class="inline-flex items-center justify-center p-0 text-primary bg-transparent border-0 cursor-pointer" type="button" @click="historyCollapsed = !historyCollapsed">
            <span class="text-sm font-bold">历史搜索</span>
          </button>
          <span class="inline-flex items-center justify-center min-w-5.5 h-5.5 px-2 rounded-full text-xs font-bold dominant-text" style="background: var(--dominant-tint-3)">{{ searchStore.historyKeywords.length }}</span>
        </div>
        <div class="inline-flex items-center gap-2.5">
          <button class="p-0 text-secondary text-xs bg-transparent border-0 cursor-pointer" type="button" @click.stop="confirmClearHistory">清空</button>
          <button class="inline-flex items-center justify-center p-0 text-secondary bg-transparent border-0 cursor-pointer" type="button" @click="historyCollapsed = !historyCollapsed">
            <van-icon :name="historyCollapsed ? 'arrow-down' : 'arrow-up'" />
          </button>
        </div>
      </div>

      <div v-show="!historyCollapsed" class="history-chips">
        <button
          v-for="(keyword, index) in searchStore.historyKeywords"
          :key="keyword"
          class="history-chip glass-card"
          :style="`--i: ${index}`"
          type="button"
          @click="selectHistory(keyword)"
        >
          <span class="overflow-hidden text-ellipsis whitespace-nowrap">{{ keyword }}</span>
          <span class="chip-remove" @click.stop="removeHistoryKeyword(keyword)">
            <van-icon name="cross" />
          </span>
        </button>
      </div>
    </section>

    <SearchResultPanel :hot-keywords="HOT_KEYWORDS" @pick-keyword="quickSearch" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showConfirmDialog } from 'vant'
import { useSearchStore } from '@/stores/search'
import SearchConfigPopup from '@/components/SearchConfigPopup.vue'
import SearchResultPanel from '@/components/SearchResultPanel.vue'

defineOptions({ name: 'SearchPage' })

const route = useRoute()
const router = useRouter()
const searchStore = useSearchStore()

const inputVal = ref(searchStore.keyword)
const searchRef = ref()
const historyCollapsed = ref(false)

const HOT_KEYWORDS = ['周杰伦', 'Taylor Swift', '轻音乐', '林俊杰', 'lo-fi', '陈奕迅', '邓紫棋', '刀郎']

function goBack() {
  if (window.history.state?.back) {
    router.back()
    return
  }

  router.replace({ name: 'home' })
}

function onSearch() {
  const keyword = inputVal.value.trim()
  if (!keyword) return

  router.replace({ name: 'search', query: { q: keyword } })
  searchStore.search(keyword)
}

function quickSearch(kw: string) {
  inputVal.value = kw
  router.replace({ name: 'search', query: { q: kw } })
  searchStore.search(kw)
}

function selectHistory(kw: string) {
  quickSearch(kw)
}

function removeHistoryKeyword(kw: string) {
  searchStore.removeHistory(kw)
}

async function confirmClearHistory() {
  try {
    await showConfirmDialog({ title: '清空历史', message: '确定清空全部搜索历史？' })
    searchStore.clearHistory()
  } catch {
    // 用户取消时不处理
  }
}

onMounted(async () => {
  const q = route.query.q as string
  if (q && q !== searchStore.keyword) {
    inputVal.value = q
    searchStore.search(q)
  } else if (!q) {
    inputVal.value = ''
    searchStore.reset()
    await nextTick()
    const input = (searchRef.value as any)?.$el?.querySelector('input')
    input?.focus()
  }
})

watch(
  () => route.query.q,
  (q) => {
    if (q && q !== searchStore.keyword) {
      inputVal.value = q as string
      searchStore.search(q as string)
      return
    }

    if (!q) {
      inputVal.value = ''
      searchStore.reset()
    }
  }
)
</script>

<style scoped>
.search-page {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  background: transparent;
}

.search-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-sheet) 92%, var(--bg-base)) 0%, var(--bg-base) 100%),
    radial-gradient(circle at top, var(--dominant-tint-2) 0%, transparent 36%);
  transition: background 0.5s ease;
}

.search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 12px;
}

.search-header .van-search {
  width: 100%;
}

.history-panel {
  margin: 0 12px 8px;
  padding: 12px;
  border: 1px solid var(--dominant-border);
  border-radius: 22px;
  background: radial-gradient(circle at top right, var(--dominant-tint-3) 0%, transparent 24%), color-mix(in srgb, var(--bg-card) 94%, transparent);
  box-shadow: var(--dominant-glow);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  transition:
    border-color 0.5s ease,
    box-shadow 0.5s ease;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.history-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.history-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 10px 12px 10px 14px;
  color: var(--text-secondary);
  background: var(--dominant-tint-1);
  border: 1px solid var(--dominant-border);
  border-radius: var(--radius-full);
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
  animation: fadeInUp 0.35s ease both;
  animation-delay: calc(var(--i, 0) * 40ms);
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  border-radius: 50%;
  background: color-mix(in srgb, var(--surface-2) 86%, transparent);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--text-primary);
  background: transparent;
  border: 0;
  cursor: pointer;
}

:deep(.van-search) {
  padding: 0;
}

:deep(.van-search__content) {
  min-height: 48px;
  height: 48px;
  padding-left: 14px;
  background: var(--bg-input) !important;
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary) 4%, transparent),
    0 8px 18px color-mix(in srgb, var(--bg-canvas) 18%, transparent);
}

:deep(.van-field__body) {
  min-height: 48px;
}

:deep(.van-field__control) {
  color: var(--text-primary);
  font-size: 15px;
}

:deep(.van-field__control::placeholder) {
  color: var(--text-secondary);
}

:deep(.van-field__left-icon) {
  color: var(--dominant-accent);
}

:deep(.van-field__right-icon) {
  color: var(--dominant-accent);
}

:deep(.van-field__clear) {
  color: var(--text-tertiary);
}

:global(:root[data-theme='light']) .history-panel {
  box-shadow: 0 12px 24px rgba(20, 28, 40, 0.08);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
