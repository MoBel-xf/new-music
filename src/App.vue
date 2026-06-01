<template>
  <ImmersiveBackground />
  <router-view v-slot="{ Component, route: currentRoute }">
    <transition name="fade" mode="out-in">
      <component :is="Component" :key="currentRoute.path" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { usePlaylistStore } from '@/stores/playlist'
import ImmersiveBackground from '@/components/ImmersiveBackground.vue'

const playlistStore = usePlaylistStore()

onMounted(async () => {
  // 主题已在 main.ts 中初始化
  await playlistStore.init()
})
</script>
