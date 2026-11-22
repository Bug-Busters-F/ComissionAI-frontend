<template>
  <div class="space-y-5">
    <AuditFilterForm v-model="filters" :fields="fields" prefix="a_" :loading="state.loading" :error="error" @apply="listing.apply" @reset="listing.reset" />
    <AuditEventDetail v-if="selected" :id="selected" @close="listing.select(null)" />
    <section class="rounded-2xl bg-white p-5 sm:p-6" :aria-busy="state.loading">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 class="text-lg font-extrabold">Atividades registradas</h2><button type="button" class="focus-ring text-xs font-semibold underline underline-offset-4 disabled:opacity-50" :disabled="state.loading || !!error" @click="listing.reload">Consultar novamente</button></div>
      <AuditQueryStatus :state="state" @retry="listing.reload" />
      <template v-if="state.data && !state.loading && !state.error && !error">
        <div v-if="!state.data.content.length" class="rounded-xl bg-sage-light p-5 text-sm text-sage-muted"><p>{{ state.data.totalElements ? 'Esta página não tem registros.' : 'Nenhuma atividade encontrada para estes filtros e seu perfil.' }}</p><button v-if="state.data.number > 0" type="button" class="focus-ring mt-3 font-semibold underline underline-offset-4" @click="listing.page(0)">Voltar à primeira página</button></div>
        <div v-else class="overflow-x-auto"><table class="audit-table"><caption class="sr-only">Atividades autorizadas para consulta</caption><thead><tr><th scope="col">Data e autor</th><th scope="col">Atividade</th><th scope="col">Campanha / referência</th><th scope="col">Resultado</th><th scope="col">Consulta</th></tr></thead><tbody><tr v-for="event in state.data.content" :key="event.id">
          <td><p class="font-semibold">{{ date(event.dataHora) }}</p><p class="mt-1 break-words">{{ event.usuario || 'Autor não informado' }}</p><p class="mt-1 text-xs text-sage-muted">{{ label(PROFILES, event.perfilUsuario) }}</p></td>
          <td><p class="font-bold">{{ label(ACTIONS, event.tipoAcao) }}</p><p class="mt-1 max-w-xs break-words text-xs text-sage-muted">{{ text(event.descricao || 'Sem descrição adicional') }}</p></td>
          <td><p>{{ event.relacionamentos?.campanha?.titulo || (event.campanhaId ? `Campanha #${event.campanhaId}` : 'Sem campanha vinculada') }}</p><p v-if="event.nomeArquivo" class="mt-1 break-words text-xs text-sage-muted">{{ event.nomeArquivo }}</p><p v-if="event.competencia" class="mt-1 text-xs text-sage-muted">{{ month(event.competencia) }}</p></td>
          <td><StatusBadge :label="event.sucesso ? 'Sucesso' : 'Falha'" :tone="event.sucesso ? 'success' : 'danger'" /></td>
          <td><button :id="`a_entry-${event.id}`" type="button" class="focus-ring rounded-full border border-sage-border px-3 py-2 text-xs font-semibold hover:bg-sage-light" :aria-label="`Consultar atividade de ${event.usuario || 'autor não informado'} em ${date(event.dataHora)}`" @click="listing.select(event.id)">Ver detalhes</button></td>
        </tr></tbody></table></div>
        <AuditPagination :page="state.data" @page="listing.page" @size="listing.size" />
      </template>
    </section>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AuditFilterForm from './AuditFilterForm.vue'
import AuditQueryStatus from './AuditQueryStatus.vue'
import AuditPagination from './AuditPagination.vue'
import AuditEventDetail from './AuditEventDetail.vue'
import { useAuditListing } from '@/services/useAuditListing'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import { AUDIT_ACTIONS as ACTIONS, AUDIT_PROFILES as PROFILES, visibleLogProfiles, auditLabel as label, auditDate as date, auditMonth as month } from '@/services/auditModel'
import { userFacingText as text } from '@/services/userFacingText'
const access = useAccessPolicy()
const listing = useAuditListing('events', 'a_')
const { filters, state, error, selected } = listing
const fields = computed(() => [
  { key: 'busca', label: 'Buscar atividade', placeholder: 'Descrição, campanha ou arquivo' },
  { key: 'usuario', label: 'Usuário', placeholder: 'E-mail ou identificador' },
  { key: 'perfilUsuario', label: 'Perfil do autor na ação', options: visibleLogProfiles(access.role.value) },
  { key: 'tipoAcao', label: 'Atividade', options: ACTIONS },
  { key: 'campanhaId', label: 'Número da campanha', type: 'number' },
  { key: 'competencia', label: 'Competência', type: 'month' },
  { key: 'dataInicio', label: 'De', type: 'date' }, { key: 'dataFim', label: 'Até', type: 'date' },
  { key: 'sucesso', label: 'Resultado', options: { true: 'Sucesso', false: 'Falha' } }
])
</script>
<style scoped>
.audit-table { @apply w-full min-w-[780px] text-left text-sm; }
.audit-table th { @apply bg-sage-pill px-4 py-3 text-xs font-semibold text-sage-muted; }
.audit-table td { @apply border-b border-sage-border-light px-4 py-4 align-top; }
</style>
