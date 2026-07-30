<template>
  <div class="mine-page">
    <div class="page-scroll-inner">
      <!-- 上方：随页面上下流动的音乐封面墙 -->
      <div
        class="hero-bg"
        :class="{ expanded: isCoverWallExpanded }"
        :style="heroToneStyle"
        @touchstart.passive="onCoverWallTouchStart"
        @touchmove.passive="onCoverWallTouchMove"
        @touchend.passive="onCoverWallTouchEnd"
      >
        <div class="cover-marquee">
          <div
            v-for="(column, columnIndex) in coverTileColumns"
            :key="columnIndex"
            class="cover-column"
            :class="columnIndex % 2 ? 'cover-column-down' : 'cover-column-up'"
          >
            <button
              v-for="(tile, tileIndex) in [...column, ...column]"
              :key="`${tile.title}-${tileIndex}`"
              class="cover-tile"
              :class="{ 'is-current': tile.track?.uid === player.currentTrack?.uid }"
              :disabled="!isCoverWallExpanded || !tile.track"
              :aria-label="tile.track ? `播放 ${tile.title}` : tile.title"
              @click.stop="playFromCover(tile)"
            >
              <img v-if="tile.cover" :src="tile.cover" alt="" referrerpolicy="no-referrer" />
              <span v-else class="cover-tile-fallback" :style="{ '--tile-accent': tile.tone }">{{ tile.title.slice(0, 1) }}</span>
              <span v-if="player.isPlaying && tile.track?.uid === player.currentTrack?.uid" class="cover-playing-indicator" aria-label="正在播放">
                <i v-for="bar in 3" :key="bar" class="playing-bar" />
              </span>
            </button>
          </div>
        </div>
        <div class="hero-overlay" />
        <div class="hero-content">
          <div class="hero-top">
            <button v-if="isCoverWallExpanded" class="hero-back" aria-label="收起封面列表" @click.stop="collapseCoverWall">
              <Icon name="icon-back" size="20" />
            </button>
            <span v-else class="hero-label">我的</span>
            <button v-if="!isCoverWallExpanded" class="hero-btn" @click="router.push({ name: 'cache' })">
              <Icon name="icon-setting" size="20" />
            </button>
          </div>

          <div class="hero-bottom-strip">
            <div class="hero-center">
              <div class="user-avatar"><span>♪</span></div>
              <h1 class="user-name">我的音乐</h1>
              <p class="user-stats">{{ plStore.favorites.length }} 收藏 · {{ plStore.playlists.length }} 歌单 · {{ plStore.history.length }} 历史</p>
            </div>

            <div class="hero-actions">
              <button class="ha-btn" aria-label="我的收藏" @click="openFavorites"><Icon name="icon-like" size="16" /> 收藏</button>
              <button class="ha-btn" aria-label="播放历史" @click="openHistory"><Icon name="icon-clock" size="16" /> 历史</button>
              <button class="ha-btn" :aria-label="modeLabel" @click="cycleMode"><Icon :name="modeIcon" size="16" /> {{ modeLabel }}</button>
            </div>
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
            <div class="setting-item" @click="installPwa">
              <span><Icon name="icon-down" size="16" /> 安装主屏应用</span>
              <span class="setting-tail">{{ pwaInstallState.isStandalone.value ? '已安装' : '独立全屏' }}</span>
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
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppConfigStore } from '@/stores/appConfig'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistStore } from '@/stores/playlist'
import { useTheme } from '@/composables/useTheme'
import { pwaInstallState, requestPwaInstall } from '@/composables/usePwaInstall'
import type { ThemeMode } from '@/composables/useTheme'
import { showConfirmDialog, showDialog, showToast } from 'vant'
import type { Playlist, PlayMode, Track } from '@/types/music'
import Icon from '@/components/Icon.vue'

const router = useRouter()
const appConfig = useAppConfigStore()
const player = usePlayerStore()
const plStore = usePlaylistStore()
const { theme, setTheme } = useTheme()

const themeOptions: { value: ThemeMode; label: string }[] = [
  { value: 'dark', label: '深色' }, { value: 'light', label: '浅色' }
]

