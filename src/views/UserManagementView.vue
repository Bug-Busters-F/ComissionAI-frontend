<template>
  <div v-if="account.isAdmin" class="space-y-6">
    <header class="flex flex-wrap items-end justify-between gap-5"><div><p class="text-xs font-bold uppercase tracking-[.16em] text-sage-muted">Gerenciamento</p><h1 class="mt-2 text-4xl font-extrabold tracking-[-.045em]">Usuários</h1><p class="mt-3 text-sm text-sage-muted">Organize os acessos e os responsáveis da sua equipe.</p></div><button type="button" :disabled="loading || !account.roles.length" class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold hover:bg-brand-hover" @click="edit(null)"><Plus :size="18" />Novo usuário</button></header>
    <div class="grid gap-4 sm:grid-cols-3"><div v-for="stat in stats" :key="stat.label" class="rounded-2xl border border-sage-border-light bg-white p-5"><p class="text-sm text-sage-muted">{{ stat.label }}</p><p class="mt-2 text-3xl font-extrabold" :class="stat.green ? 'text-success-text' : ''">{{ stat.value }}</p></div></div>
    <section class="overflow-hidden rounded-[24px] bg-white" aria-labelledby="team-heading">
      <div class="border-b border-sage-border-light p-5 sm:p-6"><div class="flex flex-wrap items-center justify-between gap-4"><h2 id="team-heading" class="text-xl font-extrabold">Pessoas da equipe <span class="ml-2 rounded-full bg-sage-pill px-2.5 py-1 text-xs font-semibold text-sage-muted">{{ filtered.length }}</span></h2><p class="text-xs text-sage-muted">Somente administradores podem gerenciar acessos</p></div>
        <div class="mt-5 flex flex-col gap-3 lg:flex-row"><div class="relative flex-1"><Search :size="18" class="pointer-events-none absolute left-3.5 top-3.5 text-sage-muted" /><label for="user-search" class="sr-only">Buscar usuário por nome ou e-mail</label><input id="user-search" v-model="search" type="search" placeholder="Buscar por nome ou e-mail" class="focus-ring h-11 w-full rounded-xl border border-sage-border-dark bg-white pl-11 pr-4 text-sm" /></div><div><label for="filter-role" class="sr-only">Filtrar por perfil</label><select id="filter-role" v-model="role" class="focus-ring h-11 w-full rounded-xl border border-sage-border-dark bg-white px-3 text-sm lg:w-52"><option value="">Todos os perfis</option><option v-for="item in account.roles" :key="item.value" :value="item.value">{{ item.label }}</option></select></div></div>
        <div class="mt-5 flex gap-2" role="group" aria-label="Filtrar usuários por situação"><button v-for="tab in tabs" :key="tab.value" type="button" :aria-pressed="status === tab.value" class="focus-ring rounded-full px-4 py-2 text-sm font-semibold transition" :class="status === tab.value ? 'bg-brand-dark text-white' : 'text-sage-muted hover:bg-sage-light'" @click="status = tab.value">{{ tab.label }}</button></div>
      </div>
      <p v-if="loading" role="status" class="p-6 text-sm text-sage-muted">Carregando usuários…</p>
      <p v-else-if="loadError" role="alert" class="m-6 rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">{{ loadError }} <button class="font-bold underline" @click="load">Tentar novamente</button></p>
      <div v-else-if="!filtered.length" class="px-6 py-16 text-center"><Search :size="30" class="mx-auto text-sage-muted" /><h3 class="mt-4 text-lg font-bold">Nenhum usuário encontrado</h3><p class="mt-2 text-sm text-sage-muted">Tente outro nome ou ajuste os filtros.</p><button type="button" class="focus-ring mt-5 rounded-full border border-sage-border-dark px-5 py-2.5 text-sm font-semibold" @click="clearFilters">Limpar filtros</button></div>
      <div v-else class="overflow-x-auto"><table class="w-full min-w-[720px] text-left text-sm"><caption class="sr-only">Usuários e perfis de acesso</caption><thead class="bg-sage-light text-xs uppercase tracking-wider text-sage-muted"><tr><th class="px-6 py-4 font-semibold">Usuário</th><th class="px-5 py-4 font-semibold">Perfil de acesso</th><th class="px-5 py-4 font-semibold">Situação</th><th class="px-6 py-4 text-right font-semibold">Ações</th></tr></thead><tbody class="divide-y divide-sage-border-light"><tr v-for="user in visible" :key="user.id" class="hover:bg-sage-light/60"><td class="px-6 py-5"><div class="flex items-center gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage-pill text-xs font-bold text-sage-subtle">{{ initials(user.name) }}</span><div><p class="font-semibold">{{ user.name }}<span v-if="user.id === account.user?.id" class="ml-2 text-xs font-normal text-sage-muted">Você</span></p><p class="mt-1 text-xs text-sage-muted">{{ user.email }}</p></div></div></td><td class="px-5 py-5"><span class="inline-flex rounded-lg border border-sage-border bg-white px-2.5 py-1 text-xs font-semibold">{{ roleLabel(user.role) }}</span></td><td class="px-5 py-5"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" :class="user.active ? 'bg-success-bg text-success-dark' : 'bg-sage-pill text-sage-muted'"><span class="h-1.5 w-1.5 rounded-full" :class="user.active ? 'bg-success' : 'bg-sage-muted'"></span>{{ user.active ? 'Ativo' : 'Desativado' }}</span></td><td class="px-6 py-5"><div class="flex justify-end gap-2"><button type="button" :aria-label="'Editar ' + user.name" class="focus-ring inline-flex items-center gap-1.5 rounded-full border border-sage-border-dark px-3 py-2 text-xs font-semibold hover:bg-sage-pill" @click="edit(user)"><Pencil :size="14" />Editar</button><button type="button" :disabled="user.id === account.user?.id" :aria-label="(user.active ? 'Desativar ' : 'Reativar ') + user.name" :title="user.id === account.user?.id ? 'Não é possível desativar seu próprio acesso' : undefined" class="focus-ring rounded-full px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-35" :class="user.active ? 'text-danger-dark hover:bg-danger-bg' : 'text-success-dark hover:bg-success-bg'" @click="requestStatus(user)">{{ user.active ? 'Desativar' : 'Reativar' }}</button></div></td></tr></tbody></table></div>
      <footer v-if="filtered.length" class="flex flex-wrap items-center justify-between gap-3 border-t border-sage-border-light px-6 py-4 text-xs text-sage-muted"><p>Exibindo {{ (page - 1) * pageSize + 1 }}–{{ Math.min(page * pageSize, filtered.length) }} de {{ filtered.length }} usuários</p><div class="flex items-center gap-3"><button type="button" :disabled="page === 1" class="focus-ring rounded-full border border-sage-border px-3 py-2 font-semibold disabled:opacity-40" @click="page--">← Anterior</button><span>{{ page }} de {{ pages }}</span><button type="button" :disabled="page === pages" class="focus-ring rounded-full border border-sage-border px-3 py-2 font-semibold disabled:opacity-40" @click="page++">Próxima →</button></div></footer>
    </section>
    <p class="flex items-start gap-2 text-xs leading-5 text-sage-muted"><ShieldCheck :size="16" class="mt-0.5 shrink-0" />Desativar um usuário preserva sua identificação nos registros anteriores. Nenhum histórico é apagado.</p>
    <UserEditorDialog :open="editorOpen" :user="editing" :self="editing?.id === account.user?.id" :roles="account.roles" :busy="busy" :fields="fields" :error="editorError" @cancel="editorOpen = false" @save="save" />
    <CampaignLifecycleDialog :open="Boolean(statusUser)" :title="statusUser?.active ? 'Desativar acesso?' : 'Reativar acesso?'" :confirm-label="statusUser?.active ? 'Desativar usuário' : 'Reativar usuário'" :busy="busy" @cancel="statusUser = null" @confirm="confirmStatus">
      <p><strong>{{ statusUser?.name }}</strong> {{ statusUser?.active ? 'deixará de acessar o sistema. A identificação nos registros anteriores será preservada.' : 'voltará a ter acesso com o perfil já definido.' }}</p><p v-if="statusError" role="alert" class="mt-3 text-danger-dark">{{ statusError }}</p>
    </CampaignLifecycleDialog>
  </div>
