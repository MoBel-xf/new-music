<template>
  <div class="mine-page">
    <div class="page-scroll-inner">
      <!-- 上方：背景图（随页面滚动） -->
      <div class="hero-bg" :style="heroBgStyle">
        <div class="hero-overlay" />
        <div class="hero-content">
          <div class="hero-top">
            <span class="hero-label">我的</span>
            <button class="hero-btn" @click="router.push({ name: 'cache' })">
              <Icon name="icon-setting" size="20" />
            </button>
          </div>

          <div class="hero-center">
            <div class="user-avatar"><span>♪</span></div>
            <h1 class="user-name">我的音乐</h1>
            <p class="user-stats">{{ plStore.favorites.length }} 收藏 · {{ plStore.playlists.length }} 歌单 · {{ plStore.history.length }} 历史</p>
          </div>

          <div class="hero-actions">
            <button class="ha-btn" @click="openFavorites"><Icon name="icon-like" size="16" /> 收藏</button>
            <button class="ha-btn" @click="openHistory"><Icon name="icon-clock" size="16" /> 历史</button>
            <button class="ha-btn" @click="cycleMode"><Icon :name="modeIcon" size="16" /> {{ modeLabel }}</button>
          </div>
        </div>
      </div>

      <!-- 内容区 -->
      <div class="content-area">
        <!-- 主题切换 -->
        <div class="section">
          <div class="sec-label">主题模式</div>
          <div class="theme-row">
            <button v-for="opt in themeOptions" :key="opt.value" class="theme-btn" :class="{ active: theme === opt.value }" @click="setTheme(opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- 我的歌单 -->
        <div class="section">
          <div class="sec-header">
            <span class="sec-label">我的歌单</span>
            <button class="sec-add" @click="openCreatePlaylist">+ 新建</button>
          </div>

          <div v-if="!plStore.playlists.length" class="empty-card">还没有歌单</div>

          <van-swipe-cell v-for="(pl, i) in plStore.playlists" :key="pl.id" class="pl-swipe" stop-propagation>
            <div class="pl-card" :style="{ '--i': i }" @click="openPlaylist(pl.id)">
              <div class="pl-icon"><Icon name="icon-music" size="18" /></div>
              <div class="pl-info">
                <p class="pl-name">{{ pl.name }}</p>
                <p class="pl-count">{{ pl.trackUids.length }} 首</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <template #right>
              <div class="swipe-actions">
                <button class="sw-btn rename" @click="openRename(pl)">重命名</button>
                <button class="sw-btn delete" @click="confirmDelete(pl.id)">删除</button>
              </div>
            </template>
          </van-swipe-cell>
        </div>

        <!-- 快捷入口 -->
        <div class="section">
          <div class="sec-label">快捷入口</div>
          <div class="quick-grid">
            <button class="quick-card" @click="openFavorites">
              <Icon name="icon-like" size="18" />
              <span>我的收藏</span>
              <span class="qc-count">{{ plStore.favorites.length }}</span>
            </button>
            <button class="quick-card" @click="openHistory">
              <Icon name="icon-clock" size="18" />
              <span>播放历史</span>
              <span class="qc-count">{{ plStore.history.length }}</span>
            </button>
          </div>
        </div>

        <!-- 设置 -->
        <div class="section">
          <div class="sec-label">设置</div>
          <div class="settings-list">
            <div class="setting-item" @click="openAppConfigPopup">
              <span><Icon name="icon-setting" size="16" /> 推荐配置</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div class="setting-item" @click="router.push({ name: 'cache' })">
              <span><Icon name="icon-delete" size="16" /> 缓存管理</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
        </div>

        <p class="footer-text">音乐版权归各平台与原作者所有，仅供学习</p>
        <div class="bottom-pad" />
      </div>
    </div>

    <!-- 弹窗 -->
    <van-dialog v-model:show="showCreate" title="新建歌单" show-cancel-button @confirm="doCreate" :before-close="beforeClose">
      <div style="padding: 16px 20px">
        <van-field v-model="newName" placeholder="给歌单取个名字吧" autofocus maxlength="20" show-word-limit @keyup.enter="doCreate" />
      </div>
    </van-dialog>

    <van-dialog v-model:show="showRename" title="重命名歌单" show-cancel-button @confirm="doRename">
      <div style="padding: 16px 20px">
        <van-field v-model="renameVal" placeholder="新名称" autofocus maxlength="20" show-word-limit />
      </div>
    </van-dialog>

    <van-popup v-model:show="showConfig" position="bottom" round :style="{ height: 'calc(100dvh - 24px)' }">
      <div class="config-popup">
        <div class="config-header">
          <span class="config-title">推荐与缓存配置</span>
          <button class="config-close" @click="showConfig = false">×</button>
        </div>
        <div class="config-form">
          <van-field v-model="draft.homeQueryKeyword" label="首页查询" placeholder="如：抖音热歌" maxlength="20" />
          <van-field v-model="draft.homeQueryLimit" label="首页条数" type="number" input-align="right" />
          <van-field v-model="draft.playQueryKeyword" label="播放查询" placeholder="如：华语流行" maxlength="20" />
          <van-field v-model="draft.playQueryLimit" label="播放条数" type="number" input-align="right" />
          <van-field v-model="draft.prefetchCount" label="预缓存" type="number" input-align="right" />
          <van-field v-model="draft.colorPrefetchCount" label="色彩预取" type="number" input-align="right" />
          <div class="config-switch">
            <div><span class="csw-title">其他页面保留主导色</span><span class="csw-desc">切换页面时 tabbar 继续沿用当前歌曲主导色</span></div>
            <van-switch v-model="draft.keepTabbarDominantColor" size="20px" active-color="var(--dominant-color)" />
          </div>
        </div>
        <div class="config-actions">
          <button class="cfg-btn ghost" @click="showConfig = false">取消</button>
          <button class="cfg-btn primary" @click="saveConfig">保存</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'MinePage' })
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppConfigStore } from '@/stores/appConfig'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { useTheme } from '@/composables/useTheme'
import type { ThemeMode } from '@/composables/useTheme'
import { showConfirmDialog, showToast } from 'vant'
import type { Playlist, PlayMode } from '@/types/music'
import Icon from '@/components/Icon.vue'
import { getLuminance } from '@/utils/color'

