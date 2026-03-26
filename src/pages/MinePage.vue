<template>
  <div class="mine-page">
    <!-- 替换为对齐 PlaylistDetailPage 的 Banner 层 -->
    <!-- <div class="banner">
      <div class="banner-content">
        <div class="banner-icon">
          <div class="avatar-font">♪</div>
        </div>
        <div class="banner-info">
          <h1 class="banner-title">APP Music</h1>
          <p class="banner-sub">你的私人音乐空间 ⚡️</p>
        </div>
      </div>
    </div> -->

    <!-- 数据统计由吸附样式改为独立的悬浮 Action Bar -->
    <div class="action-bar">
      <button class="stat-card" type="button" @click="openFavorites">
        <span class="stat-num">{{ plStore.favorites.length }}</span>
        <span class="stat-label"><Icon name="icon-like" size="14" /> 收藏</span>
      </button>
      <button class="stat-card" type="button" @click="openHistory">
        <span class="stat-num">{{ plStore.history.length }}</span>
        <span class="stat-label"><Icon name="icon-clock" size="14" /> 历史</span>
      </button>
      <button v-if="plStore.playlists.length" class="stat-card" type="button" @click="openFirstPlaylist">
        <span class="stat-num">{{ plStore.playlists.length }}</span>
        <span class="stat-label"><Icon name="icon-playlist" size="14" /> 歌单</span>
      </button>
      <button v-else class="stat-card" type="button" @click="openCreatePlaylist">
        <span class="stat-num">+</span>
        <span class="stat-label"><Icon name="icon-playlist" size="14" /> 歌单</span>
      </button>
    </div>

    <div class="page-scroll mine-scroll">
      <!-- 我的歌单 -->
      <section class="section">
        <div class="section-header">
          <span class="section-title">我的歌单</span>
          <button class="action-btn" type="button" @click="openCreatePlaylist">+ 新建</button>
        </div>

        <div v-if="!plStore.playlists.length" class="empty-tip">还没有歌单，点击「新建」创建第一个吧 🎶</div>

        <van-swipe-cell v-for="pl in plStore.playlists" :key="pl.id" class="playlist-swipe" stop-propagation>
          <button class="playlist-row track-row-wrap" type="button" @click="openPlaylist(pl.id)">
            <div class="playlist-cover">
              <Icon name="icon-music" size="24" />
            </div>
            <div class="playlist-meta">
              <p class="playlist-name">{{ pl.name }}</p>
              <p class="playlist-count">{{ pl.trackUids.length }} 首歌曲</p>
            </div>
            <span class="arrow">›</span>
          </button>
          <template #right>
            <div class="swipe-actions">
              <button class="swipe-btn rename-btn" type="button" @click="openRename(pl)">重命名</button>
              <button class="swipe-btn delete-btn" type="button" @click="confirmDelete(pl.id)">删除</button>
            </div>
          </template>
        </van-swipe-cell>
      </section>

      <!-- 快捷入口 -->
      <section class="section">
        <div class="section-title" style="margin-bottom: 12px">快捷入口</div>
        <van-cell-group class="glass-cell-group">
          <van-cell title="我的收藏" is-link clickable @click="openFavorites">
            <template #icon><Icon name="icon-like" size="18" /></template>
          </van-cell>
          <van-cell title="播放历史" is-link clickable @click="openHistory">
            <template #icon><Icon name="icon-clock" size="18" /></template>
          </van-cell>
        </van-cell-group>
      </section>

      <!-- 设置 -->
      <section class="section">
        <div class="section-title" style="margin-bottom: 12px">设置</div>
        <van-cell-group class="glass-cell-group">
          <van-cell title="深浅色模式" center>
            <template #icon><Icon name="icon-user-o" size="18" /></template>
            <template #right-icon>
              <div class="theme-toggle-group">
                <button
                  v-for="opt in themeOptions"
                  :key="opt.value"
                  class="theme-toggle-btn"
                  :class="{ active: theme === opt.value }"
                  type="button"
                  @click="setTheme(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </template>
          </van-cell>
          <van-cell title="播放模式" center clickable @click="cycleMode">
            <template #icon><Icon :name="modeIcon" size="18" /></template>
            <template #right-icon>
              <button class="mode-toggle" type="button" @click.stop="cycleMode">{{ modeLabel }}</button>
            </template>
          </van-cell>
          <van-cell title="推荐与缓存配置" is-link clickable @click="openAppConfigPopup" center>
            <template #icon><Icon name="icon-setting" size="18" /></template>
          </van-cell>
          <van-cell title="缓存管理" is-link clickable @click="router.push({ name: 'cache' })" center>
            <template #icon><Icon name="icon-delete" size="18" /></template>
          </van-cell>
        </van-cell-group>
      </section>

      <div class="footer-tip">音乐版权归各平台与原作者所有，本站仅供学习</div>
      <div style="height: 20px" />
    </div>

    <!-- 弹窗 -->
    <van-dialog v-model:show="showCreate" title="新建歌单" show-cancel-button @confirm="doCreatePlaylist" :before-close="beforeDialogClose">
      <div style="padding: 16px 20px">
        <van-field
          v-model="newPlaylistName"
          placeholder="给歌单取个名字吧 🎵"
          autofocus
          maxlength="20"
          show-word-limit
          @keyup.enter="doCreatePlaylist"
        />
      </div>
    </van-dialog>

    <van-dialog v-model:show="showRename" title="重命名歌单" show-cancel-button @confirm="doRename">
      <div style="padding: 16px 20px">
        <van-field v-model="renameVal" placeholder="新名称" autofocus maxlength="20" show-word-limit />
      </div>
    </van-dialog>

    <van-popup v-model:show="showAppConfig" position="bottom" round :style="{ height: 'calc(100dvh - 24px)' }">
      <div class="config-popup">
        <div class="config-popup-header">
          <span class="config-popup-title">推荐与缓存配置</span>
          <button class="picker-close" type="button" @click="showAppConfig = false">×</button>
        </div>

        <div class="config-form">
          <van-field v-model="configDraft.homeQueryKeyword" label="首页查询内容" placeholder="如：抖音热歌" maxlength="20" />
          <van-field v-model="configDraft.homeQueryLimit" label="首页首次条数" type="number" input-align="right" />
          <van-field v-model="configDraft.playQueryKeyword" label="播放查询内容" placeholder="如：华语流行" maxlength="20" />
          <van-field v-model="configDraft.playQueryLimit" label="播放查询条数" type="number" input-align="right" />
          <van-field v-model="configDraft.prefetchCount" label="详情预缓存条数" type="number" input-align="right" />
          <van-field v-model="configDraft.colorPrefetchCount" label="主导色预取条数" type="number" input-align="right" />
          <div class="config-switch-row">
            <div class="config-switch-copy">
              <span class="config-switch-title">其他页面保留主导色</span>
              <span class="config-switch-subtitle">切换首页、我的等页面时，tabbar 继续沿用当前歌曲主导色</span>
            </div>
            <van-switch v-model="configDraft.keepTabbarDominantColor" size="20px" active-color="var(--dominant-color)" />
          </div>
        </div>

        <div class="config-actions">
          <button class="config-btn ghost" type="button" @click="showAppConfig = false">取消</button>
          <button class="config-btn primary" type="button" @click="saveAppConfig">保存</button>
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

