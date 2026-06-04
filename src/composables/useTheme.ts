import { ref } from 'vue'
import { computeDominantVars } from '@/utils/color'

export type ThemeMode = 'dark' | 'light' | 'dominant'

const theme = ref<ThemeMode>('dominant')

export function useTheme() {
  const initTheme = () => {
    const saved = localStorage.getItem('xf-theme') as ThemeMode | null
    if (saved && ['dark', 'light', 'dominant'].includes(saved)) {
      theme.value = saved
    } else {
      theme.value = 'dominant'
    }
    applyTheme()
  }

  /** 设置指定主题 */
  const setTheme = (mode: ThemeMode) => {
    theme.value = mode
    localStorage.setItem('xf-theme', mode)
    applyTheme()
  }

  /** 切换深/浅（向后兼容） */
  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  // dominant 模式会覆盖的核心 CSS 变量列表
  const DOMINANT_OVERRIDE_VARS = [
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
    '--glass-text-color',
    '--immersive-bg',
    '--tabbar-progress-color',
    '--play-progress-fill',
    '--play-progress-track'
  ]

  const applyTheme = () => {
    const el = document.documentElement
    // dominant 模式底层走 dark 主题变量
    const cssTheme = theme.value === 'light' ? 'light' : 'dark'
    if (cssTheme === 'light') {
      el.setAttribute('data-theme', 'light')
    } else {
      el.removeAttribute('data-theme')
    }
    // 标记 dominant 模式
    if (theme.value === 'dominant') {
      el.setAttribute('data-immersive', '')
    } else {
      el.removeAttribute('data-immersive')
      // 切出 dominant 时移除所有 inline 覆盖，恢复 CSS 默认值
      for (const v of DOMINANT_OVERRIDE_VARS) {
        el.style.removeProperty(v)
      }
    }
    // 重新计算主导色衍生变量
    const currentDominant = getComputedStyle(el).getPropertyValue('--dominant-color').trim()
    if (currentDominant) {
      const isDark = cssTheme === 'dark'
      const isDominant = theme.value === 'dominant'
      const vars = computeDominantVars(currentDominant, isDark, isDominant)
      for (const [key, val] of Object.entries(vars)) {
        el.style.setProperty(key, val)
      }
      // dominant 模式覆盖文字颜色
      if (isDominant && vars['--dominant-page-text']) {
        el.style.setProperty('--text-primary', vars['--dominant-page-text'])
        el.style.setProperty('--text-secondary', vars['--dominant-page-text-secondary'] || vars['--dominant-page-text'])
      }
    }
  }

  return { theme, initTheme, setTheme, toggleTheme }
}
