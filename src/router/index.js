import { createRouter, createWebHistory } from 'vue-router'
import { canAccess } from '@/services/accessPolicy'
import { useAccountStore } from '@/stores/accountStore'
import LoginView from '@/views/LoginView.vue'
import ProfileView from '@/views/ProfileView.vue'
import UserManagementView from '@/views/UserManagementView.vue'
import AccessDeniedView from '@/views/AccessDeniedView.vue'
import HomeView from '@/views/HomeView.vue'
import DataView from '@/views/DataView.vue'
import CompetenceCalculationView from '@/views/CompetenceCalculationView.vue'
import CampaignsView from '@/views/CampaignsPrototypeView.vue'
import CampaignDetailsView from '@/views/CampaignDetailsPrototypeView.vue'
import CampaignCreationFlowView from '@/views/CampaignCreationFlowView.vue'

const routes = [
  ...(import.meta.env.VITE_ENABLE_WORKFLOW_PREVIEW === 'true' ? [{ path: '/campanhas/previa-fluxo', name: 'campanha-previa-fluxo', component: () => import('@/views/CampaignWorkflowPreviewView.vue'), meta: { section: 'campanhas', label: 'Prévia da esteira' } }] : []),
  { path: '/login', name: 'login', component: LoginView, meta: { public: true } },
  { path: '/perfil', name: 'perfil', component: ProfileView, meta: { section: 'perfil', label: 'Meu perfil' } },
  { path: '/gerenciamento', name: 'gerenciamento', component: UserManagementView, meta: { section: 'gerenciamento', label: 'Gerenciamento', adminOnly: true } },
  { path: '/acesso-restrito', name: 'acesso-restrito', component: AccessDeniedView, meta: { label: 'Acesso restrito' } },
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
    meta: { section: 'dados', label: 'Dados', permission: 'viewData' }
  },
  {
    path: '/dados/:competencia/calculo',
    name: 'dados-calculo',
    component: CompetenceCalculationView,
    meta: { section: 'dados', label: 'Dados', permission: 'viewData' }
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
    component: CampaignCreationFlowView,
    meta: { section: 'campanhas', label: 'Campanhas', permission: 'createCampaign' }
  },
  {
    path: '/campanhas/:id/editar',
    name: 'campanha-editar',
    component: CampaignCreationFlowView,
    meta: { section: 'campanhas', label: 'Campanhas', permission: 'editCampaign' }
  },
  {
    path: '/campanhas/:id',
    name: 'campanha-detalhes',
    component: CampaignDetailsView,
    meta: { section: 'campanhas', label: 'Campanhas' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  }
})

// Identity and role are confirmed by the server before entering a protected route.
router.beforeEach(async to => {
  const account = useAccountStore()
  const { user, reason } = await account.restore({ force: true })
  if (to.meta.public) return user ? { name: 'home' } : true
  if (!user) return { name: 'login', query: { retorno: to.fullPath, ...(reason ? { motivo: reason } : {}) } }
  if (to.meta.permission && !canAccess(user.role, to.meta.permission, user.permissions)) return { name: 'acesso-restrito' }
  if (to.meta.adminOnly && !account.isAdmin) return { name: 'acesso-restrito' }
  return true
})

export default router
