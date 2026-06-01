<script setup lang="ts">
interface Props {
  count?: number
}

withDefaults(defineProps<Props>(), {
  count: 1
})
</script>

<template>
  <div v-for="i in count" :key="i" class="flex items-center gap-12px p-12px">
    <div class="w-48px h-48px rounded-12px bg-[var(--surface-2)] animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-white/8% via-white/14% to-white/8% shrink-0" />
    <div class="flex-1 flex flex-col gap-8px">
      <div class="h-14px rounded-7px bg-[var(--surface-2)] animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-white/8% via-white/14% to-white/8% w-[70%]" />
      <div class="h-12px rounded-6px bg-[var(--surface-2)] animate-shimmer bg-[length:200%_100%] bg-gradient-to-r from-white/8% via-white/14% to-white/8% w-[45%]" />
    </div>
  </div>
</template>
