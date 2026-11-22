import { computed } from 'vue'
import { useAccountStore } from '@/stores/accountStore'
import { canAccess, canEditStep, canParticipateStep, stepAccessMessage } from './accessPolicy'
export function useAccessPolicy() {
  const account = useAccountStore()
  const role = computed(() => account.user?.role)
  return { role, participateStep: step => canParticipateStep(role.value, step), can: action => canAccess(role.value, action, account.user?.permissions || []), editStep: step => canEditStep(role.value, step), stepMessage: step => stepAccessMessage(role.value, step) }
}
