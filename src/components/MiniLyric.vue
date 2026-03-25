<template>
  <div class="mini-lyric">
    <div class="lyric-lines-wrapper">
      <div 
        class="lyric-lines" 
        :style="{ transform: `translateY(-${(currentIndex > 0 ? currentIndex : 0) * 32}px)` }"
      >
        <div 
          v-for="(line, i) in lines" 
          :key="i"
          class="lyric-line"
          :class="{ 'is-current': i === currentIndex, 'is-future': i > currentIndex }"
        >
          {{ line.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LyricLine } from '@/types/music'

const props = defineProps<{
  lines: LyricLine[]
  currentIndex: number
}>()
</script>

<style scoped>
.mini-lyric {
  margin-top: 16px;
  width: 100%;
  height: 64px;
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(180deg, transparent 0%, black 20%, black 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, black 20%, black 80%, transparent 100%);
}

.lyric-lines-wrapper {
  position: absolute;
  top: 16px;
  left: 0;
  right: 0;
}

.lyric-lines {
  transition: transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
}

.lyric-line {
  height: 32px;
  line-height: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary, rgba(255,255,255,0.6));
  transition: color 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 20px;
}

.lyric-line.is-current {
  color: var(--text-primary, #fff);
  font-size: 16px;
  font-weight: 600;
}
</style>
