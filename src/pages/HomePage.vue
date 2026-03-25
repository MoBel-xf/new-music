<template>
  <div class="home-page">
    <!-- 头部搜索 -->
    <div class="search-shell">
      <div class="top-bar">
        <van-search
          :model-value="searchStore.keyword"
          class="home-search"
          placeholder="搜索歌曲、歌手…"
          shape="round"
          background="transparent"
          readonly
          :clearable="false"
          @click="goToSearchPage()"
          @focus="goToSearchPage()"
        />
      </div>
    </div>

    <!-- 滚动区域 -->
    <van-pull-refresh v-model="refreshing" :head-height="88" @refresh="onRefresh">
      <div class="home-scroll">
        <!-- 热门搜索 -->
        <section class="section">
          <div class="section-title">热门搜索</div>
          <div class="keyword-scroll">
            <span v-for="kw in HOT_KEYWORDS" :key="kw" class="keyword-tag" @click="goToSearchPage(kw)">{{ kw }}</span>
          </div>
        </section>

        <!-- 猜你喜欢 -->
        <section class="section">
          <div class="section-header">
            <span class="section-title">猜你喜欢</span>
            <button class="refresh-btn" @click="() => loadRecommend(true)" :disabled="loadingRecommend || refreshing">
              <span :class="{ spinning: loadingRecommend }"><Icon name="icon-replay" /></span>
            </button>
          </div>

          <!-- 骨架屏 -->
          <template v-if="loadingRecommend">
            <div v-for="i in 6" :key="i" class="skeleton-item">
              <div class="sk-cover" />
              <div class="sk-info">
                <div class="sk-line sk-title" />
                <div class="sk-line sk-sub" />
              </div>
            </div>
          </template>

          <template v-else>
            <!-- 封装为与歌单列表相同的独立包裹层 -->
            <div v-for="track in recommendTracks" :key="track.uid" class="track-row-wrap">
              <TrackItem :track="track" :queue="recommendTracks" context-type="home" @action="openAction" />
            </div>
            <div v-if="!recommendTracks.length" class="empty-tip">下拉刷新试试 <Icon name="icon-music" size="16" /></div>
          </template>
        </section>

        <div class="bottom-pad" />
      </div>
    </van-pull-refresh>
    <van-back-top target=".home-scroll" :bottom="300"> </van-back-top>
    <TrackActionSheet v-model:show="showAction" :track="actionTrack" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { searchAllSources } from '@/api'
import { useSearchStore } from '@/stores/search'
import TrackItem from '@/components/TrackItem.vue'
import TrackActionSheet from '@/components/TrackActionSheet.vue'
import Icon from '@/components/Icon.vue'
import type { Track } from '@/types/music'
import { dbGetHomeRecommend, dbSetHomeRecommend } from '@/utils/db'

defineOptions({ name: 'HomePage' })

const router = useRouter()
const searchStore = useSearchStore()

const HOT_KEYWORDS = ['周杰伦', 'Taylor Swift', '轻音乐', '林俊杰', '邓紫棋', 'lo-fi', '陈奕迅', '五月天', 'Billie Eilish', '刀郎']

const refreshing = ref(false)
const loadingRecommend = ref(false)
const recommendTracks = ref<Track[]>([])
const showAction = ref(false)
const actionTrack = ref<Track | null>(null)

function goToSearchPage(keyword?: string) {
  router.push({
    name: 'search',
    query: keyword ? { q: keyword } : undefined
  })
}

async function loadRecommend(force = false) {
  if (loadingRecommend.value) return
  if (!force && recommendTracks.value.length) return
  loadingRecommend.value = true
  const kw = HOT_KEYWORDS[Math.floor(Math.random() * HOT_KEYWORDS.length)]
  try {
    const tracks = await searchAllSources({ keyword: kw, limit: searchStore.perSourceLimit }, searchStore.getEnabledSources())
    recommendTracks.value = tracks
    await dbSetHomeRecommend(tracks)
  } catch {
    recommendTracks.value = []
  } finally {
    loadingRecommend.value = false
  }
}

async function onRefresh() {
  await loadRecommend(true)
  refreshing.value = false
}

function openAction(track: Track) {
  actionTrack.value = track
  showAction.value = true
}

