<template>
  <div class="cache-page">
    <!-- Header -->
    <div class="cache-header">
      <button class="cache-back-btn" type="button" @click="goBack">
        <van-icon name="arrow-left" />
      </button>
      <h1 class="cache-title">缓存管理</h1>
    </div>

    <!-- Scrollable content -->
    <div class="cache-scroll" style="padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 24px)">
      <!-- Cache cards section -->
      <section class="cache-section">
        <div class="cache-section-label">缓存数据</div>

        <GlassCard
          v-for="(item, idx) in cacheItems"
          :key="item.key"
          tint="soft"
          :glow="!!stats[item.key]"
          rounded="md"
          class="cache-card animate-fade-in-up"
          :style="{ animationDelay: `${idx * 60}ms`, 'animation-fill-mode': 'both' }"
        >
          <div class="cache-item-row">
            <!-- Left: icon + text -->
            <div class="cache-item-left">
              <Icon :name="item.icon" size="20" />
              <div class="cache-item-info">
                <span class="cache-item-label">{{ item.label }}</span>
                <span class="cache-item-desc">{{ item.desc }}</span>
                <span class="cache-item-ttl">
                  <van-icon name="clock-o" size="10" class="cache-ttl-icon" />{{ ttlMap[item.key] }}
                </span>
              </div>
            </div>

            <!-- Right: count + clear button -->
            <div class="cache-item-right">
              <span class="cache-item-count">{{ stats[item.key] ?? 0 }} 条</span>
              <button
                class="cache-clear-btn"
                type="button"
                :disabled="!stats[item.key]"
                @click="clearSingle(item)"
              >清除</button>
            </div>
          </div>
        </GlassCard>
      </section>

      <!-- Action buttons section -->
      <section class="cache-section animate-fade-in-up" style="animation-delay: 280ms; animation-fill-mode: both">
        <GlassCard tint="none" rounded="md" class="cache-card-flush">
          <button
            class="cache-clear-all-btn"
            type="button"
            @click="clearAll"
          >
            <Icon name="icon-delete" size="18" />
            <span>清除全部缓存</span>
          </button>
        </GlassCard>

        <button
          class="cache-nuke-btn"
          type="button"
          @click="nukeAll"
        >
          <Icon name="icon-delete" size="18" />
          <span>彻底清除所有数据</span>
        </button>
      </section>

      <!-- Footer -->
      <div class="cache-footer">
        「清除全部缓存」不影响收藏和歌单，「彻底清除」会删除所有数据
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'CacheManagePage' })
import { onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { dbGetCacheStats, dbClearHistory, dbClearTrackCache, dbClearHomeRecommend, dbClearAllCache, dbNukeAll, type CacheStats } from '@/utils/db'
import { usePlaylistStore } from '@/stores/playlist'
import Icon from '@/components/Icon.vue'
import GlassCard from '@/components/ui/GlassCard.vue'

const router = useRouter()
const plStore = usePlaylistStore()
const stats = reactive<CacheStats>({
  history: 0,
  trackCache: 0,
  homeRecommend: 0,
  favorites: 0,
  playlists: 0,
  searchHistory: 0
})

interface CacheItem {
  key: keyof CacheStats
  label: string
  desc: string
  icon: string
  clear: () => Promise<void>
}

const ttlMap: Record<string, string> = {
  history: '6小时过期',
  trackCache: '6小时过期',
  homeRecommend: '30分钟过期',
  searchHistory: '7天过期'
}

const cacheItems: CacheItem[] = [
  {
    key: 'history',
    label: '播放历史',
    desc: '最近播放的歌曲记录',
    icon: 'icon-clock',
    clear: async () => {
      await dbClearHistory()
      plStore.history = []
    }
  },
  {
    key: 'trackCache',
    label: '歌曲详情缓存',
    desc: '已缓存的音频链接和歌词',
    icon: 'icon-music',
    clear: dbClearTrackCache
  },
  {
    key: 'homeRecommend',
    label: '推荐缓存',
    desc: '首页和播放页的推荐列表',
    icon: 'icon-wap-home-o',
    clear: dbClearHomeRecommend
  },
  {
    key: 'searchHistory',
    label: '搜索历史',
    desc: '搜索关键词记录',
    icon: 'icon-search',
    clear: async () => {
      localStorage.removeItem('xf-search-history')
      localStorage.removeItem('xf-search-history-v2')
    }
  }
]

function goBack() {
  if (window.history.state?.back) {
    router.back()
  } else {
    router.replace({ name: 'mine' })
  }
}

async function refreshStats() {
  Object.assign(stats, await dbGetCacheStats())
}

async function clearSingle(item: CacheItem) {
  try {
    await showConfirmDialog({
      title: `清除${item.label}`,
      message: `确定清除全部${item.label}？`
    })
    await item.clear()
    showToast(`${item.label}已清除`)
    await refreshStats()
  } catch {
    // 取消
  }
}

async function clearAll() {
  try {
    await showConfirmDialog({
      title: '清除全部缓存',
      message: '将清除播放历史、歌曲缓存、推荐缓存和搜索历史，不影响收藏和歌单。'
    })
    await dbClearAllCache()
    plStore.history = []
    showToast('全部缓存已清除')
    await refreshStats()
  } catch {
    // 取消
  }
}

async function nukeAll() {
  try {
    await showConfirmDialog({
      title: '彻底清除所有数据',
      message: '将清除所有数据，包括收藏、歌单、播放历史、缓存等，此操作不可恢复！'
    })
    await dbNukeAll()
    plStore.favorites = []
    plStore.playlists = []
    plStore.history = []
    showToast('所有数据已清除')
    await refreshStats()
  } catch {
    // 取消
  }
}

onMounted(refreshStats)
</script>

<style scoped>
/* ── 页面容器 ──────────────────────────────────────────────────────────── */
.cache-page {
  position: relative;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-base);
  transition: background-color 0.6s ease, color 0.6s ease;
}

