import { defineStore } from 'pinia'
import { ref, computed, getCurrentInstance, onScopeDispose } from 'vue'
import api from '@/services/api'
import { authSession } from '@/services/authSession'

// Adapter for the bases area. Identity is always confirmed by /auth/me.
// Uses the same authSession as the login flow; it never creates its own session.
export const useAuthStore = defineStore('bases-auth', () => {
  const currentUser = ref(null)
  const sessionRevision = ref(-1)
  const unsubscribe = authSession.subscribe(() => { currentUser.value = null; sessionRevision.value = -1 })
  onScopeDispose(unsubscribe)
  const isAuthenticated = computed(() => Boolean(currentUser.value?.ativo && sessionRevision.value === authSession.revision && authSession.token))
  const canModifyBases = computed(() => isAuthenticated.value && ['ADMINISTRADOR', 'GERENTE_VENDAS'].includes(currentUser.value?.papel))
  async function refreshSession() {
    currentUser.value = null
    if (!authSession.token) return
    const revision = authSession.revision
    const { data } = await api.get('/auth/me')
    authSession.assertCurrent(revision)
    if (data?.ativo && data?.id && data?.papel) {
      currentUser.value = data
      sessionRevision.value = revision
    }
  }
  return { currentUser, isAuthenticated, canModifyBases, canUploadBases: canModifyBases, refreshSession }
})

export function useSafeAuthStore() {
  if (getCurrentInstance()?.appContext?.config?.globalProperties?.$pinia) return useAuthStore()
  return { currentUser: null, canUploadBases: false, canModifyBases: false, refreshSession: async () => {} }
}