onMounted(async () => {
  const cached = await dbGetHomeRecommend()
  if (cached?.length) {
    recommendTracks.value = cached
    return
  }
  loadRecommend()
})
</script>

<style scoped>
.home-page {
  --home-search-shell-height: calc(env(safe-area-inset-top, 0px) + 78px);
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.top-bar {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 6px 12px 8px;
  margin: 0 10px;
  flex-shrink: 0;
}

.search-shell {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: calc(env(safe-area-inset-top, 0px) + 4px);
  background: color-mix(in srgb, var(--bg-sheet) 74%, transparent);
  border-bottom: 1px solid rgba(255, 255, 255, 0.035);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(26px) saturate(145%);
  -webkit-backdrop-filter: blur(26px) saturate(145%);
}

.home-search {
  padding: 0;
}

.home-search :deep(.van-search__content) {
  min-height: 52px;
  border-radius: 17px;
  padding-left: 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.04);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.035),
    0 4px 12px rgba(0, 0, 0, 0.05);
}

.home-search :deep(.van-field__body) {
  min-height: 52px;
}

.home-search :deep(.van-field__control) {
  font-size: 15px;
}

/* ── 滚动区 ─────────────────────────────────────────────────────────────── */
.home-scroll {
  flex: 1;
  overflow-y: auto !important;
  height: 100%;
  -webkit-overflow-scrolling: touch;
  padding-top: calc(var(--home-search-shell-height) + 6px);
  padding-bottom: calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 28px);
  background: transparent;
}

/* ── 样式对齐 PlaylistDetailPage Banner ───────────────────────────────── */
.banner {
  flex-shrink: 0;
  margin: 6px 16px 0;
  padding: 24px 20px;
  position: relative;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: linear-gradient(160deg, #ff758c, #ff7eb3);
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
.banner-content {
  display: flex;
  align-items: center;
  gap: 16px;
  position: relative;
  z-index: 1;
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
  flex-shrink: 0;
}
.banner-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.04em;
}
.banner-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.82);
}

.section {
  padding: 20px 16px 0;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.section-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 12px;
  letter-spacing: -0.03em;
}
.section-header .section-title {
  margin-bottom: 0;
}

.refresh-btn {
  width: 38px;
  height: 38px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  color: var(--text-secondary);
}
.refresh-btn .spinning {
  display: inline-block;
  animation: spin 1s linear infinite;
}

.keyword-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.keyword-scroll::-webkit-scrollbar {
  display: none;
}

.keyword-tag {
  flex-shrink: 0;
  padding: 9px 16px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
  user-select: none;
}
.keyword-tag:active {
  transform: scale(0.98);
  background: color-mix(in srgb, var(--dominant-color) 18%, rgba(255, 255, 255, 0.06));
  border-color: color-mix(in srgb, var(--dominant-color) 32%, var(--line-soft));
  color: color-mix(in srgb, var(--dominant-color) 78%, white);
}

:deep(.van-field__left-icon) {
  color: color-mix(in srgb, var(--dominant-color) 72%, white);
}
:deep(.van-field__control::placeholder) {
  color: var(--text-secondary);
}
:deep(.van-search__action) {
  padding-left: 8px;
}
:deep(.van-field__clear) {
  padding-right: 2px;
}

/* 列表项的包裹态对齐 */
.track-row-wrap {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  margin-bottom: 10px;
  overflow: hidden;
}

.skeleton-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--line-soft);
  margin-bottom: 10px;
}
.sk-cover {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.14) 50%, rgba(255, 255, 255, 0.08) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  flex-shrink: 0;
}
.sk-info {
  flex: 1;
}
.sk-line {
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 25%, rgba(255, 255, 255, 0.14) 50%, rgba(255, 255, 255, 0.08) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.sk-title {
  height: 14px;
  width: 60%;
  margin-bottom: 8px;
}
.sk-sub {
  height: 12px;
  width: 40%;
}
@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.empty-tip {
  text-align: center;
  padding: 40px 0;
  color: var(--text-secondary);
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--line-soft);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.03);
}

.bottom-pad {
  height: 16px;
}

@media (max-width: 480px) {
  .home-page {
    --home-search-shell-height: calc(env(safe-area-inset-top, 0px) + 74px);
  }
  .top-bar {
    margin: 0 8px;
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
