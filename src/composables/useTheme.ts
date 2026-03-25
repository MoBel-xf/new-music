import { ref } from 'vue'

const theme = ref<'dark' | 'light'>('dark')

export function useTheme() {
  const initTheme = () => {
    const saved = localStorage.getItem('pika-theme') as 'dark' | 'light'
    if (saved) {
      theme.value = saved
    } else {
      theme.value = 'dark'
    }
    applyTheme()
  }

  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    localStorage.setItem('pika-theme', theme.value)
    applyTheme()
  }

  const applyTheme = () => {
    if (theme.value === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  return {
    theme,
    initTheme,
    toggleTheme
  }
}
