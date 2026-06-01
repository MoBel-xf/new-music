<template>
  <div class="page-container">
    <!-- Header -->
    <div class="flex items-center gap-8px px-16px pt-16px pb-12px flex-shrink-0">
      <button class="icon-btn w-32px h-32px" type="button" @click="goBack">
        <van-icon name="arrow-left" />
      </button>
      <h1 class="section-title text-18px">缓存管理</h1>
    </div>

    <!-- Scrollable content -->
    <div class="page-scroll px-16px" style="padding-bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 24px)">
      <!-- Cache cards section -->
      <section class="mb-20px">
        <div class="text-secondary text-14px font-600 mb-10px">缓存数据</div>

        <GlassCard
          v-for="(item, idx) in cacheItems"
          :key="item.key"
          tint="soft"
          :glow="!!stats[item.key]"
          rounded="md"
          class="mb-8px animate-fade-in-up"
          :style="{ animationDelay: `${idx * 60}ms`, 'animation-fill-mode': 'both' }"
        >
          <div class="flex items-center justify-between">
            <!-- Left: icon + text -->
            <div class="flex items-center gap-12px text-secondary">
              <Icon :name="item.icon" size="20" />
              <div class="flex flex-col gap-2px">
                <span class="text-15px font-500 text-primary">{{ item.label }}</span>
                <span class="text-12px text-tertiary">{{ item.desc }}</span>
                <span class="text-11px text-tertiary opacity-70 mt-1px">
                  <van-icon name="clock-o" size="10" class="mr-2px" />{{ ttlMap[item.key] }}
                </span>
              </div>
            </div>

            <!-- Right: count + clear button -->
            <div class="flex items-center gap-10px">
              <span class="text-13px text-secondary tabular-nums">{{ stats[item.key] ?? 0 }} 条</span>
              <button
                class="pill-btn text-12px py-6px px-14px disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                :disabled="!stats[item.key]"
                @click="clearSingle(item)"
              >清除</button>
            </div>
          </div>
        </GlassCard>
      </section>

      <!-- Action buttons section -->
      <section class="mb-20px animate-fade-in-up" style="animation-delay: 280ms; animation-fill-mode: both">
        <GlassCard tint="none" rounded="md" class="mb-10px p-0!">
          <button
            class="clear-warning-btn flex items-center justify-center gap-8px w-full py-14px text-15px font-600 bg-transparent border-none cursor-pointer active:bg-[var(--surface-2)] transition-colors"
            type="button"
            @click="clearAll"
          >
            <Icon name="icon-delete" size="18" />
            <span>清除全部缓存</span>
          </button>
        </GlassCard>

        <button
          class="danger-btn flex items-center justify-center gap-8px w-full py-14px text-15px font-600 border-none rounded-16px cursor-pointer transition-colors"
          type="button"
          @click="nukeAll"
        >
          <Icon name="icon-delete" size="18" />
          <span>彻底清除所有数据</span>
        </button>
      </section>

      <!-- Footer -->
      <div class="text-center text-12px text-[var(--text-quaternary)] py-12px">
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
  history: '2小时过期',
  trackCache: '2小时过期',
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
.page-container {
  background: var(--bg-base);
  min-height: 100%;
}
.tabular-nums {
  font-variant-numeric: tabular-nums;
}
/* 清除按钮警告色 - 在深浅色模式下都保持红色 */
.clear-warning-btn {
  color: #ff3b30 !important;
}
.danger-btn {
  background: #ff3b30;
  color: #fff;
}
.danger-btn:active {
  background: #d63029;
}
</style>