const router = useRouter()
const appConfig = useAppConfigStore()
const player = usePlayerStore()
const plStore = usePlaylistStore()
const { theme, setTheme } = useTheme()

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' }, { value: 'dark', label: '深色' }, { value: 'dominant', label: '沉浸' }
]

const showCreate = ref(false); const newName = ref(''); const showConfig = ref(false)
const draft = ref({ homeQueryKeyword: '', homeQueryLimit: '12', playQueryKeyword: '', playQueryLimit: '12', prefetchCount: '4', colorPrefetchCount: '6', keepTabbarDominantColor: false })

const heroBgStyle = computed(() => {
  const color = player.dominantColor || '#ff6b6b'
  const cover = player.currentTrack?.cover || ''
  const dark = getLuminance(color) > 0.5 ? '#0c0c18' : '#080810'
  return { background: cover ? `linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6)), url(${cover}) center/cover no-repeat` : `linear-gradient(180deg, ${color}, ${dark})` }
})

const modeMap: Record<PlayMode, string> = { list: '列表循环', single: '单曲循环', shuffle: '随机播放' }
const modeLabel = computed(() => modeMap[player.playMode])
const MODE_ICONS: Record<PlayMode, string> = { list: 'list', single: 'single', shuffle: 'shuffle' }
const modeIcon = computed(() => `icon-${MODE_ICONS[player.playMode]}`)
function cycleMode() { const o: PlayMode[] = ['list', 'single', 'shuffle']; player.setPlayMode(o[(o.indexOf(player.playMode) + 1) % o.length]) }

function openFavorites() { router.push({ name: 'favorites' }) }
function openHistory() { router.push({ name: 'history' }) }
function openPlaylist(id: string) { router.push({ name: 'playlist', params: { id } }) }
function openCreatePlaylist() { newName.value = ''; showCreate.value = true }

async function doCreate() {
  const n = newName.value.trim()
  if (!n) { showToast('请输入歌单名称'); return }
  await plStore.createPlaylist(n); showCreate.value = false; showToast('歌单已创建')
}
function beforeClose(action: string) { return action === 'cancel' || newName.value.trim().length > 0 }

