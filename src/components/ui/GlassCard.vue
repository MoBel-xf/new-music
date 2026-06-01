<script setup lang="ts">
interface Props {
  tint?: 'none' | 'soft' | 'medium' | 'strong'
  bordered?: boolean
  glow?: boolean
  blur?: boolean
  rounded?: 'sm' | 'md' | 'lg' | 'xl'
  padding?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tint: 'none',
  bordered: true,
  glow: false,
  blur: true,
  rounded: 'lg',
  padding: true
})

const tintClass = computed(() => {
  switch (props.tint) {
    case 'soft': return 'bg-[var(--dominant-tint-1)]'
    case 'medium': return 'bg-[var(--dominant-tint-2)]'
    case 'strong': return 'bg-[var(--dominant-tint-3)]'
    default: return 'bg-[var(--surface-1)]'
  }
})

const roundedClass = computed(() => {
  switch (props.rounded) {
    case 'sm': return 'rounded-10px'
    case 'md': return 'rounded-18px'
    case 'lg': return 'rounded-28px'
    case 'xl': return 'rounded-36px'
    default: return 'rounded-20px'
  }
})
</script>

<template>
  <div
    :class="[
      tintClass,
      roundedClass,
      bordered ? 'border border-[var(--line-soft)]' : '',
      glow ? 'shadow-[var(--dominant-glow)]' : 'shadow-[var(--shadow-card)]',
      blur ? 'backdrop-blur-[18px]' : '',
      padding ? 'p-16px' : '',
      'overflow-hidden transition-all duration-300 ease'
    ]"
  >
    <slot />
  </div>
</template>
