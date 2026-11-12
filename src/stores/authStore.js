import { defineStore } from 'pinia'
import { ref, computed, getCurrentInstance } from 'vue'

export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  GERENTE_VENDAS: 'GERENTE_VENDAS',
  ANALISTA_NEGOCIOS: 'ANALISTA_NEGOCIOS',
  ANALISTA_CODIGO: 'ANALISTA_CODIGO',
  AUDITOR: 'AUDITOR'
}

export const ROLE_LABELS = {
  ADMINISTRADOR: 'Administrador',
  GERENTE_VENDAS: 'Gerente de Vendas',
  ANALISTA_NEGOCIOS: 'Analista de Negócios',
  ANALISTA_CODIGO: 'Analista de Código',
  AUDITOR: 'Auditor'
}

const STORAGE_KEY_USER = 'comissionai_auth_user'
const STORAGE_KEY_TOKEN = 'comissionai_auth_token'

// Storage seguro compatível com ambiente de testes Node/Vitest e Browser
const memoryStore = new Map()

export const safeStorage = {
  getItem(key) {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key)
      } catch {
        return memoryStore.get(key) || null
      }
    }
    return memoryStore.get(key) || null
  },
  setItem(key, value) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value)
        return
      } catch {
        memoryStore.set(key, String(value))
        return
      }
    }
    memoryStore.set(key, String(value))
  },
  removeItem(key) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key)
        return
      } catch {
        memoryStore.delete(key)
        return
      }
    }
    memoryStore.delete(key)
  },
  clear() {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.clear()
      } catch {
        // no-op
      }
    }
    memoryStore.clear()
  }
}

export const useAuthStore = defineStore('auth', () => {
  const savedUser = safeStorage.getItem(STORAGE_KEY_USER)
  const savedToken = safeStorage.getItem(STORAGE_KEY_TOKEN)

  let parsedUser = null
  if (savedUser) {
    try {
      parsedUser = JSON.parse(savedUser)
    } catch {
      parsedUser = null
    }
  }

  const currentUser = ref(
    parsedUser || {
      id: 1,
      nome: 'Gerente Comercial',
      email: 'gerente@comissai.local',
      papel: ROLES.GERENTE_VENDAS,
      nomePerfil: ROLE_LABELS[ROLES.GERENTE_VENDAS]
    }
  )

  const token = ref(savedToken || 'mock-dev-token')

  const isAuthenticated = computed(() => Boolean(token.value && currentUser.value))

  const canUploadBases = computed(() => {
    const papel = currentUser.value?.papel
    return papel === ROLES.ADMINISTRADOR || papel === ROLES.GERENTE_VENDAS
  })

  const canModifyBases = computed(() => {
    const papel = currentUser.value?.papel
    return papel === ROLES.ADMINISTRADOR || papel === ROLES.GERENTE_VENDAS
  })

  const isGerenteOuAdmin = computed(() => {
    const papel = currentUser.value?.papel
    return papel === ROLES.ADMINISTRADOR || papel === ROLES.GERENTE_VENDAS
  })

  function setSession(user, authToken) {
    currentUser.value = user
    token.value = authToken
    if (user) {
      safeStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user))
    } else {
      safeStorage.removeItem(STORAGE_KEY_USER)
    }
    if (authToken) {
      safeStorage.setItem(STORAGE_KEY_TOKEN, authToken)
    } else {
      safeStorage.removeItem(STORAGE_KEY_TOKEN)
    }
  }

  function setRole(papel) {
    if (!ROLES[papel]) return
    currentUser.value = {
      ...currentUser.value,
      papel,
      nomePerfil: ROLE_LABELS[papel] || papel
    }
    safeStorage.setItem(STORAGE_KEY_USER, JSON.stringify(currentUser.value))
  }

  function logout() {
    setSession(null, null)
  }

  async function initDevSession() {
    const currentToken = safeStorage.getItem(STORAGE_KEY_TOKEN)
    if (currentToken && currentToken !== 'mock-dev-token') {
      token.value = currentToken
      const storedUser = safeStorage.getItem(STORAGE_KEY_USER)
      if (storedUser) {
        try {
          currentUser.value = JSON.parse(storedUser)
        } catch {
          // ignore
        }
      }
      return currentToken
    }

    try {
      // Tenta login com a credencial padrão do DevContainer (BACK-1)
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@comissai.local',
          senha: 'Admin@123'
        })
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.token) {
          setSession(data.usuario, data.token)
          return data.token
        }
      }
    } catch {
      // Backend offline
    }
    return null
  }

  return {
    currentUser,
    token,
    isAuthenticated,
    canUploadBases,
    canModifyBases,
    isGerenteOuAdmin,
    setSession,
    setRole,
    logout,
    initDevSession
  }
})

/**
 * Utilitário seguro para instanciar o store de autenticação sem quebrar em renderizadores SSR
 * ou em testes isolados de componentes onde Pinia ainda não foi instalado no app.
 */
export function useSafeAuthStore() {
  const instance = getCurrentInstance()
  const hasPinia = Boolean(
    instance?.provides?.[Symbol.for('pinia')] ||
    instance?.appContext?.provides?.[Symbol.for('pinia')] ||
    instance?.appContext?.config?.globalProperties?.$pinia
  )

  if (hasPinia) {
    try {
      return useAuthStore()
    } catch {
      // fallback
    }
  }

  return {
    currentUser: {
      id: 1,
      nome: 'Gerente Comercial',
      email: 'gerente@comissai.local',
      papel: ROLES.GERENTE_VENDAS,
      nomePerfil: ROLE_LABELS[ROLES.GERENTE_VENDAS]
    },
    canUploadBases: true,
    canModifyBases: true,
    isGerenteOuAdmin: true,
    setRole: () => {}
  }
}
