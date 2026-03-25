// src/router/index.ts
import { createRouter, createWebHashHistory } from 'vue-router'
import { primaryRoutes, secondaryRoutes } from '@/layout/routes'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [primaryRoutes, ...secondaryRoutes]
})

export default router
