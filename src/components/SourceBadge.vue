<template>
  <span class="source-badge" :style="badgeStyle">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MusicSource } from '@/types/music'

const props = defineProps<{ source: MusicSource }>()

const MAP: Record<MusicSource, { label: string; color: string }> = {
  migu: { label: '咪咕', color: '#FF9040' },
  netease: { label: '网易云', color: '#FF3B30' },
  qq: { label: 'QQ', color: '#1BACED' },
  kuwo: { label: '酷我', color: '#A259FF' }
}

const label = computed(() => MAP[props.source]?.label ?? props.source)
const color = computed(() => MAP[props.source]?.color ?? '#999')
const badgeStyle = computed(() => ({
  background: `color-mix(in srgb, ${color.value} 16%, rgba(255,255,255,0.06))`,
  color: color.value,
  borderColor: `color-mix(in srgb, ${color.value} 24%, rgba(255,255,255,0.08))`
}))
</script>

<style scoped>
.source-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: var(--radius-full);
  line-height: 1.4;
  letter-spacing: 0.3px;
  border: 1px solid transparent;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}
</style>
