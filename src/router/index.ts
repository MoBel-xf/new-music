// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import { primaryRoutes, secondaryRoutes } from '@/layout/routes'

const router = createRouter({
  history: createWebHistory(),
  routes: [primaryRoutes, ...secondaryRoutes]
})

export default router
