// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/global.css'
import '@/styles/vant-override.css'
import 'virtual:svg-icons-register'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 主题必须在 store 初始化前应用，否则 restoreSession 中 data-theme 尚未设置
import { useTheme } from '@/composables/useTheme'
const { initTheme } = useTheme()
initTheme()

function setViewportVars() {
  const root = document.documentElement
  const viewportHeight = window.visualViewport?.height ?? window.innerHeight
  const viewportWidth = window.visualViewport?.width ?? window.innerWidth

  root.style.setProperty('--app-height', `${viewportHeight}px`)
  root.style.setProperty('--app-width', `${viewportWidth}px`)
}

function hideBootLoading() {
  const bootLoading = document.getElementById('boot-loading')
  if (!bootLoading) return

  requestAnimationFrame(() => {
    bootLoading.classList.add('is-hidden')
    window.setTimeout(() => {
      bootLoading.remove()
    }, 400)
  })
}

setViewportVars()
window.addEventListener('resize', setViewportVars)
window.addEventListener('orientationchange', setViewportVars)
window.addEventListener('pageshow', setViewportVars)
window.visualViewport?.addEventListener('resize', setViewportVars)
window.visualViewport?.addEventListener('scroll', setViewportVars)

// ── 长按自定义指令（替代 vue3-touch-events，零依赖）──────────────────
app.directive('long-press', {
  mounted(el, binding) {
    let timer: ReturnType<typeof setTimeout> | null = null
    const duration = binding.arg ? parseInt(binding.arg) : 500

    const start = (e: Event) => {
      // 只响应左键/单指
      if (e instanceof MouseEvent && e.button !== 0) return
      timer = setTimeout(() => {
        binding.value(e)
      }, duration)
    }
    const cancel = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    el.addEventListener('mousedown', start)
    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('mouseup', cancel)
    el.addEventListener('mouseleave', cancel)
    el.addEventListener('touchend', cancel)
    el.addEventListener('touchcancel', cancel)
    // 阻止长按触发右键菜单
    el.addEventListener('contextmenu', (e: Event) => e.preventDefault())

    // 清理函数挂在元素上
    ;(el as any).__longPressCleanup = () => {
      cancel()
      el.removeEventListener('mousedown', start)
      el.removeEventListener('touchstart', start)
      el.removeEventListener('mouseup', cancel)
      el.removeEventListener('mouseleave', cancel)
      el.removeEventListener('touchend', cancel)
      el.removeEventListener('touchcancel', cancel)
    }
  },
  unmounted(el) {
    ;(el as any).__longPressCleanup?.()
  }
})

app.mount('#app')
router.isReady().finally(() => {
  hideBootLoading()
})
