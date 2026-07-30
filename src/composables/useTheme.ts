import { ref } from 'vue'
import { computeDominantVars } from '@/utils/color'

export type ThemeMode = 'dark' | 'light'

const theme = ref<ThemeMode>('dark')

// 旧“沉浸”主题曾写入这些根级变量。每次应用深浅主题时统一清理，
// 让普通页面只读取 variables.css 中的深色/浅色配置。
const LEGACY_THEME_OVERRIDE_VARS = [
  '--text-primary',
  '--text-secondary',
  '--bg-base',
  '--bg-canvas',
  '--bg-sheet',
  '--bg-card',
  '--bg-input',
  '--bg-active',
  '--bg-active-hover',
  '--bg-overlay',
  '--surface-1',
  '--surface-2',
  '--surface-3',
  '--surface-elevated',
  '--border-light',
  '--line-soft',
  '--line-strong',
  '--glass-bg',
  '--glass-border',
  '--glass-text-color'
]

export function useTheme() {
  const applyTheme = () => {
    const el = document.documentElement

    if (theme.value === 'light') {
      el.setAttribute('data-theme', 'light')
    } else {
      el.removeAttribute('data-theme')
    }
    el.removeAttribute('data-immersive')

    for (const variable of LEGACY_THEME_OVERRIDE_VARS) {
      el.style.removeProperty(variable)
    }

    // 歌曲主导色只更新强调色、播放页沉浸背景与 TabBar，不再覆盖普通页面底色。
    const currentDominant = getComputedStyle(el).getPropertyValue('--dominant-color').trim()
    if (currentDominant) {
      const vars = computeDominantVars(currentDominant, theme.value === 'dark')
      for (const [key, value] of Object.entries(vars)) {
        el.style.setProperty(key, value)
      }
    }
  }

  const initTheme = () => {
    const saved = localStorage.getItem('xf-theme')
    theme.value = saved === 'light' || saved === 'dark' ? saved : 'dark'

    // 将旧版本保存的 dominant 配置迁移为新的默认深色主题。
    if (saved !== theme.value) {
      localStorage.setItem('xf-theme', theme.value)
    }
    applyTheme()
  }

  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
    localStorage.setItem('xf-theme', mode)
    applyTheme()
  }

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return { theme, initTheme, setTheme, toggleTheme }
}
