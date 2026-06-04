// src/stores/player.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import type { Track, LyricLine, PlayMode, PlayContext } from '@/types/music'
import { parseLrc, findCurrentLyricIndex } from '@/utils/lyric'
import { fetchTrackDetails, searchAllSources, AVAILABLE_SOURCES } from '@/api'
import { dbSetCachedTrack, dbGetCachedTrack, dbDeleteCachedTrack } from '@/utils/db'
import { computeDominantVars } from '@/utils/color'
import { showToast } from 'vant'
import { useColorExtract } from '@/composables/useColorExtract'
import { useAppConfigStore } from '@/stores/appConfig'

const PLAYER_SESSION_KEY = 'xf-player-session-v1'

interface PlayerSessionSnapshot {
  currentTrack: Track | null
  queue: Track[]
  playContext: PlayContext
  playMode: PlayMode
  currentTime: number
  volume: number
  muted: boolean
  dominantColor: string
  /** 保存时是否正在播放（用于判断是否为异常中断） */
  wasPlaying: boolean
  /** 保存时间戳 */
  savedAt: number
}

/** 设置主导色及全部衍生变量（参考 tabbar 的亮暗自适应策略） */
function applyDominantColor(color: string) {
  const el = document.documentElement
  el.style.setProperty('--dominant-color', color)
  // 根据当前主题 + 主导色亮度计算衍生变量
  const isDark = el.getAttribute('data-theme') !== 'light'
  const isDominant = el.hasAttribute('data-immersive')
  const vars = computeDominantVars(color, isDark, isDominant)
  for (const [key, val] of Object.entries(vars)) {
    el.style.setProperty(key, val)
  }
  // dominant 模式：覆盖全局文字颜色以适应主导色亮暗
  if (isDominant && vars['--dominant-page-text']) {
    el.style.setProperty('--text-primary', vars['--dominant-page-text'])
    el.style.setProperty('--text-secondary', vars['--dominant-page-text-secondary'] || vars['--dominant-page-text'])
  }
}

function hasMediaSessionSupport() {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator
}

