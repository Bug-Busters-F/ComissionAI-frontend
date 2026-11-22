import { computed, reactive, getCurrentInstance } from 'vue'
import { useAccountStore } from '@/stores/accountStore'
import { canAccess } from '@/services/accessPolicy'

// Compatibility adapter for the bases components, backed by the application's
// existing account store. No second identity, token, storage or role simulation.
export function useAuthStore() {
  const account = useAccountStore()
  const currentUser = computed(() => account.user ? {
    id: account.user.id, nome: account.user.name, email: account.user.email,
    papel: account.user.role, nomePerfil: account.user.roleName,
    ativo: account.user.active
  } : null)
  const canModifyBases = computed(() => account.user?.active === true && canAccess(account.user.role, 'manageData', account.user.permissions || []))
  async function refreshSession() {
    const result = await account.restore({ force: true })
    if (result.reason === 'connection') throw new Error('Não foi possível confirmar sua sessão. Tente novamente.')
  }
  return reactive({ currentUser, isAuthenticated: computed(() => Boolean(account.user?.active)), canModifyBases, canUploadBases: canModifyBases, refreshSession })
}

export function useSafeAuthStore() {
  if (getCurrentInstance()?.appContext?.config?.globalProperties?.$pinia) return useAuthStore()
  return { currentUser: null, canUploadBases: false, canModifyBases: false, refreshSession: async () => {} }
}