/* ── 顶部导航 ──────────────────────────────────────────────────────────── */
.cache-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 16px 12px;
  flex-shrink: 0;
}

.cache-back-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-2) 80%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
  font-size: 16px;
}
.cache-back-btn:active {
  transform: scale(0.92);
  background: var(--surface-3);
}

.cache-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.6s ease;
}

/* ── 滚动区域 ──────────────────────────────────────────────────────────── */
.cache-scroll {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px;
}

/* ── 区块 ──────────────────────────────────────────────────────────────── */
.cache-section {
  margin-bottom: 20px;
}

.cache-section-label {
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}

.cache-card {
  margin-bottom: 8px;
}

.cache-card-flush {
  margin-bottom: 10px;
  padding: 0 !important;
}

/* ── 缓存项行 ──────────────────────────────────────────────────────────── */
.cache-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.cache-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.cache-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cache-item-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.cache-item-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.cache-item-ttl {
  font-size: 11px;
  color: var(--text-tertiary);
  opacity: 0.7;
  margin-top: 1px;
}

.cache-ttl-icon {
  margin-right: 2px;
}

.cache-item-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cache-item-count {
  font-size: 13px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

/* ── 按钮 ──────────────────────────────────────────────────────────────── */
.cache-clear-btn {
  border-radius: 999px;
  font-weight: 700;
  font-size: 12px;
  color: var(--text-primary);
  border: 1px solid var(--line-strong);
  background: color-mix(in srgb, var(--surface-3) 85%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  cursor: pointer;
  padding: 6px 14px;
  transition: transform 0.15s ease, background 0.15s ease;
}
.cache-clear-btn:active {
  transform: scale(0.95);
  background: var(--surface-2);
}
.cache-clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cache-clear-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 0;
  font-size: 15px;
  font-weight: 600;
  color: #ff3b30;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}
.cache-clear-all-btn:active {
  background: var(--surface-2);
}

.cache-nuke-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px 0;
  font-size: 15px;
  font-weight: 600;
  background: #ff3b30;
  color: #fff;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}
.cache-nuke-btn:active {
  background: #d63029;
  transform: scale(0.98);
}

/* ── 底部说明 ──────────────────────────────────────────────────────────── */
.cache-footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-quaternary);
  padding: 12px 0;
}

/* ── 入场动画 ──────────────────────────────────────────────────────────── */
.animate-fade-in-up {
  animation: fadeInUp 0.4s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
