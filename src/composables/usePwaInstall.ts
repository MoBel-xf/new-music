import { readonly, ref } from 'vue'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export type PwaInstallResult = 'installed' | 'prompted' | 'ios-guide' | 'manual-guide'

const isStandalone = ref(false)
const canPromptInstall = ref(false)
let deferredPrompt: InstallPromptEvent | null = null
let initialized = false

function refreshStandaloneState() {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true
  document.documentElement.toggleAttribute('data-standalone', isStandalone.value)
}

export function initPwaInstall() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  refreshStandaloneState()

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as InstallPromptEvent
    canPromptInstall.value = true
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    canPromptInstall.value = false
    refreshStandaloneState()
  })
}

export async function requestPwaInstall(): Promise<PwaInstallResult> {
  refreshStandaloneState()
  if (isStandalone.value) return 'installed'

  if (deferredPrompt) {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      deferredPrompt = null
      canPromptInstall.value = false
    }
    return 'prompted'
  }

  return /iPad|iPhone|iPod/i.test(navigator.userAgent) ? 'ios-guide' : 'manual-guide'
}

export const pwaInstallState = {
  isStandalone: readonly(isStandalone),
  canPromptInstall: readonly(canPromptInstall)
}
