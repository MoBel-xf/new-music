<script setup lang="ts">
interface Props {
  icon?: string
  message: string
  actionText?: string
}

defineProps<Props>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-48px px-24px color-[var(--text-tertiary)]">
    <span v-if="icon" :class="icon" class="text-40px mb-12px opacity-50" />
    <p class="text-14px text-center m-0 leading-relaxed">{{ message }}</p>
    <button
      v-if="actionText"
      class="mt-16px pill-btn"
      @click="$emit('action')"
    >
      {{ actionText }}
    </button>
  </div>
</template>