const showCreate = ref(false); const newName = ref(''); const showConfig = ref(false)
const draft = ref({ homeQueryKeyword: '', homeQueryLimit: '12', playQueryKeyword: '', playQueryLimit: '12', prefetchCount: '4', colorPrefetchCount: '6' })

interface CoverTile {
  title: string
  cover?: string
  tone: string
  track?: Track
}

const fallbackCoverTiles: CoverTile[] = [
  { title: '午夜电台', tone: '#b14362' }, { title: '城市漫游', tone: '#245b86' }, { title: '海风', tone: '#17746a' },
  { title: '橘子汽水', tone: '#c15d2d' }, { title: '慢慢来', tone: '#735b9f' }, { title: '失重', tone: '#4d526d' }
]

const isCoverWallExpanded = ref(false)
const coverWallPullDistance = ref(0)
let coverWallTouchStartY = 0

// 封面墙采用首次出现时的固定顺序。播放会更新歌曲数据和播放状态，但不重新排版封面位置。
const coverTracks = ref<Track[]>([])

watch(
  () => [player.currentTrack, ...plStore.history, ...plStore.favorites],
  (tracks) => {
    const incoming = new Map<string, Track>()
    tracks.forEach((track) => {
      if (track && !incoming.has(track.uid)) incoming.set(track.uid, track)
    })

    const existingUids = new Set(coverTracks.value.map((track) => track.uid))
    const updated = coverTracks.value.map((track) => incoming.get(track.uid) ?? track)
    const appended = Array.from(incoming.values()).filter((track) => !existingUids.has(track.uid))
    coverTracks.value = [...updated, ...appended]
  },
  { immediate: true }
)

const coverTileColumns = computed(() => {
  const tiles: CoverTile[] = coverTracks.value.map((track, index) => ({
    title: track.title || '音乐',
    cover: track.cover,
    tone: fallbackCoverTiles[index % fallbackCoverTiles.length].tone,
    track
  }))
  const source = tiles.length ? [...tiles, ...fallbackCoverTiles] : fallbackCoverTiles
  return Array.from({ length: 3 }, (_, columnIndex) => Array.from(
    { length: 6 },
    (_, itemIndex) => source[(columnIndex + itemIndex * 3) % source.length]
  ))
})

const heroToneStyle = computed(() => {
  const color = player.dominantColor || '#ff6b6b'
  return { '--hero-tint': color, '--cover-pull-distance': `${coverWallPullDistance.value}px` }
})

function onCoverWallTouchStart(event: TouchEvent) {
  coverWallTouchStartY = event.touches[0]?.clientY ?? 0
}

function onCoverWallTouchMove(event: TouchEvent) {
  if (isCoverWallExpanded.value) return
  const distance = (event.touches[0]?.clientY ?? coverWallTouchStartY) - coverWallTouchStartY
  coverWallPullDistance.value = Math.min(108, Math.max(0, distance * 0.42))
}

function onCoverWallTouchEnd(event: TouchEvent) {
  const endY = event.changedTouches[0]?.clientY ?? coverWallTouchStartY
  const distance = endY - coverWallTouchStartY
  coverWallPullDistance.value = 0
  if (!isCoverWallExpanded.value && distance > 48) isCoverWallExpanded.value = true
  if (isCoverWallExpanded.value && distance < -48) collapseCoverWall()
}

function collapseCoverWall() {
  isCoverWallExpanded.value = false
  coverWallPullDistance.value = 0
}

async function playFromCover(tile: CoverTile) {
  if (!isCoverWallExpanded.value || !tile.track) return
  if (tile.track.uid === player.currentTrack?.uid) {
    player.togglePlayPause()
    return
  }
  await player.playTrack(tile.track, coverTracks.value, { type: 'history' })
}

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
  draft.value = { homeQueryKeyword: appConfig.homeQueryKeyword, homeQueryLimit: String(appConfig.homeQueryLimit), playQueryKeyword: appConfig.playQueryKeyword, playQueryLimit: String(appConfig.playQueryLimit), prefetchCount: String(appConfig.prefetchCount), colorPrefetchCount: String(appConfig.colorPrefetchCount) }
  showConfig.value = true
}
function saveConfig() {
  appConfig.patchConfig({ homeQueryKeyword: draft.value.homeQueryKeyword, homeQueryLimit: Number(draft.value.homeQueryLimit), playQueryKeyword: draft.value.playQueryKeyword, playQueryLimit: Number(draft.value.playQueryLimit), prefetchCount: Number(draft.value.prefetchCount), colorPrefetchCount: Number(draft.value.colorPrefetchCount) })
  showConfig.value = false; showToast('配置已保存')
}

