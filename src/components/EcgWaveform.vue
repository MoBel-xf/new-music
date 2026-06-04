<template>
  <canvas ref="canvasRef" class="eq-canvas" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  playing: boolean
  color?: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let animId = 0
let startTime = 0

// ── 柱子配置 ──────────────────────────────────────────────────────────────
const BAR_COUNT = 14
// 每根柱子的个性化参数（基础高度、振幅、速度、相位）
const BAR_PROFILES = Array.from({ length: BAR_COUNT }, (_, i) => ({
  base: 0.18 + Math.random() * 0.22,           // 基础高度比例
  amp: 0.35 + Math.random() * 0.3,              // 振幅
  speed: 1.5 + Math.random() * 2.5,             // 动画速度
  phase: (i / BAR_COUNT) * Math.PI * 2 + Math.random() * 1.5, // 相位偏移
  // 额外的慢速波动（让整体有呼吸感）
  slowSpeed: 0.3 + Math.random() * 0.4,
  slowPhase: Math.random() * Math.PI * 2,
  slowAmp: 0.08 + Math.random() * 0.1
}))

const barHeights = new Float32Array(BAR_COUNT).fill(0)

/** 计算某根柱子在当前时间的目标高度 */
function getBarTarget(index: number, t: number): number {
  const p = BAR_PROFILES[index]
  // 主波动
  const main = Math.sin(t * p.speed + p.phase) * p.amp
  // 慢速呼吸波动
  const slow = Math.sin(t * p.slowSpeed + p.slowPhase) * p.slowAmp
  // 从右向左的滚动相位偏移（右侧领先，左侧滞后）
  const scrollPhase = ((BAR_COUNT - 1 - index) / BAR_COUNT) * 1.8
  const scroll = Math.sin(t * 2.2 + scrollPhase) * 0.12

  return Math.max(0.06, Math.min(1, p.base + main + slow + scroll))
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return

  const w = canvas.width
  const h = canvas.height
  const dpr = window.devicePixelRatio || 1
  const t = (performance.now() - startTime) / 1000

  ctx.clearRect(0, 0, w, h)

  const lineColor = props.color || 'rgba(255, 107, 107, 0.85)'

  // 计算并平滑柱子高度
  for (let i = 0; i < BAR_COUNT; i++) {
    const target = props.playing ? getBarTarget(i, t) : 0
    const speed = target > barHeights[i] ? 0.25 : 0.06
    barHeights[i] += (target - barHeights[i]) * speed
  }

  const gap = 5 * dpr
  const totalGap = gap * (BAR_COUNT - 1)
  const barWidth = (w - totalGap) / BAR_COUNT
  const maxBarHeight = h * 0.9
  const cornerRadius = Math.min(barWidth / 2, 4 * dpr)

  for (let i = 0; i < BAR_COUNT; i++) {
    const x = i * (barWidth + gap)
    const barH = Math.max(3 * dpr, barHeights[i] * maxBarHeight)
    const y = h - barH

    ctx.fillStyle = lineColor
    ctx.globalAlpha = 0.5 + barHeights[i] * 0.5

    // 圆角矩形
    ctx.beginPath()
    ctx.moveTo(x + cornerRadius, y)
    ctx.lineTo(x + barWidth - cornerRadius, y)
    ctx.arcTo(x + barWidth, y, x + barWidth, y + cornerRadius, cornerRadius)
    ctx.lineTo(x + barWidth, h)
    ctx.lineTo(x, h)
    ctx.lineTo(x, y + cornerRadius)
    ctx.arcTo(x, y, x + cornerRadius, y, cornerRadius)
    ctx.fill()
  }

  ctx.globalAlpha = 1

  // 左右淡出遮罩
  const grad = ctx.createLinearGradient(0, 0, w, 0)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.06, 'rgba(0,0,0,1)')
  grad.addColorStop(0.94, 'rgba(0,0,0,1)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
  ctx.globalCompositeOperation = 'source-over'

  animId = requestAnimationFrame(draw)
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  draw()
}

watch(() => props.playing, () => {
  // playing 状态变化时 draw 循环自动处理
})

watch(() => props.color, () => {
  // 颜色变化时下一帧自动生效
})

onMounted(() => {
  const canvas = canvasRef.value
  if (canvas) {
    ctx = canvas.getContext('2d')
    startTime = performance.now()
    resize()
    animId = requestAnimationFrame(draw)
  }
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.eq-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
