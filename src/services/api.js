import axios from 'axios'
import { safeStorage } from '@/stores/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 300000 // 5 minutos para cargas pesadas de planilhas
})

let devLoginPromise = null

async function getOrFetchDevToken() {
  const token = safeStorage.getItem('comissionai_auth_token')
  if (token && token !== 'mock-dev-token') {
    return token
  }
  if (!import.meta.env.DEV) {
    return null
  }

  if (!devLoginPromise) {
    devLoginPromise = fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@comissai.local',
        senha: 'Admin@123'
      })
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.token) {
          safeStorage.setItem('comissionai_auth_token', data.token)
          safeStorage.setItem('comissionai_auth_user', JSON.stringify(data.usuario))
          return data.token
        }
        return null
      })
      .catch(() => null)
      .finally(() => {
        devLoginPromise = null
      })
  }

  return devLoginPromise
}

api.interceptors.request.use(async (config) => {
  // Ignora o endpoint de login para evitar loops
  if (config.url?.includes('/auth/login')) {
    return config
  }

  let token = safeStorage.getItem('comissionai_auth_token')
  if (!token || token === 'mock-dev-token') {
    token = await getOrFetchDevToken()
  }

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sessão expirada ou token inválido
    if (error.response?.status === 401) {
      console.warn('Sessão expirada ou inválida. Limpando credenciais de acesso.')
      safeStorage.removeItem('comissionai_auth_token')
      safeStorage.removeItem('comissionai_auth_user')
    }

    // Acesso não autorizado pelo RBAC do backend
    if (error.response?.status === 403) {
      console.warn('Acesso negado: seu perfil não possui permissão para esta operação no servidor.')
    }

    // Tratamento unificado de erros de rede / conexão
    if (!error.response && error.code !== 'ERR_CANCELED') {
      console.warn('Servidor Spring Boot offline ou inatingível. Verifique se o backend está em execução na porta 8080.')
    }
    return Promise.reject(error)
  }
)

export default api