async function installPwa() {
  const result = await requestPwaInstall()
  if (result === 'installed') {
    showToast('当前已是主屏应用')
    return
  }
  if (result === 'prompted') return

  const isIosGuide = result === 'ios-guide'
  await showDialog({
    title: '安装 APP Music',
    message: isIosGuide
      ? '请点击 Safari 底部的分享按钮，然后选择“添加到主屏幕”，保持“作为网页 App 打开”开启。'
      : '请打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。',
    confirmButtonText: '知道了'
  })
}
</script>

<style scoped>
.mine-page {
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.page-scroll-inner {
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── 封面流背景（随页面滚动）─────────────────────────────────────────── */
.hero-bg {
  height: 52vh;
  min-height: 310px;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  touch-action: pan-y;
  transition: height 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), min-height 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
  background: radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--hero-tint) 42%, #1d1623), #090a0e 65%);
}

.hero-bg.expanded {
  height: 100dvh;
  min-height: 100dvh;
}

.cover-marquee {
  position: absolute;
  z-index: 1;
  inset: -30% -2% -24%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  opacity: 0.94;
  filter: saturate(0.98) contrast(1.02);
}

.cover-column {
  display: flex;
  flex-direction: column;
  gap: 10px;
  will-change: transform;
  animation: cover-flow-up 70s linear infinite;
}

.cover-column:nth-child(2) { animation-duration: 82s; animation-delay: -24s; }
.cover-column:nth-child(3) { animation-duration: 76s; animation-delay: -46s; }
.cover-column-down { animation-name: cover-flow-down; }