const router = useRouter()
const appConfig = useAppConfigStore()
const player = usePlayerStore()
const plStore = usePlaylistStore()
const { theme, setTheme } = useTheme()
const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'dominant', label: '沉浸' }
]
const showCreate = ref(false)
const newPlaylistName = ref('')
const showAppConfig = ref(false)
const configDraft = ref({
  homeQueryKeyword: '',
  homeQueryLimit: '12',
  playQueryKeyword: '',
  playQueryLimit: '12',
  prefetchCount: '4',
  colorPrefetchCount: '6',
  keepTabbarDominantColor: false
})

function openCreatePlaylist() {
  newPlaylistName.value = ''
  showCreate.value = true
}

function openFavorites() {
  router.push({ name: 'favorites' })
}

function openHistory() {
  router.push({ name: 'history' })
}

function openPlaylist(id: string) {
  router.push({ name: 'playlist', params: { id } })
}

function openFirstPlaylist() {
  const firstPlaylistId = plStore.playlists[0]?.id
  if (!firstPlaylistId) {
    openCreatePlaylist()
    return
  }
  openPlaylist(firstPlaylistId)
}

async function doCreatePlaylist() {
  const name = newPlaylistName.value.trim()
  if (!name) {
    showToast('请输入歌单名称')
    return
  }
  await plStore.createPlaylist(name)
  showCreate.value = false
  showToast('歌单已创建 🎶')
}