</template>
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Plus, Search, Pencil, ShieldCheck } from 'lucide-vue-next'
import { useAccountStore } from '@/stores/accountStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { roleLabel, initials } from '@/services/accountModel'
import UserEditorDialog from '@/components/accounts/UserEditorDialog.vue'
import CampaignLifecycleDialog from '@/components/campaigns/CampaignLifecycleDialog.vue'
const account = useAccountStore(), notifications = useNotificationStore()
const search = ref(''), role = ref(''), status = ref('all'), page = ref(1), pageSize = 6
const tabs = [{ label: 'Todos', value: 'all' }, { label: 'Ativos', value: 'active' }, { label: 'Desativados', value: 'inactive' }]
const loading = ref(false), loadError = ref(''), editorOpen = ref(false), editing = ref(null), fields = ref({}), editorError = ref(''), busy = ref(false), statusUser = ref(null), statusError = ref('')
const stats = computed(() => [{ label: 'Total de usuários', value: account.users.length }, { label: 'Acessos ativos', value: account.users.filter(u => u.active).length, green: true }, { label: 'Acessos desativados', value: account.users.filter(u => !u.active).length }])
const filtered = computed(() => account.users.filter(u => (!role.value || u.role === role.value) && (status.value === 'all' || u.active === (status.value === 'active')) && (u.name + ' ' + u.email).toLocaleLowerCase('pt-BR').includes(search.value.trim().toLocaleLowerCase('pt-BR'))))
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const visible = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize))
watch([search, role, status], () => { page.value = 1 })
watch(pages, max => { if (page.value > max) page.value = max })
onMounted(load)
async function load() { loading.value = true; try { await account.loadUsers(); loadError.value = '' } catch (e) { loadError.value = e.message } finally { loading.value = false } }
function clearFilters() { search.value = ''; role.value = ''; status.value = 'all' }
function edit(user) { editing.value = user ? { ...user } : null; fields.value = {}; editorError.value = ''; editorOpen.value = true }
async function save(input) {
  if (busy.value) return
  busy.value = true; fields.value = {}; editorError.value = ''
  try { await account.saveUser(input, editing.value?.id); editorOpen.value = false; notifications.success(editing.value ? 'Usuário atualizado' : 'Usuário cadastrado', editing.value ? 'As alterações foram confirmadas.' : 'O acesso foi criado com o perfil selecionado.') }
  catch (e) { fields.value = e.fields || {}; editorError.value = e.message }
  finally { busy.value = false }
}
function requestStatus(user) { statusUser.value = { ...user }; statusError.value = '' }
async function confirmStatus() {
  if (busy.value || !statusUser.value) return
  busy.value = true
  try { const active = !statusUser.value.active; await account.setActive(statusUser.value.id, active); statusUser.value = null; notifications.success(active ? 'Acesso reativado' : 'Acesso desativado', active ? 'O usuário pode entrar novamente.' : 'A identificação nos registros anteriores foi preservada.') }
  catch (e) { statusError.value = e.message }
  finally { busy.value = false }
}
</script>
