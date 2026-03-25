<template>
  <ImmersiveBackground />
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'
import { useTheme } from '@/composables/useTheme'
import ImmersiveBackground from '@/components/ImmersiveBackground.vue'

const playlistStore = usePlaylistStore()
const { initTheme } = useTheme()

onMounted(async () => {
  initTheme()
  // 初始化 playlist store（加载 IndexedDB 数据 + 注册 player 历史回调）
  await playlistStore.init()
})
</script>