function beforeDialogClose(action: string) {
  return action === 'cancel' || newPlaylistName.value.trim().length > 0
}

const showRename = ref(false)
const renameVal = ref('')
const renameTarget = ref<Playlist | null>(null)

function openRename(pl: Playlist) {
  renameTarget.value = pl
  renameVal.value = pl.name
  showRename.value = true
}

async function doRename() {
  if (!renameTarget.value || !renameVal.value.trim()) return
  await plStore.renamePlaylist(renameTarget.value.id, renameVal.value.trim())
  showRename.value = false
  showToast('已重命名')
}

async function confirmDelete(id: string) {
  await showConfirmDialog({ title: '确认删除', message: '删除后无法恢复' })
  await plStore.deletePlaylist(id)
  showToast('歌单已删除')
}

function openAppConfigPopup() {
  configDraft.value = {
    homeQueryKeyword: appConfig.homeQueryKeyword,
    homeQueryLimit: String(appConfig.homeQueryLimit),
    playQueryKeyword: appConfig.playQueryKeyword,
    playQueryLimit: String(appConfig.playQueryLimit),
    prefetchCount: String(appConfig.prefetchCount),
    colorPrefetchCount: String(appConfig.colorPrefetchCount),
    keepTabbarDominantColor: appConfig.keepTabbarDominantColor
  }
  showAppConfig.value = true
}

function saveAppConfig() {
  appConfig.patchConfig({
    homeQueryKeyword: configDraft.value.homeQueryKeyword,
    homeQueryLimit: Number(configDraft.value.homeQueryLimit),
    playQueryKeyword: configDraft.value.playQueryKeyword,
    playQueryLimit: Number(configDraft.value.playQueryLimit),
    prefetchCount: Number(configDraft.value.prefetchCount),
    colorPrefetchCount: Number(configDraft.value.colorPrefetchCount),
    keepTabbarDominantColor: configDraft.value.keepTabbarDominantColor
  })
  showAppConfig.value = false
  showToast('配置已保存')
}

const modeMap: Record<PlayMode, string> = { list: '列表循环', single: '单曲循环', shuffle: '随机播放' }
const modeLabel = computed(() => modeMap[player.playMode])
const MODE_ICONS: Record<PlayMode, string> = { list: 'list', single: 'single', shuffle: 'shuffle' }

const modeIcon = computed(() => `icon-${MODE_ICONS[player.playMode]}`)

function cycleMode() {
  const order: PlayMode[] = ['list', 'single', 'shuffle']
  player.setPlayMode(order[(order.indexOf(player.playMode) + 1) % order.length])
}
</script>

<style scoped>
.mine-page {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: transparent;
}

/* 结合详情页沉浸式体验的 Banner */
.banner {
  flex-shrink: 0;
  margin: 12px 12px 0;
  padding: 24px 20px;
  position: relative;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: var(--shadow-card);
  background: linear-gradient(160deg, #a18cd1, #fbc2eb);
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
  width: 68px;
  height: 68px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.16);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.avatar-font {
  font-size: 32px;
  color: #fff;
  font-weight: bold;
}
.banner-info {
  display: flex;
  flex-direction: column;
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
  color: rgba(255, 255, 255, 0.85);
}

/* 数据统计 -> 转化为对齐 Action Bar 的独立悬浮框 */
.action-bar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 12px 0;
  padding: 12px;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 22px;
  flex-shrink: 0;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

.stat-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  touch-action: manipulation;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}
.stat-card:active {
  transform: scale(0.96);
  background: var(--dominant-tint-2);
  border-color: var(--dominant-border);
}
.stat-num {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-primary);
  font-family: 'Baloo 2', sans-serif;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.stat-label :deep(.icon) {
  color: var(--text-tertiary);
}

/* 滚动区 */
.mine-scroll {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 24px);
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
  letter-spacing: -0.03em;
}