const showRename = ref(false); const renameVal = ref(''); const renameTarget = ref<Playlist | null>(null)
function openRename(pl: Playlist) { renameTarget.value = pl; renameVal.value = pl.name; showRename.value = true }
async function doRename() { if (!renameTarget.value || !renameVal.value.trim()) return; await plStore.renamePlaylist(renameTarget.value.id, renameVal.value.trim()); showRename.value = false; showToast('已重命名') }
async function confirmDelete(id: string) { await showConfirmDialog({ title: '确认删除', message: '删除后无法恢复' }); await plStore.deletePlaylist(id); showToast('歌单已删除') }

function openAppConfigPopup() {
  draft.value = { homeQueryKeyword: appConfig.homeQueryKeyword, homeQueryLimit: String(appConfig.homeQueryLimit), playQueryKeyword: appConfig.playQueryKeyword, playQueryLimit: String(appConfig.playQueryLimit), prefetchCount: String(appConfig.prefetchCount), colorPrefetchCount: String(appConfig.colorPrefetchCount), keepTabbarDominantColor: appConfig.keepTabbarDominantColor }
  showConfig.value = true
}
function saveConfig() {
  appConfig.patchConfig({ homeQueryKeyword: draft.value.homeQueryKeyword, homeQueryLimit: Number(draft.value.homeQueryLimit), playQueryKeyword: draft.value.playQueryKeyword, playQueryLimit: Number(draft.value.playQueryLimit), prefetchCount: Number(draft.value.prefetchCount), colorPrefetchCount: Number(draft.value.colorPrefetchCount), keepTabbarDominantColor: draft.value.keepTabbarDominantColor })
  showConfig.value = false; showToast('配置已保存')
}
</script>

<style scoped>
.mine-page {
  height: 100%;
  overflow: hidden;
  background: var(--bg-base);
}

.page-scroll-inner {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── 背景图（随页面滚动）─────────────────────────────────────────────── */
.hero-bg {
  height: 50vh;
  min-height: 280px;
  position: relative;
  overflow: hidden;
  transition: background 0.6s ease;
}

.hero-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.45)); }
.hero-content { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 0 24px; }

.hero-top {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: calc(env(safe-area-inset-top, 0px) + 10px);
}
.hero-label { font-size: 13px; color: var(--text-secondary); }
.hero-btn {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border-light); background: var(--surface-2);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px);
}

