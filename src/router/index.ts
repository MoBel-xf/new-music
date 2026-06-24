// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { primaryRoutes, secondaryRoutes } from '@/layout/routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    primaryRoutes,
    ...secondaryRoutes,
    // catch-all：未匹配的路由统一回到首页
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } }
  ]
})

// 导航失败处理（避免控制台报错 + 静默回首页）
router.onError((err) => {
  // 动态加载 chunk 失败（网络问题、部署更新）→ 刷新页面
  if (err.name === 'ChunkLoadError' || err.message?.includes('Failed to fetch')) {
    window.location.reload()
    return
  }
  console.warn('[router error]', err)
})

export default router