/* 按钮样式对齐 edit-btn */
.action-btn {
  border: 1px solid var(--line-soft);
  background: var(--surface-1);
  color: var(--text-primary);
  font-size: 13px;
  padding: 7px 14px;
  border-radius: var(--radius-full);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

.playlist-swipe {
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 10px;
}
/* 对齐 HomePage 卡片框 */
.track-row-wrap {
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}
.playlist-row {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 14px 16px;
  gap: 12px;
  cursor: pointer;
  margin-bottom: 0;
  border-radius: 0; /* swipe cell control wrapper radius */
  border: none;
  appearance: none;
  -webkit-appearance: none;
  touch-action: manipulation;
  text-align: left;
}
.playlist-cover {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--dominant-tint-3), var(--surface-1));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--text-secondary);
}
.playlist-meta {
  flex: 1;
  min-width: 0;
}
.playlist-name {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}
.playlist-count {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.arrow {
  font-size: 20px;
  color: var(--text-tertiary);
}

.swipe-actions {
  display: flex;
  height: 100%;
}
.swipe-btn {
  border: none;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  padding: 0 20px;
  cursor: pointer;
  touch-action: manipulation;
}
.rename-btn {
  background: #4a90e2;
}
.delete-btn {
  background: #ff3b30;
}

.empty-tip {
  background: var(--surface-1);
  border: 1px dashed var(--line-soft);
  border-radius: 22px;
  padding: 30px 20px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

.mode-toggle {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-full);
  background: var(--surface-1);
  font-size: 12px;
  padding: 6px 12px;
  color: var(--text-primary);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

.theme-toggle-group {
  display: flex;
  gap: 0;
  border: 1px solid var(--line-soft);
  border-radius: var(--radius-full);
  overflow: hidden;
  background: var(--dominant-tint-1);
}
.theme-toggle-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  padding: 5px 10px;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  transition:
    background 0.3s,
    color 0.3s;
  line-height: 1.2;
}
.theme-toggle-btn.active {
  background: var(--dominant-accent, var(--bg-active));
  color: #fff;
  border-radius: var(--radius-full);
}

.config-popup {
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 24px);
  padding: 16px 16px 0;
  background: var(--bg-sheet);
}

.config-popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.config-popup-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.config-form {
  flex: 1;
  min-height: 240px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--dominant-border);
  border-radius: 20px;
  background: radial-gradient(circle at 20% 0%, var(--dominant-tint-2) 0%, transparent 40%), color-mix(in srgb, var(--bg-card) 94%, transparent);
  transition: border-color 0.5s ease;
}

.config-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-top: 1px solid var(--line-soft);
}

.config-switch-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.config-switch-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
}

.config-switch-subtitle {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.config-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  position: sticky;
  bottom: 0;
  margin-top: 16px;
  padding: 12px 0 calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 16px);
  background: linear-gradient(180deg, color-mix(in srgb, var(--bg-sheet) 12%, transparent), var(--bg-sheet) 24% 100%);
}

.config-btn {
  height: 44px;
  border: 0;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
}

.config-btn.ghost {
  color: var(--text-secondary);
  background: var(--surface-1);
}

.config-btn.primary {
  color: var(--text-on-brand);
  background: var(--brand-grad);
  box-shadow: var(--dominant-glow);
}

/* Vant 单元格组 */
.glass-cell-group {
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  overflow: hidden;
  transition:
    border-color 0.5s ease,
    background 0.5s ease;
}

:deep(.glass-cell-group .van-cell) {
  background: transparent;
  color: var(--text-primary);
  padding: 14px 16px;
  cursor: pointer;
  touch-action: manipulation;
}
:deep(.glass-cell-group .van-cell::after) {
  border-bottom-color: var(--line-soft);
  left: 16px;
  right: 16px;
}
:deep(.glass-cell-group .van-cell__title) {
  color: var(--text-primary);
  font-size: 15px;
}
:deep(.glass-cell-group .van-cell__right-icon) {
  color: var(--text-tertiary);
}
:deep(.van-cell .icon) {
  color: var(--text-tertiary);
  margin-right: 12px;
}
:deep(.van-switch) {
  box-shadow: inset 0 0 0 1px var(--line-soft);
}

.footer-tip {
  text-align: center;
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 24px 20px 0;
}
</style>
