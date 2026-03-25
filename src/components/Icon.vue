<template>
  <svg :class="['icon', className]" :style="style" aria-hidden="true" @click="handleClick">
    <use :xlink:href="`#${name}`" />
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  name: string
  size?: string | number
  color?: string
  className?: string
  onClick?: () => void
}>()

const style = computed(() => {
  const s: Record<string, string> = {}
  if (props.size) {
    s.width = typeof props.size === 'number' ? `${props.size}px` : props.size
    s.height = typeof props.size === 'number' ? `${props.size}px` : props.size
  } else {
    s.width = '16px'
    s.height = '16px'
  }
  if (props.color) {
    s.color = props.color
  }
  return s
})

const handleClick = () => {
  if (props.onClick) {
    props.onClick()
  }
}
</script>

<style scoped>
.icon {
  display: inline-block;
  fill: currentColor;
  vertical-align: middle;
  color: inherit;
}
</style>
