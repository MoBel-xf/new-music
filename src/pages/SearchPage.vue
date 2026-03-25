<template>
  <div class="search-page">
    <SearchConfigPopup v-slot:trigger="{ open, selectedSourceText, perSourceLimit }">
      <div class="search-header">
        <van-search
          v-model="inputVal"
          placeholder="搜索歌曲、歌手…"
          shape="round"
          background="transparent"
          :clearable="true"
          show-action
          size="small"
          @search="onSearch"
          @focus="onInputFocus"
          @blur="onInputBlur"
          ref="searchRef"
        >
          <template #left>
            <div class="list-icon" @click="open">
              <van-icon name="bars"></van-icon>
            </div>
          </template>
          <template #action>
            <div class="search-actions" @mousedown="holdActionState" @touchstart.passive="holdActionState">
              <span class="search-action-btn" @click="onActionClick">{{ focused ? '搜索' : '取消' }}</span>
            </div>
          </template>
        </van-search>

        <!-- <div v-show="!focused" class="search-config-summary" @click="open">
          <span class="summary-label">当前平台：</span>
          <span class="summary-value">{{ selectedSourceText }}</span>
          <span class="summary-sep">·</span>
          <span class="summary-label">每页：</span>
          <span class="summary-value">{{ perSourceLimit }} 条</span>
        </div> -->
      </div>
    </SearchConfigPopup>

    <SearchResultPanel :hot-keywords="HOT_KEYWORDS" @pick-keyword="quickSearch" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSearchStore } from '@/stores/search'
import SearchConfigPopup from '@/components/SearchConfigPopup.vue'
import SearchResultPanel from '@/components/SearchResultPanel.vue'

defineOptions({ name: 'SearchPage' })

const route = useRoute()
const router = useRouter()
const searchStore = useSearchStore()

const inputVal = ref(searchStore.keyword)
const focused = ref(false)
const searchRef = ref()
let blurTimer: ReturnType<typeof setTimeout> | null = null

const HOT_KEYWORDS = ['周杰伦', 'Taylor Swift', '轻音乐', '林俊杰', 'lo-fi', '陈奕迅', '邓紫棋', '刀郎']

function clearBlurTimer() {
  if (!blurTimer) return
  clearTimeout(blurTimer)
  blurTimer = null
}

function onInputFocus() {
  clearBlurTimer()
  focused.value = true
}

function onInputBlur() {
  clearBlurTimer()
  blurTimer = setTimeout(() => {
    focused.value = false
  }, 120)
}

function holdActionState() {
  clearBlurTimer()
}

function onActionClick() {
  if (focused.value) {
    onSearch()
    return
  }
  cancelSearch()
}

function onSearch() {
  const keyword = inputVal.value.trim()
  if (!keyword) return
  router.replace({ name: 'search', query: { q: keyword } })
  searchStore.search(keyword)
}

function cancelSearch() {
  inputVal.value = ''
  searchStore.reset()
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.replace({ name: 'home' })
}

function quickSearch(kw: string) {
  inputVal.value = kw
  router.replace({ name: 'search', query: { q: kw } })
  searchStore.search(kw)
}

// 进入搜索页处理
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

// 路由 query 变化时重新搜索（如从首页多次点击不同热词）
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

onMounted(() => {
  clearBlurTimer()
})
</script>

<style scoped>
.search-page {
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100%;
  background: var(--bg-base);
}

.search-page::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-sheet) 92%, var(--bg-base)) 0%, var(--bg-base) 100%),
    radial-gradient(circle at top, color-mix(in srgb, var(--brand-from) 8%, transparent) 0%, transparent 28%);
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
.list-icon {
  width: 30px;
  text-align: center;
}

.search-config-summary {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px 0;
  font-size: 12px;
  color: var(--text-secondary);
  background: transparent;
  user-select: none;
}

.search-actions {
  display: inline-flex;
  align-items: center;
}

.search-action-btn {
  display: inline-flex;
  align-items: center;
  min-width: 32px;
  font-size: 14px;
  font-weight: 600;
  color: color-mix(in srgb, var(--dominant-color) 78%, white);
  cursor: pointer;
}

.summary-label {
  color: var(--text-tertiary);
}

.summary-value {
  color: var(--text-primary);
}

.summary-sep {
  margin: 0 4px;
  color: var(--text-tertiary);
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
  color: color-mix(in srgb, var(--dominant-color) 72%, white);
}

:deep(.van-field__clear) {
  color: var(--text-tertiary);
}

:deep(.van-search__action) {
  padding-left: 8px;
}
</style>
