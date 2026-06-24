<!--
  EcgWaveform — 线性波纹可视化
  参考 audioMotion-analyzer 风格：多层正弦波叠加 + 渐变发光 + 填充区域
-->
<template>
  <canvas ref="canvasRef" class="eq-canvas" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  playing: boolean
  color?: string
}>()

const canvasRef = ref<HTMLCanvasElement>()
let ctx: CanvasRenderingContext2D | null = null
let animId = 0
let startTime = 0

// ── 波形参数 ─────────────────────────────────────────────────────────────
// 6 条波线，每条有不同的频率、振幅、速度、透明度
const WAVE_PROFILES = [
  { freq: 1.8, amp: 0.32, speed: 1.6, alpha: 1.0, lineWidth: 2.5 },   // 主波
  { freq: 2.6, amp: 0.22, speed: 2.2, alpha: 0.6, lineWidth: 1.8 },   // 次波
  { freq: 3.8, amp: 0.14, speed: 1.1, alpha: 0.35, lineWidth: 1.2 },  // 细波
  { freq: 1.2, amp: 0.18, speed: 0.8, alpha: 0.45, lineWidth: 1.5 },  // 慢波
  { freq: 5.2, amp: 0.08, speed: 3.0, alpha: 0.2, lineWidth: 0.8 },   // 高频细节
  { freq: 0.7, amp: 0.25, speed: 0.5, alpha: 0.3, lineWidth: 2.0 },   // 呼吸波
]

// 当前振幅（平滑过渡用）
let currentAmp = 0
const targetAmp = { value: 0 }

/** 计算某条波线在 x 位置的 y 值 */
function waveY(profile: typeof WAVE_PROFILES[0], x: number, t: number, amp: number): number {
  const { freq, amp: baseAmp, speed } = profile
  // 主正弦
  const main = Math.sin(x * freq * Math.PI * 2 + t * speed) * baseAmp
  // 二次谐波
  const harmonic = Math.sin(x * freq * 1.5 * Math.PI * 2 + t * speed * 0.7 + 1.2) * baseAmp * 0.3
  // 慢速漂移
  const drift = Math.sin(x * 0.8 + t * 0.3) * 0.06
  return (main + harmonic + drift) * amp
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return

  const w = canvas.width
  const h = canvas.height
  const dpr = window.devicePixelRatio || 1
  const t = (performance.now() - startTime) / 1000

  ctx.clearRect(0, 0, w, h)

  // 目标振幅
  targetAmp.value = props.playing ? 1 : 0
  currentAmp += (targetAmp.value - currentAmp) * 0.04

  const lineColor = props.color || 'rgba(255, 107, 107, 0.85)'
  const midY = h * 0.5
  const maxAmp = h * 0.38

  // ── 逐条绘制波线 ────────────────────────────────────────────────────
  for (let wi = WAVE_PROFILES.length - 1; wi >= 0; wi--) {
    const profile = WAVE_PROFILES[wi]
    const amp = currentAmp * profile.amp

    ctx.beginPath()
    ctx.lineWidth = profile.lineWidth * dpr
    ctx.globalAlpha = profile.alpha * Math.min(1, currentAmp * 1.5 + 0.15)

    // 用渐变描边
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, 'transparent')
    grad.addColorStop(0.12, lineColor)
    grad.addColorStop(0.5, lineColor)
    grad.addColorStop(0.88, lineColor)
    grad.addColorStop(1, 'transparent')
    ctx.strokeStyle = grad

    // 计算波形点
    const step = 2 * dpr
    const points: [number, number][] = []
    for (let x = 0; x <= w; x += step) {
      const nx = x / w // 0~1 归一化
      const y = midY + waveY(profile, nx, t, amp) * maxAmp
      points.push([x, y])
    }

    // 绘制平滑曲线（贝塞尔插值）
    if (points.length > 1) {
      ctx.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length - 1; i++) {
        const cpX = (points[i][0] + points[i + 1][0]) / 2
        const cpY = (points[i][1] + points[i + 1][1]) / 2
        ctx.quadraticCurveTo(points[i][0], points[i][1], cpX, cpY)
      }
      const last = points[points.length - 1]
      ctx.lineTo(last[0], last[1])
    }

    ctx.stroke()

    // ── 填充区域（仅主波和次波）──────────────────────────────────────
    if (wi <= 1 && amp > 0.01) {
      ctx.globalAlpha = profile.alpha * 0.08 * Math.min(1, currentAmp * 1.5)
      ctx.lineTo(w, midY)
      ctx.lineTo(0, midY)
      ctx.closePath()

      const fillGrad = ctx.createLinearGradient(0, midY - maxAmp * amp, 0, midY + maxAmp * amp)
      fillGrad.addColorStop(0, lineColor)
      fillGrad.addColorStop(0.5, 'transparent')
      fillGrad.addColorStop(1, lineColor)
      ctx.fillStyle = fillGrad
      ctx.fill()
    }
  }

  ctx.globalAlpha = 1

  // ── 左右淡出遮罩 ───────────────────────────────────────────────────
  const fadeGrad = ctx.createLinearGradient(0, 0, w, 0)
  fadeGrad.addColorStop(0, 'rgba(0,0,0,0)')
  fadeGrad.addColorStop(0.06, 'rgba(0,0,0,1)')
  fadeGrad.addColorStop(0.94, 'rgba(0,0,0,1)')
  fadeGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = fadeGrad
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
}

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
