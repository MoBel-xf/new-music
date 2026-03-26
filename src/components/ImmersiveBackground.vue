<template>
  <div class="immersive-bg" :style="bgStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useTheme } from '@/composables/useTheme'

const player = usePlayerStore()
const { theme } = useTheme()

const bgStyle = computed(() => {
  const hasTrack = !!player.currentTrack
  const base = hasTrack ? player.dominantColor : 'var(--bg-base)'

  // dominant 模式：使用浓郁渐变，类似 PlayPage
  if (theme.value === 'dominant' && hasTrack) {
    return {
      background: `linear-gradient(180deg, var(--dominant-bg-start, ${base}) 0%, var(--dominant-bg-mid, ${base}) 45%, var(--dominant-bg-end, ${base}) 100%)`,
      transition: 'background 0.6s ease'
    }
  }

  // 普通模式：淡雅径向渐变
  return {
    background: [
      'radial-gradient(circle at 30% 0%, var(--dominant-tint-2) 0%, transparent 36%)',
      'radial-gradient(circle at 80% 100%, var(--dominant-tint-1) 0%, transparent 28%)',
      base
    ].join(', '),
    transition: 'background 0.6s ease'
  }
})
</script>

<style scoped>
.immersive-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: var(--bg-base);
  will-change: background;
  transform: translateZ(0);
}
</style>
