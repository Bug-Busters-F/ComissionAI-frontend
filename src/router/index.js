import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import DataView from '@/views/DataView.vue'
import CampaignsView from '@/views/CampaignsPrototypeView.vue'
import CampaignDetailsView from '@/views/CampaignDetailsPrototypeView.vue'
import CampaignFlowView from '@/views/CampaignFlowView.vue'
import CampaignApurationView from '@/views/CampaignApurationView.vue'

const routes = [
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/home',
    name: 'home',
    component: HomeView,
    meta: { section: 'home', label: 'Home' }
  },
  {
    path: '/dados',
    name: 'dados',
    component: DataView,
    meta: { section: 'dados', label: 'Dados' }
  },
  {
    path: '/campanhas',
    name: 'campanhas',
    component: CampaignsView,
    meta: { section: 'campanhas', label: 'Campanhas' }
  },
  {
    path: '/campanhas/nova',
    name: 'campanha-nova',
    component: CampaignFlowView,
    meta: { section: 'campanhas', label: 'Campanhas' }
  },
  {
    path: '/campanhas/:id/editar',
    name: 'campanha-editar',
    component: CampaignFlowView,
    meta: { section: 'campanhas', label: 'Campanhas' }
  },
  {
    path: '/campanhas/:id',
    name: 'campanha-detalhes',
    component: CampaignDetailsView,
    meta: { section: 'campanhas', label: 'Campanhas' }
  },
  {
    path: '/campanhas/:id/apurar',
    name: 'campanha-apurar',
    component: CampaignApurationView,
    meta: { section: 'campanhas', label: 'Campanhas' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
