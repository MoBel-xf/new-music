<template>
  <div class="cache-page">
    <div class="cache-header">
      <button class="back-btn" type="button" @click="goBack">
        <van-icon name="arrow-left" />
      </button>
      <h1 class="cache-title">缓存管理</h1>
    </div>

    <div class="cache-scroll">
      <section class="cache-section">
        <div class="cache-section-title">缓存数据</div>

        <div class="cache-card" v-for="item in cacheItems" :key="item.key">
          <div class="cache-card-info">
            <Icon :name="item.icon" size="20" />
            <div class="cache-card-text">
              <span class="cache-card-name">{{ item.label }}</span>
              <span class="cache-card-desc">{{ item.desc }}</span>
            </div>
          </div>
          <div class="cache-card-right">
            <span class="cache-card-count">{{ stats[item.key] ?? 0 }} 条</span>
            <button class="cache-clear-btn" type="button" :disabled="!stats[item.key]" @click="clearSingle(item)">清除</button>
          </div>
        </div>
      </section>

      <section class="cache-section">
        <button class="clear-all-btn" type="button" @click="clearAll">
          <Icon name="icon-delete" size="18" />
          <span>清除全部缓存</span>
        </button>
        <button class="nuke-btn" type="button" @click="nukeAll">
          <Icon name="icon-delete" size="18" />
          <span>彻底清除所有数据</span>
        </button>
      </section>

      <div class="cache-footer">「清除全部缓存」不影响收藏和歌单，「彻底清除」会删除所有数据</div>
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
.cache-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

.cache-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 12px;
  flex-shrink: 0;
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

.cache-title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.cache-scroll {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 0 16px;
  padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 24px);
}

.cache-section {
  margin-bottom: 20px;
}

.cache-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.cache-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  margin-bottom: 8px;
  transition:
    background 0.3s ease,
    border-color 0.3s ease;
}

.cache-card-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.cache-card-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.cache-card-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.cache-card-desc {
  font-size: 12px;
  color: var(--text-tertiary);
}

.cache-card-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.cache-card-count {
  font-size: 13px;
  color: var(--text-secondary);
  font-variant-numeric: tabular-nums;
}

.cache-clear-btn {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-full);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background 0.2s ease,
    opacity 0.2s ease;
}

.cache-clear-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.cache-clear-btn:not(:disabled):active {
  background: var(--surface-3);
}

.clear-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #ff3b30;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.2s ease;
}

.clear-all-btn:active {
  background: var(--surface-2);
}

.nuke-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 10px;
  padding: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: #ff3b30;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  touch-action: manipulation;
  transition: background 0.2s ease;
}

.nuke-btn:active {
  background: #d63029;
}

.cache-footer {
  text-align: center;
  font-size: 12px;
  color: var(--text-quaternary);
  padding: 12px 0 20px;
}
</style>
