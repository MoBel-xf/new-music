<template>
  <div class="immersive-bg" :style="bgStyle"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '@/stores/player'

const player = usePlayerStore()

const bgStyle = computed(() => {
  const hasTrack = !!player.currentTrack
  return {
    backgroundColor: hasTrack ? player.dominantColor : 'var(--immersive-bg)',
    transition: 'background-color 0.6s ease',
  }
})
</script>

<style scoped>
.immersive-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-color: var(--immersive-bg);
  will-change: background-color;
  transform: translateZ(0);
}
</style>