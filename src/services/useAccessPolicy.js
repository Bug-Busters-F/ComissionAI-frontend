import { computed } from 'vue'
import { useAccountStore } from '@/stores/accountStore'
import { canAccess, canEditStep, stepAccessMessage } from './accessPolicy'
export function useAccessPolicy() {
  const account = useAccountStore()
  const role = computed(() => account.user?.role)
  return { role, can: action => canAccess(role.value, action, account.user?.permissions || []), editStep: step => canEditStep(role.value, step), stepMessage: step => stepAccessMessage(role.value, step) }
}
