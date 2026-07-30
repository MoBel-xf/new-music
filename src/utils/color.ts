// src/utils/color.ts
// 颜色解析、混合与歌曲主导色衍生变量计算

/** 解析 hex / rgb() / rgba() 为 [r, g, b] */
export function parseColor(color: string): number[] | null {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const normalized = hex.length === 3 ? hex.split('').map((value) => `${value}${value}`).join('') : hex
    if (normalized.length !== 6) return null
    return [0, 2, 4].map((index) => parseInt(normalized.substring(index, index + 2), 16))
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

  const normalizedWeight = Math.max(0, Math.min(1, weight))
  const mixed = from.map((channel, index) => Math.round(channel * (1 - normalizedWeight) + to[index] * normalizedWeight))
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`
}

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
 * 计算歌曲主导色相关变量。
 *
 * 这里只生成强调色、播放页沉浸背景和 TabBar/播放控件颜色；
 * 普通页面的背景、卡片和文字始终由深色/浅色 CSS 主题负责。
 */
export function computeDominantVars(dominantColor: string, isDarkTheme: boolean) {
  const rgb = parseColor(dominantColor)
  if (!rgb) return {}

  const luminance = getLuminance(dominantColor)
  const isLightColor = luminance > 0.65
  const themeBackground = isDarkTheme ? '#0e121b' : '#ffffff'
  const themeForeground = isDarkTheme ? '#ffffff' : '#1a1a2e'

  // 普通页面可使用的轻量强调色，不参与页面底色计算。
  const tintWeight = isDarkTheme ? 0.86 : 0.92
  const tint1 = mixColor(dominantColor, themeBackground, tintWeight)
  const tint2 = mixColor(dominantColor, themeBackground, tintWeight - 0.05)
  const tint3 = mixColor(dominantColor, themeBackground, tintWeight - 0.11)
  const borderAlpha = isDarkTheme ? 0.1 : 0.12
  const accent = mixColor(dominantColor, themeForeground, isLightColor ? 0.18 : 0.28)
  const textColor = mixColor(dominantColor, themeForeground, isLightColor ? 0.24 : 0.2)
  const glowAlpha = isDarkTheme ? 0.18 : 0.1

  // 播放页使用的浓郁沉浸背景，独立于全局深浅主题。
  const immersiveTarget = isLightColor ? '#fff7ef' : '#1a1a2e'
  const immersiveStart = mixColor(dominantColor, immersiveTarget, isLightColor ? 0.82 : 0.08)
  const immersiveMid = mixColor(dominantColor, isLightColor ? '#f4f7fb' : '#141428', isLightColor ? 0.9 : 0.18)
  const immersiveEnd = immersiveStart
  const contrastColor = isLightColor ? '#000000' : '#ffffff'
  const progressAccent = mixColor(dominantColor, '#ffffff', isLightColor ? 0.24 : 0.32)

  return {
    '--dominant-tint-1': tint1,
    '--dominant-tint-2': tint2,
    '--dominant-tint-3': tint3,
    '--dominant-border': mixAlpha(rgb, borderAlpha),
    '--dominant-border-strong': mixAlpha(rgb, borderAlpha * 2),
    '--dominant-accent': accent,
    '--dominant-text': textColor,
    '--dominant-glow': `0 4px 24px ${mixAlpha(rgb, glowAlpha)}`,
    '--dominant-glow-strong': `0 8px 32px ${mixAlpha(rgb, glowAlpha * 1.6)}`,
    '--dominant-soft': mixColor(dominantColor, themeBackground, isDarkTheme ? 0.72 : 0.82),
    '--dominant-muted': mixColor(dominantColor, themeBackground, isDarkTheme ? 0.48 : 0.82),
    '--dominant-bright': mixColor(dominantColor, themeForeground, isDarkTheme ? 0.32 : 0.45),
    '--dominant-bg-start': immersiveStart,
    '--dominant-bg-mid': immersiveMid,
    '--dominant-bg-end': immersiveEnd,
    '--dominant-page-text': contrastColor,
    '--dominant-page-text-secondary': isLightColor ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.6)',
    '--immersive-bg': `linear-gradient(180deg, ${immersiveStart} 0%, ${immersiveMid} 50%, ${immersiveEnd} 100%)`,
    '--tabbar-progress-color': progressAccent,
    '--play-progress-fill': `linear-gradient(90deg, ${progressAccent}, ${dominantColor})`,
    '--play-progress-track': isLightColor ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)'
  }
}
