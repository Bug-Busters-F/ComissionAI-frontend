import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'home',
    component: { template: '<div class="p-6 text-blue-800 font-sans"><h1 class="text-2xl font-bold">Dom Rock - Rule Engine</h1><p class="text-sm text-gray-500 mt-1">Ambiente frontend inicializado com sucesso.</p></div>' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