.hero-center {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
}
.user-avatar {
  width: 60px; height: 60px; border-radius: 18px;
  background: var(--surface-3); border: 1px solid var(--border-light);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px);
}
.user-avatar span { font-size: 28px; font-weight: 800; color: var(--dominant-color, #ff6b6b); }
.user-name { margin: 0; font-size: 24px; font-weight: 800; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.user-stats { margin: 0; font-size: 13px; color: var(--text-secondary); }

.hero-actions {
  display: flex; align-items: center; justify-content: center;
  gap: 10px; padding-bottom: 20px;
}
.ha-btn {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 8px 16px; border-radius: 100px;
  border: 1px solid var(--border-light); background: var(--surface-2);
  color: var(--text-primary); font-size: 13px; font-weight: 500;
  cursor: pointer; backdrop-filter: blur(8px); transition: transform 0.15s ease;
}
.ha-btn:active { transform: scale(0.95); }

/* ── 内容区 ──────────────────────────────────────────────────────────── */
.content-area {
  padding: 20px 16px 0;
  background: var(--bg-canvas);
  position: relative;
  z-index: 1;
}

.section { margin-bottom: 20px; }
.sec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sec-label {
  font-size: 11px; font-weight: 600; color: var(--text-tertiary);
  text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px;
}
.sec-header .sec-label { margin-bottom: 0; }
.sec-add {
  padding: 4px 12px; border-radius: 100px;
  border: 1px solid var(--border-light); background: var(--surface-1);
  font-size: 12px; color: var(--dominant-accent); cursor: pointer;
}

/* ── 主题切换 ────────────────────────────────────────────────────────── */
.theme-row {
  display: flex; border-radius: 100px;
  border: 1px solid var(--line-soft); overflow: hidden;
  background: var(--surface-1);
}
.theme-btn {
  flex: 1; border: none; background: transparent;
  padding: 7px 0; font-size: 13px; color: var(--text-secondary);
  cursor: pointer; transition: background 0.2s, color 0.2s;
}
.theme-btn.active { background: var(--dominant-color, #ff6b6b); color: #fff; border-radius: 100px; }

/* ── 歌单 ────────────────────────────────────────────────────────────── */
.pl-swipe { border-radius: 12px; overflow: hidden; margin-bottom: 6px; }
.pl-card {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  background: var(--surface-1); border: 1px solid var(--line-soft);
  border-radius: 12px; cursor: pointer;
  animation: fadeInUp 0.35s ease both; animation-delay: calc(var(--i, 0) * 50ms);
}
.pl-card:active { background: var(--surface-2); }
.pl-icon {
  width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05);
  display: flex; align-items: center; justify-content: center; color: var(--text-tertiary); flex-shrink: 0;
}
.pl-info { flex: 1; min-width: 0; }
.pl-name { margin: 0; font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pl-count { margin: 2px 0 0; font-size: 11px; color: var(--text-tertiary); }
.pl-card svg { color: var(--text-tertiary); flex-shrink: 0; }

.empty-card { padding: 20px; text-align: center; font-size: 12px; color: var(--text-quaternary); border: 1px dashed var(--line-soft); border-radius: 12px; }

.swipe-actions { display: flex; height: 100%; }
.sw-btn { border: none; color: #fff; font-size: 12px; font-weight: 600; padding: 0 16px; cursor: pointer; }
.sw-btn.rename { background: #4a90e2; }
.sw-btn.delete { background: #ff3b30; }

/* ── 快捷入口 ────────────────────────────────────────────────────────── */
.quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.quick-card {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  padding: 12px; border-radius: 12px;
  border: 1px solid var(--line-soft); background: var(--surface-1);
  color: var(--text-secondary); font-size: 13px; cursor: pointer;
}
.quick-card:active { background: var(--surface-2); }
.qc-count { font-size: 20px; font-weight: 800; color: var(--text-primary); font-variant-numeric: tabular-nums; }

/* ── 设置 ────────────────────────────────────────────────────────────── */
.settings-list {
  border-radius: 12px; border: 1px solid var(--line-soft);
  background: var(--surface-1); overflow: hidden;
}
.setting-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px; border-bottom: 1px solid var(--line-soft);
  color: var(--text-secondary); font-size: 13px; cursor: pointer;
}
.setting-item:last-child { border-bottom: none; }
.setting-item:active { background: var(--surface-1); }
.setting-item span { display: flex; align-items: center; gap: 8px; }
.setting-item :deep(.icon) { color: var(--text-tertiary); }
.setting-item svg { color: var(--text-tertiary); }

.footer-text { text-align: center; font-size: 10px; color: var(--text-quaternary); padding: 12px 0 0; }
.bottom-pad { height: calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 8px); }

/* ── 配置弹窗 ────────────────────────────────────────────────────────── */
.config-popup { display: flex; flex-direction: column; height: calc(100dvh - 24px); padding: 16px 16px 0; background: var(--bg-sheet); }
.config-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.config-title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.config-close { width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--surface-1); color: var(--text-secondary); font-size: 20px; cursor: pointer; }
.config-form {
  flex: 1; overflow-y: auto; border: 1px solid var(--dominant-border); border-radius: 20px;
  background: radial-gradient(circle at 20% 0%, var(--dominant-tint-2) 0%, transparent 40%), color-mix(in srgb, var(--bg-card) 94%, transparent);
}
.config-switch { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px; border-top: 1px solid var(--line-soft); }
.csw-title { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.csw-desc { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.config-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; padding: 12px 0 calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 16px); }
.cfg-btn { height: 44px; border: none; border-radius: 14px; font-size: 14px; font-weight: 700; cursor: pointer; }
.cfg-btn.ghost { color: var(--text-secondary); background: var(--surface-1); }
.cfg-btn.primary { color: var(--text-on-brand); background: var(--brand-grad); box-shadow: var(--dominant-glow); }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
