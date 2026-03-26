// src/utils/color.ts
// 颜色解析、混合与主导色衍生变量计算

/** 解析 hex / rgb() / rgba() 为 [r, g, b] */
export function parseColor(color: string): number[] | null {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const normalized =
      hex.length === 3
        ? hex
            .split('')
            .map((s) => `${s}${s}`)
            .join('')
        : hex
    if (normalized.length !== 6) return null
    return [0, 2, 4].map((i) => parseInt(normalized.substring(i, i + 2), 16))
  }
  const match = color.match(/\d+(?:\.\d+)?/g)
  if (!match || match.length < 3) return null
  return match.slice(0, 3).map(Number)
}

/** 线性插值混合两个颜色，weight 越大越偏向 target */
export function mixColor(source: string, target: string, weight: number): string {
  const from = parseColor(source)
  const to = parseColor(target)
  if (!from || !to) return source
  const w = Math.max(0, Math.min(1, weight))
  const mixed = from.map((c, i) => Math.round(c * (1 - w) + to[i] * w))
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
}

/** 将颜色混合 alpha 级透明度（模拟 color-mix with transparent） */
function mixAlpha(rgb: number[], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`
}

/** BT.601 亮度，0~1 */
export function getLuminance(color: string): number {
  const rgb = parseColor(color)
  if (!rgb) return 0
  return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255
}

/**
 * 参考 tabbar 配色策略，根据主导色动态计算全套衍生变量
 * 底色(tint) / 相近色(border) / 差异色(accent/text) / 光晕(glow)
 * isDominant: 跟随歌曲模式，生成更浓郁的配色（类似 PlayPage）
 */
export function computeDominantVars(dominantColor: string, isDarkTheme: boolean, isDominant = false) {
  const rgb = parseColor(dominantColor)
  if (!rgb) return {}

  const lum = getLuminance(dominantColor)
  const isDominantLight = lum > 0.55

  // dominant 模式：底色更浓，类似 PlayPage
  if (isDominant) {
    // 判断主导色亮暗来选前景色
    const isLight = lum > 0.65
    const fgTarget = isLight ? '#000000' : '#ffffff'
    const bgDarken = isLight ? '#FFF7EF' : '#1A1A2E'

    // 底色层 — 浓郁，主导色占 70-90%
    const tint1 = mixColor(dominantColor, bgDarken, isLight ? 0.72 : 0.25)
    const tint2 = mixColor(dominantColor, bgDarken, isLight ? 0.65 : 0.18)
    const tint3 = mixColor(dominantColor, bgDarken, isLight ? 0.56 : 0.12)

    // 边框 — 更显眼
    const borderAlpha = isLight ? 0.22 : 0.2
    const borderStrongAlpha = borderAlpha * 1.8

    // 差异色 — 文字/强调
    const accent = mixColor(dominantColor, fgTarget, isLight ? 0.36 : 0.32)
    const textColor = mixColor(dominantColor, fgTarget, isLight ? 0.56 : 0.28)

    // 光晕
    const glowAlpha = isLight ? 0.1 : 0.24
    const glowStrongAlpha = glowAlpha * 1.6

    // 背景渐变层（参考 PlayPage 的 pageToneStyle）
    const bgStart = mixColor(dominantColor, bgDarken, isLight ? 0.82 : 0.08)
    const bgMid = mixColor(dominantColor, isLight ? '#F4F7FB' : '#141428', isLight ? 0.9 : 0.18)
    const bgEnd = mixColor(dominantColor, isLight ? '#EEF2F8' : '#0E0E1C', isLight ? 0.96 : 0.35)
    const bgGlow = mixColor(dominantColor, bgDarken, isLight ? 0.56 : 0.12)

    // 进度条差异色 — 与主导色对比明显
    const accentBright = mixColor(dominantColor, '#FFFFFF', isLight ? 0.24 : 0.32)
    const progressFill = `linear-gradient(90deg, ${accentBright}, ${dominantColor})`
    const progressTrack = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)'

    return {
      '--dominant-tint-1': tint1,
      '--dominant-tint-2': tint2,
      '--dominant-tint-3': tint3,
      '--dominant-border': mixAlpha(rgb, borderAlpha),
      '--dominant-border-strong': mixAlpha(rgb, borderStrongAlpha),
      '--dominant-accent': accent,
      '--dominant-text': textColor,
      '--dominant-glow': `0 4px 24px ${mixAlpha(rgb, glowAlpha)}`,
      '--dominant-glow-strong': `0 8px 32px ${mixAlpha(rgb, glowStrongAlpha)}`,
      '--dominant-soft': mixColor(dominantColor, bgDarken, 0.6),
      '--dominant-muted': mixColor(dominantColor, bgDarken, 0.36),
      '--dominant-bright': mixColor(dominantColor, fgTarget, isLight ? 0.4 : 0.32),
      // dominant 模式专用渐变层
      '--dominant-bg-start': bgStart,
      '--dominant-bg-mid': bgMid,
      '--dominant-bg-end': bgEnd,
      '--dominant-bg-glow': bgGlow,
      // dominant 模式的文字色（跟随亮暗自适应）
      '--dominant-page-text': isLight ? '#000000' : '#ffffff',
      '--dominant-page-text-secondary': isLight ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
      // 覆盖核心 CSS 变量 — 让所有页面自动着色
      '--bg-base': bgEnd,
      '--bg-canvas': mixColor(dominantColor, isLight ? '#EAE8E3' : '#080810', isLight ? 0.96 : 0.42),
      '--bg-sheet': mixAlpha(parseColor(bgMid)!, isLight ? 0.92 : 0.85),
      '--bg-card': mixAlpha(parseColor(tint1)!, isLight ? 0.9 : 0.82),
      '--bg-input': mixAlpha(rgb, isLight ? 0.08 : 0.12),
      '--bg-active': mixAlpha(rgb, isLight ? 0.1 : 0.14),
      '--bg-active-hover': mixAlpha(rgb, isLight ? 0.14 : 0.2),
      '--bg-overlay': mixAlpha(parseColor(bgEnd)!, 0.52),
      '--surface-1': mixAlpha(parseColor(isLight ? '#ffffff' : '#ffffff')!, isLight ? 0.12 : 0.06),
      '--surface-2': mixAlpha(parseColor('#ffffff')!, isLight ? 0.18 : 0.1),
      '--surface-3': mixAlpha(parseColor('#ffffff')!, isLight ? 0.24 : 0.16),
      '--surface-elevated': mixAlpha(parseColor('#ffffff')!, isLight ? 0.32 : 0.2),
      '--border-light': mixAlpha(parseColor(isLight ? '#000000' : '#ffffff')!, isLight ? 0.1 : 0.1),
      '--line-soft': mixAlpha(parseColor(isLight ? '#000000' : '#ffffff')!, isLight ? 0.08 : 0.08),
      '--line-strong': mixAlpha(parseColor(isLight ? '#000000' : '#ffffff')!, isLight ? 0.14 : 0.18),
      '--glass-bg': mixAlpha(parseColor(tint2)!, isLight ? 0.72 : 0.18),
      '--glass-border': `1px solid ${mixAlpha(parseColor(isLight ? '#000000' : '#ffffff')!, isLight ? 0.08 : 0.08)}`,
      '--glass-text-color': isLight ? '#000000' : 'rgba(255, 255, 255, 0.95)',
      '--immersive-bg': `linear-gradient(180deg, ${bgStart} 0%, ${bgMid} 45%, ${bgEnd} 100%)`,
      // 进度条差异色
      '--tabbar-progress-color': accentBright,
      '--play-progress-fill': progressFill,
      '--play-progress-track': progressTrack
    }
  }

  // 普通模式（dark / light）
  const bgTarget = isDarkTheme ? '#0e121b' : '#ffffff'
  const fgTarget = isDarkTheme ? '#ffffff' : '#1a1a2e'

  const tintBase = isDominantLight ? (isDarkTheme ? 0.85 : 0.92) : isDarkTheme ? 0.9 : 0.94
  const tint1 = mixColor(dominantColor, bgTarget, tintBase)
  const tint2 = mixColor(dominantColor, bgTarget, tintBase - 0.04)
  const tint3 = mixColor(dominantColor, bgTarget, tintBase - 0.1)

  const borderAlpha = isDarkTheme ? (isDominantLight ? 0.14 : 0.1) : isDominantLight ? 0.18 : 0.12
  const borderStrongAlpha = borderAlpha * 2

  const accent = mixColor(dominantColor, fgTarget, isDominantLight ? 0.18 : 0.28)
  const textColor = mixColor(dominantColor, fgTarget, isDominantLight ? 0.24 : 0.2)

  const glowAlpha = isDarkTheme ? (isDominantLight ? 0.12 : 0.18) : isDominantLight ? 0.08 : 0.1
  const glowStrongAlpha = glowAlpha * 1.6

  return {
    '--dominant-tint-1': tint1,
    '--dominant-tint-2': tint2,
    '--dominant-tint-3': tint3,
    '--dominant-border': mixAlpha(rgb, borderAlpha),
    '--dominant-border-strong': mixAlpha(rgb, borderStrongAlpha),
    '--dominant-accent': accent,
    '--dominant-text': textColor,
    '--dominant-glow': `0 4px 24px ${mixAlpha(rgb, glowAlpha)}`,
    '--dominant-glow-strong': `0 8px 32px ${mixAlpha(rgb, glowStrongAlpha)}`,
    '--dominant-soft': mixColor(dominantColor, bgTarget, isDarkTheme ? 0.72 : 0.82),
    '--dominant-muted': mixColor(dominantColor, bgTarget, isDarkTheme ? 0.48 : 0.82),
    '--dominant-bright': mixColor(dominantColor, fgTarget, isDarkTheme ? 0.32 : 0.45)
  }
}
