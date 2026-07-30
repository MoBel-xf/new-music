// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@unocss/reset/tailwind.css'
import '@/styles/global.css'
import '@/styles/vant-override.css'
import 'virtual:svg-icons-register'
import { initPwaInstall } from '@/composables/usePwaInstall'

const app = createApp(App)
app.use(createPinia())
app.use(router)
initPwaInstall()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[PWA] Service Worker 注册失败', error)
    })
  })
}

// 主题必须在 store 初始化前应用，否则 restoreSession 中 data-theme 尚未设置
import { useTheme } from '@/composables/useTheme'
const { initTheme } = useTheme()
initTheme()

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

function waitForFirstPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

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

async function bootstrap() {
  await waitForFirstPaint()
  app.mount('#app')
  router.isReady().finally(() => {
    hideBootLoading()
  })
}

void bootstrap()