.cover-tile {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border-radius: 15px;
  padding: 0;
  border: 0;
  background: #26242a;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.36);
  position: relative;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cover-tile:disabled { cursor: default; }
.hero-bg.expanded .cover-tile:not(:disabled) { cursor: pointer; }
.hero-bg.expanded .cover-tile:not(:disabled):active { transform: scale(0.94); }
.cover-tile.is-current { box-shadow: 0 0 0 2px rgba(255,255,255,0.94), 0 12px 30px rgba(0,0,0,0.46); }

.cover-playing-indicator {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  background: rgba(0,0,0,0.26);
}

.playing-bar {
  width: 5px;
  height: 18px;
  border-radius: 99px;
  background: #fff;
  transform-origin: center;
  animation: playing-pulse 0.78s ease-in-out infinite alternate;
}

.playing-bar:nth-child(2) { height: 28px; animation-delay: -0.28s; }
.playing-bar:nth-child(3) { height: 13px; animation-delay: -0.5s; }

@keyframes playing-pulse {
  from { transform: scaleY(0.45); opacity: 0.68; }
  to { transform: scaleY(1); opacity: 1; }
}

.cover-tile img, .cover-tile-fallback {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-tile-fallback {
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, color-mix(in srgb, var(--tile-accent) 72%, #ffffff), var(--tile-accent) 55%, #121217);
  color: rgba(255,255,255,0.92);
  font-size: clamp(18px, 7vw, 34px);
  font-family: Georgia, 'Songti SC', serif;
  text-shadow: 0 3px 16px rgba(0,0,0,0.42);
}

.hero-overlay {
  position: absolute;
  z-index: 2;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(5,5,8,0.1) 0%, rgba(5,5,8,0.03) 36%, rgba(5,5,8,0.6) 100%),
    linear-gradient(90deg, rgba(7,7,10,0.2), transparent 52%, rgba(7,7,10,0.16));
  transition: background 0.5s ease;
}

.hero-bg.expanded .hero-overlay {
  background:
    linear-gradient(180deg, rgba(5,5,8,0.12) 0%, rgba(5,5,8,0) 45%, rgba(5,5,8,0.56) 100%),
    linear-gradient(90deg, rgba(7,7,10,0.12), transparent 54%, rgba(7,7,10,0.1));
}

.hero-content {
  position: relative;
  z-index: 3;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  transform: translateY(var(--cover-pull-distance, 0));
  transition: transform 0.26s ease;
  justify-content: flex-end;
  padding-bottom: calc(var(--safe-bottom) + 18px);
  background: linear-gradient(180deg, transparent 54%, rgba(7,7,10,0.72) 100%);
  pointer-events: none;
}

.hero-top {
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
  display: flex; align-items: center; justify-content: space-between;
  padding-top: calc(env(safe-area-inset-top, 0px) + 10px);
  pointer-events: auto;
}
.hero-label { font-size: 13px; color: var(--text-secondary); }
.hero-btn, .hero-back {
  width: 36px; height: 36px; border-radius: 50%;
  border: 1px solid var(--border-light); background: var(--surface-2);
  color: #fff; display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px);
}
.hero-back { flex: 0 0 auto; background: rgba(0,0,0,0.32); }

.hero-bottom-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  pointer-events: auto;
}

.hero-center {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  grid-template-rows: auto auto;
  align-items: center;
  column-gap: 10px;
}
.user-avatar {
  grid-row: 1 / 3;
  width: 42px; height: 42px; border-radius: 14px;
  background: var(--surface-3); border: 1px solid var(--border-light);
  display: flex; align-items: center; justify-content: center;
  backdrop-filter: blur(8px);
}
.user-avatar span { font-size: 20px; font-weight: 800; color: var(--dominant-color, #ff6b6b); }
.user-name { margin: 0; font-size: 17px; font-weight: 800; color: #fff; white-space: nowrap; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.user-stats { margin: 2px 0 0; font-size: 11px; color: rgba(255,255,255,0.68); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.hero-actions {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 6px;
}
.ha-btn {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  width: 34px; height: 34px; padding: 0; border-radius: 50%;
  border: 1px solid var(--border-light); background: var(--surface-2);
  color: var(--text-primary); font-size: 0; font-weight: 500;
  cursor: pointer; backdrop-filter: blur(8px); transition: transform 0.15s ease;
}
.ha-btn:active { transform: scale(0.95); }

.hero-bg.expanded .hero-content {
  justify-content: flex-end;
  padding-bottom: calc(var(--safe-bottom) + 24px);
  transform: none;
  background: linear-gradient(180deg, transparent 42%, rgba(7,7,10,0.78) 100%);
}

.hero-bg.expanded .hero-top {
  position: absolute;
  top: 0;
  left: 24px;
  right: 24px;
}

.hero-bg.expanded .hero-center {
  flex: 1;
}

.hero-bg.expanded .user-name { font-size: 18px; }
.hero-bg.expanded .hero-actions { justify-content: flex-end; }

@keyframes cover-flow-up { from { transform: translateY(0); } to { transform: translateY(-50%); } }
@keyframes cover-flow-down { from { transform: translateY(-50%); } to { transform: translateY(0); } }

@media (prefers-reduced-motion: reduce) {
  .cover-column { animation: none; }
}

/* ── 内容区 ──────────────────────────────────────────────────────────── */
.content-area {
  padding: 20px 16px 0;
  background: transparent;
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
.setting-item .setting-tail { color: var(--dominant-accent); font-size: 11px; font-weight: 600; }

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
.config-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 16px; padding: 12px 0 calc(var(--playerbar-height) + var(--tabbar-height) + var(--safe-bottom) + 16px); }
.cfg-btn { height: 44px; border: none; border-radius: 14px; font-size: 14px; font-weight: 700; cursor: pointer; }
.cfg-btn.ghost { color: var(--text-secondary); background: var(--surface-1); }
.cfg-btn.primary { color: var(--text-on-brand); background: var(--brand-grad); box-shadow: var(--dominant-glow); }

@keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>
