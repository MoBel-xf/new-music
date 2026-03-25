<template>
  <div class="lyric-scroller" ref="containerRef" @scroll="onScroll">
    <div class="lyric-inner" ref="innerRef">
      <!-- 上下留白让当前行能居中 -->
      <div class="spacer" />
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="lyric-line"
        :class="{
          'is-current': i === currentIndex,
          'is-prev': i === currentIndex - 1 || i === currentIndex - 2,
          'is-next': i === currentIndex + 1 || i === currentIndex + 2
        }"
        @click="emit('seek', line.time)"
      >
        {{ line.text }}
      </div>
      <div class="spacer" />
    </div>

    <div v-if="!lines.length" class="lyric-empty">
      <span>暂无歌词</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { LyricLine } from '@/types/music'

const props = defineProps<{
  lines: LyricLine[]
  currentIndex: number
}>()

const emit = defineEmits<{ (e: 'seek', time: number): void }>()

const containerRef = ref<HTMLElement>()
const innerRef = ref<HTMLElement>()
let userScrolling = false
let scrollTimer: ReturnType<typeof setTimeout>

watch(
  () => props.currentIndex,
  async (idx) => {
    if (userScrolling || idx < 0) return
    await nextTick()
    const container = containerRef.value
    const inner = innerRef.value
    if (!container || !inner) return

    // 找到当前行元素（+1 因为有 spacer）
    const lineEls = inner.querySelectorAll('.lyric-line')
    const el = lineEls[idx] as HTMLElement
    if (!el) return

    const containerH = container.clientHeight
    const elTop = el.offsetTop
    const elH = el.clientHeight
    container.scrollTo({
      top: elTop - containerH / 2 + elH / 2,
      behavior: 'smooth'
    })
  }
)

function onScroll() {
  userScrolling = true
  clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    userScrolling = false
  }, 3000)
}
</script>

<style scoped>
.lyric-scroller {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  position: relative;
}
.lyric-scroller::-webkit-scrollbar {
  display: none;
}

.lyric-inner {
  padding: 0 20px;
}
.spacer {
  height: 40vh;
}

.lyric-line {
  text-align: center;
  margin: 8px auto;
  padding: 12px 18px;
  max-width: min(100%, 560px);
  font-size: 15px;
  font-weight: 500;
  color: var(--text-tertiary);
  line-height: 1.6;
  cursor: pointer;
  border-radius: 999px;
  transition:
    transform 0.35s ease,
    color 0.35s ease,
    background 0.35s ease,
    border-color 0.35s ease,
    opacity 0.35s ease;
  user-select: none;
  border: 1px solid transparent;
}
.lyric-line.is-current {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  background: var(--play-lyric-current-bg);
  border-color: var(--play-lyric-current-border);
  transform: scale(1.02);
  text-shadow: 0 0 20px color-mix(in srgb, var(--text-primary) 35%, transparent);
}
.lyric-line.is-prev,
.lyric-line.is-next {
  font-size: 16px;
  color: var(--text-secondary);
}
.lyric-line:active {
  opacity: 0.76;
}

.lyric-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
