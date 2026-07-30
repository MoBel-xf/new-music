<template>
  <div v-if="isPlayRoute" class="immersive-bg" aria-hidden="true" />
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isPlayRoute = computed(() => route.name === 'play')

watch(
  () => route.name,
  (routeName) => {
    document.documentElement.setAttribute('data-page', routeName === 'play' ? 'play' : 'theme')
  },
  { immediate: true, flush: 'sync' }
)
</script>

<style scoped>
.immersive-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  background: var(--play-page-background);
  contain: strict;
  transform: translateZ(0);
}
</style>
