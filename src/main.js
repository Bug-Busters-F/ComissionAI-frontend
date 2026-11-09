import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './assets/main.css'
import App from './App.vue'
import { useTheme } from './services/useTheme'

// Inicializa o tema cedo para acompanhar mudanças do sistema operacional.
useTheme()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
