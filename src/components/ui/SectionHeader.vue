<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
}

defineProps<Props>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex items-center justify-between px-4px mb-12px">
    <div class="flex items-baseline gap-8px">
      <h2 class="text-18px font-700 color-[var(--text-primary)] m-0 tracking-tight">{{ title }}</h2>
      <span v-if="subtitle" class="text-12px color-[var(--text-tertiary)]">{{ subtitle }}</span>
    </div>
    <button
      v-if="$slots.action"
      class="text-13px color-[var(--text-secondary)] cursor-pointer bg-transparent border-none px-8px py-4px rounded-8px transition-all duration-150 ease active:bg-[var(--surface-2)]"
      @click="$emit('action')"
    >
      <slot name="action" />
    </button>
  </div>
</template>