export const usePlayerStore = defineStore('player', () => {
  const appConfig = useAppConfigStore()

  // ── State ────────────────────────────────────────────────────────────────
  const currentTrack = ref<Track | null>(null)
  const queue = ref<Track[]>([])
  const playContext = ref<PlayContext>({ type: 'results' })
  const isPlaying = ref(false)
  const playMode = ref<PlayMode>('list')
  const progress = ref(0)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const muted = ref(false)
  const lyricLines = ref<LyricLine[]>([])
  const currentLyricIndex = ref(-1)
  const FALLBACK_COLOR = '#FF6B6B'
  const dominantColor = ref(FALLBACK_COLOR)
  const isLoadingDetails = ref(false)
  const pendingAutoPlay = ref(false)
  let isRestoringSession = false
  let sessionSaveTimer: ReturnType<typeof setTimeout> | null = null
  let currentColorTaskId = 0
  let _playSwitchGeneration = 0
  let _playNextDepth = 0
  const MAX_PLAY_NEXT_DEPTH = 10
  /** 本轮 playNext 调用链中已尝试过的 uid，跳过不重试 */
  let _playNextTriedUids = new Set<string>()
  /** playNext 连续失败计数，防止异步场景下的死循环 */
  let _playNextFailCount = 0
  const MAX_PLAY_NEXT_FAIL = 20
  /** 上次成功播放的时间戳，用于冷却判断 */
  let _lastPlaySuccessAt = 0

  // ── 颜色提取 ─────────────────────────────────────────────────────────────
  const { extract, peek, prefetch } = useColorExtract()

  async function syncTrackColor(coverUrl?: string) {
    const taskId = ++currentColorTaskId
    if (!coverUrl) {
      // 没有封面时保留上一首的颜色
      const fallback = dominantColor.value || FALLBACK_COLOR
      applyDominantColor(fallback)
      scheduleSessionSave()
      return
    }

    // 优先从缓存获取（瞬间应用，无闪烁）
    const cachedColor = peek(coverUrl)
    if (cachedColor) {
      dominantColor.value = cachedColor
      applyDominantColor(cachedColor)
      scheduleSessionSave()
      return
    }

    // 缓存未命中 → 提取主色
    const prevColor = dominantColor.value
    const color = await extract(coverUrl)
    // 提取失败（返回默认色）时保留上一首的有效色，避免闪烁
    const finalColor = (color === FALLBACK_COLOR && prevColor && prevColor !== FALLBACK_COLOR) ? prevColor : color
    if (taskId !== currentColorTaskId || currentTrack.value?.cover !== coverUrl) return
    dominantColor.value = finalColor
    applyDominantColor(finalColor)
    scheduleSessionSave()
  }

  function collectUpcomingTracks(count: number) {
    const list = queue.value
    const idx = currentIndex.value
    if (!list.length || count <= 0) return [] as Track[]
    const startIndex = idx >= 0 ? idx : 0
    const total = Math.min(count, list.length)
    return Array.from({ length: total }, (_, offset) => list[(startIndex + offset) % list.length]).filter(Boolean)
  }

  async function warmupTrackVisuals() {
    const covers = collectUpcomingTracks(appConfig.colorPrefetchCount).map((track) => track.cover)
    await prefetch(covers)
  }

  function buildSessionSnapshot(): PlayerSessionSnapshot {
    return {
      currentTrack: currentTrack.value ? { ...currentTrack.value } : null,
      queue: queue.value.map((track) => ({ ...track })),
      playContext: { ...playContext.value },
      playMode: playMode.value,
      currentTime: currentTime.value,
      volume: volume.value,
      muted: muted.value,
      dominantColor: dominantColor.value,
      wasPlaying: isPlaying.value,
      savedAt: Date.now()
    }
  }

  function saveSession() {
    if (typeof window === 'undefined' || isRestoringSession) return
    try {
      window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(buildSessionSnapshot()))
    } catch {
      // 忽略持久化失败
    }
  }

  function scheduleSessionSave() {
    if (sessionSaveTimer) return
    sessionSaveTimer = setTimeout(() => {
      sessionSaveTimer = null
      saveSession()
    }, 240)
  }

  function restoreSession() {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(PLAYER_SESSION_KEY)
      if (!raw) return
      const snapshot = JSON.parse(raw) as Partial<PlayerSessionSnapshot>
      if (!snapshot.currentTrack) return

      const sessionTTL = appConfig.sessionTTLMinutes * 60 * 1000
      const savedAt = snapshot.savedAt || 0
      const isExpired = Date.now() - savedAt > sessionTTL
      // 上次保存时正在播放 = 异常中断（正常退出会暂停后保存）
      const wasInterrupted = Boolean(snapshot.wasPlaying)

      isRestoringSession = true
      currentTrack.value = { ...snapshot.currentTrack }
      queue.value = Array.isArray(snapshot.queue) ? snapshot.queue.map((track) => ({ ...track })) : [{ ...snapshot.currentTrack }]
      playContext.value = snapshot.playContext ? { ...snapshot.playContext } : { type: 'results' }
      playMode.value = snapshot.playMode ?? 'list'
      volume.value = typeof snapshot.volume === 'number' ? snapshot.volume : 0.8
      muted.value = Boolean(snapshot.muted)
      lyricLines.value = parseLrc(snapshot.currentTrack.lrc || '')
      currentLyricIndex.value = snapshot.currentTime ? findCurrentLyricIndex(lyricLines.value, snapshot.currentTime) : -1
      currentTime.value = typeof snapshot.currentTime === 'number' ? snapshot.currentTime : 0
      progress.value = 0
      dominantColor.value = snapshot.dominantColor || peek(snapshot.currentTrack.cover || '') || FALLBACK_COLOR
      applyDominantColor(dominantColor.value)

      if (isExpired) {
        // 会话过期：保留歌曲信息展示，但标记需要重新获取详情
        currentTrack.value = { ...currentTrack.value, audioUrl: '', detailsLoaded: false, _retried: false }
        // 异步重新获取详情（不自动播放）
        const trackToRefresh = currentTrack.value
        setTimeout(async () => {
          try {
            const fresh = await fetchTrackDetails(trackToRefresh)
            if (currentTrack.value?.uid === trackToRefresh.uid) {
              currentTrack.value = fresh
              lyricLines.value = parseLrc(fresh.lrc || '')
              const qi = queue.value.findIndex((x) => x.uid === fresh.uid)
              if (qi !== -1) queue.value[qi] = { ...fresh }
              dbSetCachedTrack(fresh).catch(() => {})
              syncMediaSessionMetadata()
              if (fresh.audioUrl) {
                const audio = getAudio()
                audio.src = fresh.audioUrl
                audio.preload = 'auto'
              }
            }
          } catch {
            // 刷新失败静默处理
          }
        }, 100)
      } else if (snapshot.currentTrack.audioUrl) {
        // 未过期：正常恢复音频
        const audio = getAudio()
        audio.src = snapshot.currentTrack.audioUrl
        audio.preload = 'auto'
        audio.volume = volume.value
        audio.muted = muted.value
        const restoreTime = currentTime.value
        const onLoadedMetadata = () => {
          audio.currentTime = Math.max(0, Math.min(restoreTime, audio.duration || restoreTime))
          duration.value = audio.duration || 0
          progress.value = duration.value > 0 ? currentTime.value / duration.value : 0
          audio.removeEventListener('loadedmetadata', onLoadedMetadata)
          // 仅在异常中断时自动恢复播放
          if (wasInterrupted) {
            audio.play().catch(() => {})
          }
        }
        audio.addEventListener('loadedmetadata', onLoadedMetadata)
      }
    } catch {
      // 忽略损坏缓存
    } finally {
      isRestoringSession = false
    }
  }

  // 监听封面变化，优先命中缓存主色
  watch(
    () => currentTrack.value?.cover,
    (url) => {
      void syncTrackColor(url)
    },
    { immediate: true }
  )

  // ── Audio 单例 ────────────────────────────────────────────────────────────
  let _audio: HTMLAudioElement | null = null

  function getAudio(): HTMLAudioElement {
    if (!_audio) {
      _audio = new Audio()
      _audio.volume = volume.value
      _audio.muted = muted.value
      _audio.preload = 'metadata'

      _audio.addEventListener('timeupdate', () => {
        currentTime.value = _audio!.currentTime
        duration.value = _audio!.duration || 0
        progress.value = duration.value > 0 ? currentTime.value / duration.value : 0
        currentLyricIndex.value = findCurrentLyricIndex(lyricLines.value, currentTime.value)
        syncMediaSessionPosition()
        scheduleSessionSave()
      })
      _audio.addEventListener('play', () => {
        isPlaying.value = true
        syncMediaSessionState()
        scheduleSessionSave()
      })
      _audio.addEventListener('pause', () => {
        isPlaying.value = false
        syncMediaSessionState()
        scheduleSessionSave()
      })
      _audio.addEventListener('ended', () => {
        syncMediaSessionState()
        playNext('next')
      })
      _audio.addEventListener('error', () => {
        // 没有 src 时的 error 是正常的，忽略
        if (!_audio?.src) return
        const err = _audio.error
        console.warn('[audio error]', err?.code, err?.message, 'src:', _audio.src?.slice(0, 80))
        isPlaying.value = false
        syncMediaSessionState()
        // 音频加载失败：清除缓存、从队列移除、播放下一首
        const failedTrack = currentTrack.value
        showToast('播放失败，已跳过')
        if (failedTrack) {
          dbDeleteCachedTrack(failedTrack.uid).catch(() => {})
          const removeIdx = queue.value.findIndex(x => x.uid === failedTrack.uid)
          if (removeIdx !== -1) {
            queue.value.splice(removeIdx, 1)
            // 直接定位到被删除位置的下一首，避免回退到队首
            if (queue.value.length) {
              const nextIdx = removeIdx % queue.value.length
              const next = queue.value[nextIdx]
              if (next?.audioUrl) {
                currentTrack.value = next
                const a = getAudio()
                a.src = next.audioUrl
                a.currentTime = 0
                a.play().catch(() => {})
                return
              }
              // 没有 audioUrl，让 playNext 处理详情获取
              currentTrack.value = null
              playNext('next')
              return
            }
          }
        }
        // 队列为空
        currentTrack.value = null
        currentTime.value = 0; duration.value = 0; progress.value = 0
      })
      _audio.addEventListener('loadedmetadata', () => {
        duration.value = _audio!.duration || 0
        // 将真实时长回写到 currentTrack 并同步到收藏/歌单
        const realDuration = Math.round(duration.value)
        if (currentTrack.value && realDuration > 0 && currentTrack.value.duration !== realDuration) {
          currentTrack.value = { ...currentTrack.value, duration: realDuration }
          dbSetCachedTrack(currentTrack.value).catch(() => {})
          // 延迟同步，确保 playlist store 已完成初始化和回调注册
          setTimeout(() => _syncTrackCallback?.(currentTrack.value!), 0)
        }
        syncMediaSessionPosition()
        scheduleSessionSave()
      })
    }
    return _audio
  }

  function buildArtwork(track: Track) {
    if (!track.cover) return []
    return [96, 128, 192, 256, 384, 512].map((size) => ({
      src: track.cover!,
      sizes: `${size}x${size}`,
      type: 'image/jpeg'
    }))
  }

  function syncMediaSessionState() {
    if (!hasMediaSessionSupport()) return
    navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused'
  }

  function syncMediaSessionMetadata() {
    if (!hasMediaSessionSupport()) return
    const track = currentTrack.value
    if (!track) {
      navigator.mediaSession.metadata = null
      syncMediaSessionState()
      return
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || '未知歌曲',
      artist: track.artist || '未知歌手',
      album: track.album || 'XF Music',
      artwork: buildArtwork(track)
    })
    syncMediaSessionState()
    syncMediaSessionPosition()
  }

  function syncMediaSessionPosition() {
    if (!hasMediaSessionSupport()) return
    const audio = _audio
    const playbackRate = audio?.playbackRate || 1
    const position = audio?.currentTime || 0
    const mediaDuration = Number.isFinite(audio?.duration) ? audio!.duration : duration.value

    if (!mediaDuration || !Number.isFinite(mediaDuration) || mediaDuration <= 0) return

    try {
      navigator.mediaSession.setPositionState({
        duration: mediaDuration,
        playbackRate,
        position: Math.min(Math.max(position, 0), mediaDuration)
      })
    } catch {
      // iOS/Safari 部分版本不支持 positionState，静默降级
    }
  }

  function bindMediaSessionActions() {
    if (!hasMediaSessionSupport()) return

    const safeBind = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // 部分浏览器不支持全部 action，静默降级
      }
    }

    safeBind('play', async () => {
      const audio = getAudio()
      if (!audio.src && currentTrack.value?.audioUrl) {
        audio.src = currentTrack.value.audioUrl
      }
      await audio.play().catch(() => {})
    })
    safeBind('pause', () => {
      getAudio().pause()
    })
    safeBind('previoustrack', () => {
      playNext('prev')
    })
    safeBind('nexttrack', () => {
      playNext('next')
    })
    safeBind('seekbackward', (details) => {
      const offset = details.seekOffset ?? 10
      seekToTime(currentTime.value - offset)
      syncMediaSessionPosition()
    })
    safeBind('seekforward', (details) => {
      const offset = details.seekOffset ?? 10
      seekToTime(currentTime.value + offset)
      syncMediaSessionPosition()
    })
    safeBind('seekto', (details) => {
      if (typeof details.seekTime !== 'number') return
      seekToTime(details.seekTime)
      syncMediaSessionPosition()
    })
  }

  bindMediaSessionActions()

  watch(currentTrack, () => {
    syncMediaSessionMetadata()
    void warmupTrackVisuals()
  })

  watch(isPlaying, () => {
    syncMediaSessionState()
  })

  watch(
    [currentTrack, queue, playContext, playMode, volume, muted],
    () => {
      scheduleSessionSave()
    },
    { deep: true }
  )

  // ── Computed ──────────────────────────────────────────────────────────────
  const currentIndex = computed(() => queue.value.findIndex((t) => t.uid === currentTrack.value?.uid))

  // ── Actions ───────────────────────────────────────────────────────────────
  /** 音频链接有效期（6 小时） */
  const URL_TTL = 6 * 60 * 60 * 1000

  function isAudioUrlExpired(track: Track): boolean {
    if (!track.audioUrl) return false
    if (!track.urlFetchedAt) return true
    return Date.now() - track.urlFetchedAt > URL_TTL
  }

  // ── 预加载系统 ─────────────────────────────────────────────────────────
  const PREFETCH_AHEAD = 5
  /** uid → 预加载好的完整 Track（已验证 audioUrl / lrc / 封面色） */
  const prefetchedMap = new Map<string, Track>()
  /** uid → 预加载好的封面主色 */
  const prefetchedColors = new Map<string, string>()
  /** 正在预加载中的 uid 集合，防止重复 */
  const prefetchingUids = new Set<string>()

  /** 预加载单首歌曲：获取详情 + 校验 audioUrl + 提取主色 */
  async function prefetchSingle(track: Track): Promise<boolean> {
    if (prefetchedMap.has(track.uid) || prefetchingUids.has(track.uid)) return true
    prefetchingUids.add(track.uid)
    try {
      let t = track
      if (shouldFetchDetails(t)) {
        const cached = await dbGetCachedTrack(t.uid)
        if (cached && !shouldFetchDetails(cached)) {
          t = { ...cached }
        } else {
          t = await fetchTrackDetails(t)
          await dbSetCachedTrack(t)
        }
      }
      if (!t.audioUrl) return false

      // 提取封面主色
      if (t.cover) {
        const color = peek(t.cover) || (await extract(t.cover))
        prefetchedColors.set(t.uid, color)
      }

      // 同步更新 queue 中对应项
      const qi = queue.value.findIndex((x) => x.uid === t.uid)
      if (qi !== -1) queue.value[qi] = { ...t }

      prefetchedMap.set(t.uid, t)
      return true
    } catch {
      return false
    } finally {
      prefetchingUids.delete(track.uid)
    }
  }

  /** 获取当前位置之后需要预加载的歌曲列表 */
  function getUpcomingTracks(count: number): Track[] {
    const list = queue.value
    if (!list.length) return []
    const idx = currentIndex.value
    const start = idx >= 0 ? idx + 1 : 0
    const result: Track[] = []
    for (let i = 0; i < list.length && result.length < count; i++) {
      const t = list[(start + i) % list.length]
      if (t && !prefetchedMap.has(t.uid)) result.push(t)
    }
    return result
  }

  /** 后台预加载接下来的歌曲，跳过失败的 */
  async function prefetchAhead() {
    const upcoming = getUpcomingTracks(PREFETCH_AHEAD * 2) // 多取一些以容错
    let readyCount = prefetchedMap.size
    for (const track of upcoming) {
      if (readyCount >= PREFETCH_AHEAD) break
      if (prefetchedMap.has(track.uid)) {
        readyCount++
        continue
      }
      const ok = await prefetchSingle(track)
      if (ok) readyCount++
      // 失败的歌从队列中移除，避免切到时还要等
      if (!ok) {
        const removeIdx = queue.value.findIndex((x) => x.uid === track.uid)
        if (removeIdx !== -1 && queue.value[removeIdx]?.uid !== currentTrack.value?.uid) {
          queue.value.splice(removeIdx, 1)
        }
      }
    }
  }

  /** 清理已播放过的预加载缓存 */
  function cleanPrefetchCache(keepUid: string) {
    for (const uid of prefetchedMap.keys()) {
      if (uid !== keepUid) {
        // 保留队列中即将播放的，其余清除
        const inUpcoming = getUpcomingTracks(PREFETCH_AHEAD).some((t) => t.uid === uid)
        if (!inUpcoming) {
          prefetchedMap.delete(uid)
          prefetchedColors.delete(uid)
        }
      }
    }
  }

  function shouldFetchDetails(track: Track) {
    // 已标记为无音源的歌曲不重试（避免无限循环）
    if (track._noAudio) return false
    if (!track.detailsLoaded) return true
    if (!track.audioUrl) return true
    if (isAudioUrlExpired(track)) return true
    if (!track.lyricFetched && !track.lrc) return true
    return false
  }

  /** 跨平台 fallback：主平台无音频时，搜索其他平台获取同名歌曲的播放链接 */
  async function crossPlatformFallback(track: Track): Promise<Track> {
    // 选择其他平台（排除当前平台）
    const otherSources = AVAILABLE_SOURCES.filter(s => s !== track.source)
    if (!otherSources.length) return { ...track, _noAudio: true }

    try {
      const keyword = `${track.title} ${track.artist}`.trim()
      const results = await searchAllSources({ keyword, limit: 3 }, otherSources)
      // 找到同名同歌手的歌曲
      const match = results.find(r =>
        r.title === track.title && r.artist === track.artist
      ) || results.find(r =>
        r.title.includes(track.title) || track.title.includes(r.title)
      )

      if (match) {
        const detailed = await fetchTrackDetails(match)
        if (detailed.audioUrl) {
          // 用匹配到的音频链接更新当前 track
          const updated = {
            ...track,
            audioUrl: detailed.audioUrl,
            urlFetchedAt: Date.now(),
            detailsLoaded: true,
            _noAudio: false
          }
          await dbSetCachedTrack(updated)
          return updated
        }
      }
    } catch (e) {
      console.warn('[crossPlatformFallback]', e)
    }

    return { ...track, _noAudio: true }
  }

  async function playTrack(track: Track, newQueue?: Track[], context?: PlayContext) {
    // 生成切换代数，防止过期异步操作覆盖新状态
    const switchGen = ++_playSwitchGeneration

    // 立即停止当前音频，重置进度
    // 只 pause 不动 src，等后面设置新 src 时自然替换
    if (_audio) _audio.pause()
    currentTime.value = 0; duration.value = 0; progress.value = 0; isPlaying.value = false

    // 先设置队列和上下文（让 UI 立即响应）
    if (newQueue) {
      queue.value = newQueue
      // 切换队列时清空预加载缓存
      prefetchedMap.clear()
      prefetchedColors.clear()
    }
    if (context) playContext.value = context

    // 优先使用预加载缓存（瞬时切换，无 loading）
    const prefetched = prefetchedMap.get(track.uid)
    let t = prefetched ? { ...prefetched } : track

    // 立即应用预加载的主色（避免闪烁）
    const preColor = prefetchedColors.get(track.uid) || peek(track.cover || '')
    if (preColor) {
      dominantColor.value = preColor
      applyDominantColor(preColor)
    }

    currentTrack.value = { ...t }
    lyricLines.value = parseLrc(t.lrc || '')
    currentLyricIndex.value = -1
    currentTime.value = 0
    duration.value = 0
    progress.value = 0
    syncMediaSessionMetadata()

    // 没有预加载缓存时才走网络请求
    // 代数守卫：如果在异步获取详情期间又切了歌，直接丢弃
    if (switchGen !== _playSwitchGeneration) return

    if (!prefetched && shouldFetchDetails(t)) {
      const cached = await dbGetCachedTrack(t.uid)
      if (cached && !shouldFetchDetails(cached)) {
        t = { ...cached }
      } else {
        isLoadingDetails.value = true
        try {
          t = await fetchTrackDetails(t)
          if (t.audioUrl) {
            await dbSetCachedTrack(t)
          } else {
            // 主平台无音频，尝试跨平台 fallback
            t = await crossPlatformFallback(t)
          }
        } catch (e) {
          console.warn('[fetchDetails]', e)
          dbDeleteCachedTrack(t.uid).catch(() => {})
          t = { ...t, audioUrl: '', detailsLoaded: false, _noAudio: true }
          showToast('歌曲链接获取失败，已跳过')
        } finally {
          isLoadingDetails.value = false
        }
      }
      const qi = queue.value.findIndex((x) => x.uid === t.uid)
      if (qi !== -1) queue.value[qi] = { ...t }
    }

    currentTrack.value = t
    lyricLines.value = parseLrc(t.lrc || '')
    currentLyricIndex.value = -1
    syncMediaSessionMetadata()

    if (!prefetched) {
      // 非预加载的歌曲仍需提色
      void warmupTrackVisuals()
    }

    dbSetCachedTrack(t).catch(() => {})
    _syncTrackCallback?.(t)
    _pushHistoryCallback?.(t)

    // 清理旧缓存，触发新一轮预加载
    cleanPrefetchCache(t.uid)
    void prefetchAhead()

    // 再次代数守卫
    if (switchGen !== _playSwitchGeneration) return

    if (!t.audioUrl) {
      console.warn('[playTrack] no audioUrl for:', t.title, t.source, t.uid)
      showToast('暂无可用音源，已跳过')
      const removeIdx = queue.value.findIndex(x => x.uid === t.uid)
      if (removeIdx !== -1) queue.value.splice(removeIdx, 1)
      if (queue.value.length) {
        // 不清除 currentTrack，让 playNext 基于当前位置找下一首
        setTimeout(() => playNext('next'), 300)
      } else {
        currentTrack.value = null
        currentTime.value = 0; duration.value = 0; progress.value = 0
      }
      return
    }

    const a = getAudio()
    a.src = t.audioUrl
    a.currentTime = 0
    // 显式触发加载（部分浏览器不会自动加载通过 JS 设置的 src）
    a.load()
    currentTime.value = 0; duration.value = 0; progress.value = 0
    try {
      await a.play()
      // 播放成功：重置失败计数和已尝试列表
      _playNextFailCount = 0
      _playNextTriedUids.clear()
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.warn('[play] AbortError (normal during track switch)')
        return
      }
      if (err?.name === 'NotAllowedError') {
        console.warn('[play] NotAllowedError (autoplay blocked)')
        pendingAutoPlay.value = true
        return
      }
      console.warn('[play error]', err?.name, err?.message, 'src:', t.audioUrl?.slice(0, 80))
      showToast('播放失败，已跳过')
      // 播放失败时从队列移除，直接播放下一首
      const removeIdx = queue.value.findIndex(x => x.uid === t.uid)
      if (removeIdx !== -1) {
        queue.value.splice(removeIdx, 1)
        if (queue.value.length) {
          const nextIdx = removeIdx % queue.value.length
          const next = queue.value[nextIdx]
          if (next?.audioUrl) {
            currentTrack.value = next
            const a = getAudio()
            a.src = next.audioUrl
            a.currentTime = 0
            a.play().catch(() => {})
            return
          }
          currentTrack.value = null
          setTimeout(() => playNext('next'), 300)
        } else {
          currentTrack.value = null
          currentTime.value = 0; duration.value = 0; progress.value = 0
        }
      } else {
        currentTrack.value = null
        currentTime.value = 0; duration.value = 0; progress.value = 0
      }
    }
  }

  // 搜索场景：插入歌曲到当前播放位置之后并播放，不替换整个队列
  async function insertAndPlay(track: Track) {
    const idx = currentIndex.value
    // 如果队列为空，直接设置
    if (!queue.value.length) {
      return playTrack(track, [track], { type: 'results' })
    }
    // 去重：如果队列中已存在同 uid 的歌曲先移除
    const existIdx = queue.value.findIndex((t) => t.uid === track.uid)
    if (existIdx !== -1) queue.value.splice(existIdx, 1)
    // 插入到当前歌曲之后
    const insertAt = idx >= 0 ? idx + 1 : queue.value.length
    queue.value.splice(insertAt, 0, track)
    // 播放这首歌（不传 newQueue，保留当前队列）
    await playTrack(track)
  }

  // 仅加载歌曲信息，不自动播放
  async function loadTrackOnly(track: Track, newQueue?: Track[], context?: PlayContext) {
    if (newQueue) queue.value = newQueue
    if (context) playContext.value = context

    let t = track

    const cachedColor = peek(track.cover || '')
    if (cachedColor) {
      dominantColor.value = cachedColor
      applyDominantColor(cachedColor)
    }

    currentTrack.value = { ...track }
    lyricLines.value = parseLrc(track.lrc || '')
    currentLyricIndex.value = -1
    currentTime.value = 0
    duration.value = 0
    progress.value = 0
    syncMediaSessionMetadata()

    if (shouldFetchDetails(t)) {
      const cached = await dbGetCachedTrack(t.uid)
      if (cached && !shouldFetchDetails(cached)) {
        t = { ...cached }
      } else {
        isLoadingDetails.value = true
        try {
          t = await fetchTrackDetails(t)
          await dbSetCachedTrack(t)
        } catch (e) {
          console.warn('[fetchDetails]', e)
        } finally {
          isLoadingDetails.value = false
        }
      }
      const qi = queue.value.findIndex((x) => x.uid === t.uid)
      if (qi !== -1) queue.value[qi] = { ...t }
    }

    currentTrack.value = t
    lyricLines.value = parseLrc(t.lrc || '')
    currentLyricIndex.value = -1
    syncMediaSessionMetadata()
    void warmupTrackVisuals()

    // 所有加载的歌曲都缓存到 IndexedDB
    dbSetCachedTrack(t).catch(() => {})

    // 预加载音频但不播放
    if (t.audioUrl) {
      const a = getAudio()
      a.src = t.audioUrl
      a.currentTime = 0
    }

    // 触发后台预加载
    void prefetchAhead()
  }

  // 历史记录回调（由 playlist store 注册，避免循环依赖）
  let _pushHistoryCallback: ((track: Track) => void) | null = null
  function registerHistoryCallback(cb: (track: Track) => void) {
    _pushHistoryCallback = cb
  }

  // 同步歌曲详情回调（详情加载后同步 duration 等字段到收藏/歌单）
  let _syncTrackCallback: ((track: Track) => void) | null = null
  function registerSyncTrackCallback(cb: (track: Track) => void) {
    _syncTrackCallback = cb
  }

  function playNext(dir: 'next' | 'prev') {
    const list = queue.value
    if (!list.length) {
      currentTrack.value = null
      currentTime.value = 0; duration.value = 0; progress.value = 0
      isPlaying.value = false
      return
    }
    const rawIdx = currentIndex.value
    // 当 currentTrack 已从队列移除时 idx=-1，修正起点：
    // next → 从队首开始(0)，prev → 从队尾开始(len-1)
    const idx = rawIdx >= 0 ? rawIdx : (dir === 'next' ? -1 : 0)

    if (playMode.value === 'single') {
      const a = getAudio()
      a.currentTime = 0
      a.play().catch(() => {})
      return
    }

    // 防死循环：连续失败计数守卫
    _playNextFailCount++
    if (_playNextFailCount > MAX_PLAY_NEXT_FAIL) {
      _playNextFailCount = 0
      _playNextTriedUids.clear()
      showToast('歌曲加载失败过多，请刷新歌单')
      isPlaying.value = false
      return
    }

    // 找到下一首未尝试过的歌
    let nextIdx = -1
    const len = list.length
    for (let i = 0; i < len; i++) {
      const candidateIdx = dir === 'next'
        ? (idx + 1 + i) % len
        : (idx - 1 - i + len) % len
      const candidate = list[candidateIdx]
      if (candidate && !_playNextTriedUids.has(candidate.uid)) {
        nextIdx = candidateIdx
        break
      }
    }

    if (nextIdx === -1) {
      // 所有歌都试过了
      _playNextFailCount = 0
      _playNextTriedUids.clear()
      showToast('所有歌曲加载失败，请刷新歌单')
      isPlaying.value = false
      return
    }

    _playNextTriedUids.add(list[nextIdx].uid)
    playTrack(list[nextIdx])
  }

  function togglePlayPause() {
    const a = getAudio()
    if (isPlaying.value) {
      a.pause()
    } else {
      if (!a.src && currentTrack.value?.audioUrl) {
        a.src = currentTrack.value.audioUrl
      }
      a.play().catch(() => {})
    }
  }

  function seek(ratio: number) {
    const a = getAudio()
    const dur = a.duration || 0
    if (dur > 0) a.currentTime = Math.max(0, Math.min(dur, dur * ratio))
  }

  function seekToTime(sec: number) {
    const a = getAudio()
    if (isFinite(sec)) a.currentTime = Math.max(0, sec)
  }

  function setVolume(v: number) {
    volume.value = v
    getAudio().volume = v
  }

  function toggleMute() {
    muted.value = !muted.value
    getAudio().muted = muted.value
  }

  function setPlayMode(mode: PlayMode) {
    playMode.value = mode
  }

  // ── 预缓存后续歌曲 ────────────────────────────────────────────────────
  let _prefetchAbort: AbortController | null = null

  async function prefetchUpcoming(count = 3) {
    // 取消上一轮预缓存
    _prefetchAbort?.abort()
    _prefetchAbort = new AbortController()
    const signal = _prefetchAbort.signal

    const list = queue.value
    const idx = currentIndex.value
    if (idx < 0 || !list.length) return

    for (let i = 1; i <= count; i++) {
      if (signal.aborted) return
      const ni = (idx + i) % list.length
      const t = list[ni]
      if (!t || !shouldFetchDetails(t)) continue

      try {
        // 先查 IndexedDB
        const cached = await dbGetCachedTrack(t.uid)
        if (cached && !shouldFetchDetails(cached)) {
          list[ni] = { ...cached }
          continue
        }
        if (signal.aborted) return
        const detailed = await fetchTrackDetails(t)
        if (signal.aborted) return
        await dbSetCachedTrack(detailed)
        list[ni] = { ...detailed }
      } catch {
        // 预缓存失败不阻断
      }
    }
  }

  // 当前歌曲变化时自动预缓存
  watch(currentTrack, () => {
    void prefetchUpcoming(appConfig.prefetchCount)
  })

  function setDominantColor(color: string) {
    dominantColor.value = color
  }

  function setQueue(tracks: Track[], ctx: PlayContext) {
    queue.value = tracks
    playContext.value = ctx
    void warmupTrackVisuals()
  }

  restoreSession()

  // 正常退出时标记 wasPlaying=false，区分异常中断
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      const snapshot = buildSessionSnapshot()
      snapshot.wasPlaying = false
      try {
        window.localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(snapshot))
      } catch {
        /* noop */
      }
    })
  }

  /** 用户首次交互时恢复被浏览器拦截的自动播放 */
  function resumePendingPlay() {
    if (!pendingAutoPlay.value) return
    pendingAutoPlay.value = false
    const a = getAudio()
    if (a.src) a.play().catch(() => {})
  }

  return {
    currentTrack,
    queue,
    playContext,
    isPlaying,
    playMode,
    progress,
    currentTime,
    duration,
    volume,
    muted,
    lyricLines,
    currentLyricIndex,
    dominantColor,
    isLoadingDetails,
    pendingAutoPlay,
    currentIndex,
    playTrack,
    resumePendingPlay,
    insertAndPlay,
    loadTrackOnly,
    playNext,
    togglePlayPause,
    seek,
    seekToTime,
    setVolume,
    toggleMute,
    setPlayMode,
    setDominantColor,
    setQueue,
    registerHistoryCallback,
    registerSyncTrackCallback
  }
})
