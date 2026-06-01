<script setup lang="ts">
interface Props {
  show: boolean
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center'
  round?: boolean
  closeable?: boolean
  maxHeight?: string
  title?: string
}

withDefaults(defineProps<Props>(), {
  position: 'bottom',
  round: true,
  closeable: false,
  maxHeight: '80vh'
})

defineEmits<{
  'update:show': [value: boolean]
  close: []
}>()
</script>

<template>
  <van-popup
    :show="show"
    :position="position"
    :round="round"
    :closeable="closeable"
    :style="{ maxHeight }"
    @update:show="$emit('update:show', $event)"
    @close="$emit('close')"
  >
    <div v-if="title" class="flex items-center justify-between px-20px pt-16px pb-8px">
      <h3 class="text-16px font-700 color-[var(--text-primary)] m-0">{{ title }}</h3>
      <slot name="header-action" />
    </div>
    <slot />
  </van-popup>
</template>
