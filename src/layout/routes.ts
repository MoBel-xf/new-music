import type { RouteRecordRaw } from 'vue-router'
import AppLayout from '@/layout/AppLayout.vue'
import HomePage from '@/pages/HomePage.vue'
import MinePage from '@/pages/MinePage.vue'
import PlayPage from '@/pages/PlayPage.vue'
import PlaylistDetailPage from '@/pages/PlaylistDetailPage.vue'
import SearchPage from '@/pages/SearchPage.vue'

export const primaryRoutes: RouteRecordRaw = {
  path: '/',
  component: AppLayout,
  children: [
    { path: '', redirect: { name: 'play' } },
    { path: 'home', name: 'home', component: HomePage },
    { path: 'play', name: 'play', component: PlayPage },
    { path: 'mine', name: 'mine', component: MinePage }
  ]
}

export const secondaryRoutes: RouteRecordRaw[] = [
  { path: '/search', name: 'search', component: SearchPage },
  {
    path: '/playlist/:id',
    name: 'playlist',
    component: PlaylistDetailPage
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: PlaylistDetailPage,
    props: { mode: 'favorites' }
  },
  {
    path: '/history',
    name: 'history',
    component: PlaylistDetailPage,
    props: { mode: 'history' }
  }
]
