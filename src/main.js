import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './assets/main.css'
import App from './App.vue'
import { useAuthStore } from './stores/authStore'

async function initApp() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)

  if (import.meta.env.DEV) {
    try {
      const authStore = useAuthStore(pinia)
      await authStore.initDevSession()
    } catch {
      // Ignora erro se backend estiver offline no momento do boot
    }
  }

  app.mount('#app')
}

initApp()
