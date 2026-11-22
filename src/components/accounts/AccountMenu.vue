<template>
  <div ref="menuRoot" class="relative" @keydown.esc="close">
    <button ref="trigger" type="button" :aria-expanded="open" :aria-controls="menuId" aria-label="Abrir menu da conta" class="focus-ring flex items-center gap-3 rounded-xl p-2 text-left transition hover:bg-sage-light" :class="placement === 'sidebar' ? 'w-full' : 'w-fit'" @click="open = !open">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sage-pill text-xs font-bold">{{ initials(account.user?.name) }}</span><span class="min-w-0 flex-1"><span class="block truncate text-xs font-bold">{{ account.user?.name }}</span><span class="block text-[10px] text-sage-muted">{{ roleLabel(account.user?.role) }}</span></span><ChevronDown :size="14" aria-hidden="true" class="shrink-0" :class="placement === 'sidebar' ? 'rotate-180' : ''" />
    </button>
    <div v-if="open" :id="menuId" class="absolute left-0 z-40 rounded-2xl border border-sage-border bg-white p-2 shadow-xl" :class="placement === 'sidebar' ? 'bottom-full mb-2 w-full' : 'top-full mt-2 w-64'">
      <p class="break-all border-b border-sage-border-light px-3 py-3 text-xs text-sage-muted">{{ account.user?.email }}</p>
      <div class="border-b border-sage-border-light px-2 py-3 md:hidden"><p class="mb-2 px-1 text-xs font-semibold text-sage-muted">Aparência</p><ThemeSelector /></div>
      <RouterLink to="/perfil" class="focus-ring mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-sage-light" @click="close"><UserRound :size="17" />Perfil</RouterLink>
      <button type="button" class="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-danger-dark hover:bg-danger-bg" @click="open = false; confirmLogout = true"><LogOut :size="17" />Sair</button>
    </div>
    <CampaignLifecycleDialog :open="confirmLogout" :busy="busy" title="Sair da conta?" confirm-label="Sair" @cancel="confirmLogout = false" @confirm="logout"><p>Você precisará entrar novamente para acessar o sistema.</p><p class="mt-3 text-sage-muted">Salve qualquer trabalho em andamento antes de sair. Alterações não salvas serão perdidas.</p><p v-if="error" role="alert" class="mt-3 text-danger-dark">{{ error }}</p></CampaignLifecycleDialog>
  </div>
</template>
<script setup>
import ThemeSelector from '@/components/common/ThemeSelector.vue'
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, UserRound, LogOut } from 'lucide-vue-next'
import { useAccountStore } from '@/stores/accountStore'
import { initials, roleLabel } from '@/services/accountModel'
import CampaignLifecycleDialog from '@/components/campaigns/CampaignLifecycleDialog.vue'
defineProps({ placement: { type: String, default: 'mobile' } })
const menuId = 'account-menu-' + useId()
const account = useAccountStore(), router = useRouter()
const open = ref(false), confirmLogout = ref(false), menuRoot = ref(null), trigger = ref(null)
function close(event) { open.value = false; if (event?.key === 'Escape') trigger.value?.focus() }
function outside(event) { if (!menuRoot.value?.contains(event.target)) close() }
const busy = ref(false), error = ref('')
async function logout() {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await account.logout() } catch (e) { error.value = e.message; busy.value = false; return }
  // Reload the app boundary so a different account cannot inherit in-memory business data.
  window.location.assign(router.resolve({ name: 'login', query: { motivo: 'logout' } }).href)
}
onMounted(() => document.addEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>
