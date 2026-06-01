<script setup lang="ts">
interface Props {
  variant?: 'ghost' | 'primary' | 'icon' | 'pill'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'ghost',
  size: 'md',
  disabled: false,
  loading: false
})

defineEmits<{ click: [e: MouseEvent] }>()
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center transition-all duration-150 ease cursor-pointer select-none',
      'active:scale-94 disabled:opacity-40 disabled:pointer-events-none',
      {
        // ghost
        'border border-[var(--line-soft)] bg-[var(--surface-1)] color-[var(--text-primary)] rounded-12px': variant === 'ghost',
        // primary
        'bg-[var(--brand-grad)] color-[var(--text-on-brand)] font-600 rounded-full': variant === 'primary',
        // icon
        'rounded-50% border border-[var(--line-soft)] bg-[var(--surface-1)] color-[var(--text-primary)]': variant === 'icon',
        // pill
        'rounded-full border border-[var(--line-soft)] bg-[var(--surface-1)] color-[var(--text-primary)] font-600': variant === 'pill',
        // sizes
        'w-32px h-32px text-14px': variant === 'icon' && size === 'sm',
        'w-40px h-40px text-16px': variant === 'icon' && size === 'md',
        'w-52px h-52px text-20px': variant === 'icon' && size === 'lg',
        'px-12px py-6px text-12px': variant !== 'icon' && size === 'sm',
        'px-14px py-8px text-14px': variant !== 'icon' && size === 'md',
        'px-18px py-10px text-16px': variant !== 'icon' && size === 'lg'
      }
    ]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="i-lucide-loader-2 animate-spin" />
    <slot v-else />
  </button>
</template>
