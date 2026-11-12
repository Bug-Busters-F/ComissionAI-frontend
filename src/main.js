import { createApp, watch } from 'vue'
import { canAccess } from '@/services/accessPolicy'
import { useAccountStore } from '@/stores/accountStore'
import { createPinia } from 'pinia'
import router from './router'
import './assets/main.css'
import App from './App.vue'
import { initializeTheme } from '@/services/theme'

initializeTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
const account = useAccountStore()
watch(() => account.user?.role, role => {
  if (!role) return
  const route = router.currentRoute.value
  if ((route.meta.adminOnly && !account.isAdmin) || (route.meta.permission && !canAccess(role, route.meta.permission, account.user.permissions))) window.location.replace('/acesso-restrito')
})
window.addEventListener('focus', () => { const account = useAccountStore(); if (account.user) void account.restore({ force: true }) })
app.mount('#app')
