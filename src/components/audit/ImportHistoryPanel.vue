<template>
  <div class="space-y-5">
    <div><h2 class="text-xl font-extrabold">Histórico de cargas e validações</h2><p class="mt-2 text-sm text-sage-muted">Envios concluídos, com falhas e excluídos permanecem disponíveis para consulta.</p></div>
    <AuditFilterForm v-model="filters" :fields="fields" :prefix="prefix" :loading="state.loading" :error="error" @apply="listing.apply" @reset="listing.reset" />
    <ImportHistoryDetail v-if="selected" :key="`${selected}-${refreshKey || ''}`" :id="selected" @close="listing.select(null)" @select="listing.select" />
    <section class="rounded-2xl bg-white p-5 sm:p-6" :aria-busy="state.loading">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3"><h3 class="text-lg font-extrabold">Envios registrados</h3><button type="button" class="focus-ring text-xs font-semibold underline underline-offset-4 disabled:opacity-50" :disabled="state.loading || !!error" @click="listing.reload">Consultar novamente</button></div>
      <AuditQueryStatus :state="state" @retry="listing.reload" />
      <template v-if="state.data && !state.loading && !state.error && !error">
        <div v-if="!state.data.content.length" class="rounded-xl bg-sage-light p-5 text-sm text-sage-muted"><p>{{ state.data.totalElements ? 'Esta página não tem registros.' : 'Nenhuma carga encontrada para estes filtros.' }}</p><button v-if="state.data.number > 0" type="button" class="focus-ring mt-3 font-semibold underline underline-offset-4" @click="listing.page(0)">Voltar à primeira página</button></div>
        <div v-else class="overflow-x-auto"><table class="import-table"><caption class="sr-only">Histórico permanente de envios</caption><thead><tr><th scope="col">Arquivo / competência</th><th scope="col">Envio e autor</th><th scope="col">Linhas</th><th scope="col">Situação / validações</th><th scope="col">Consulta</th></tr></thead><tbody><tr v-for="batch in state.data.content" :key="batch.reportId">
          <td><p class="max-w-xs break-words font-bold">{{ batch.nomeArquivo }}</p><p class="mt-1 text-xs text-sage-muted">{{ label(TYPES, batch.tipoBase) }} · {{ month(batch.competencia) }}</p><p class="mt-1 text-xs text-sage-muted">Carga #{{ batch.reportId }}</p></td>
          <td><p>{{ date(batch.criadoEm) }}</p><p class="mt-1 break-words text-xs">{{ batch.criadoPor || 'Autor não informado' }}</p><p class="mt-1 text-xs text-sage-muted">{{ label(PROFILES, batch.perfilCriador) }}</p></td>
          <td><p>{{ count(batch.linhasValidas) }} / {{ count(batch.totalLinhas) }}</p><p class="mt-1 text-xs text-sage-muted">válidas / processadas</p></td>
          <td><StatusBadge :label="label(STATUSES, batch.status)" :tone="tone(batch.status)" /><p class="mt-2 text-xs text-sage-muted">{{ count(batch.totalImpeditivos) }} impeditivas · {{ count(batch.totalAdvertencias) }} advertências · {{ count(batch.totalAvisos) }} avisos</p></td>
          <td><div class="flex flex-wrap gap-2"><button :id="`${prefix}entry-${batch.reportId}`" type="button" class="focus-ring rounded-full border border-sage-border px-3 py-2 text-xs font-semibold hover:bg-sage-light" :aria-label="`Consultar carga ${batch.nomeArquivo}`" @click="listing.select(batch.reportId)">Ver detalhes</button><slot name="actions" :batch="batch" /></div></td>
        </tr></tbody></table></div>
        <AuditPagination :page="state.data" label="Paginação das cargas" @page="listing.page" @size="listing.size" />
      </template>
    </section>
  </div>
</template>
<script setup>
import { watch } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AuditFilterForm from './AuditFilterForm.vue'
import AuditQueryStatus from './AuditQueryStatus.vue'
import AuditPagination from './AuditPagination.vue'
import ImportHistoryDetail from './ImportHistoryDetail.vue'
import { useAuditListing } from '@/services/useAuditListing'
import { IMPORT_TYPES as TYPES, IMPORT_STATUSES as STATUSES, IMPORT_ORIGINS as ORIGINS, AUDIT_PROFILES as PROFILES, auditLabel as label, auditDate as date, auditMonth as month, auditCount as count, statusTone as tone } from '@/services/auditModel'
const props = defineProps({ prefix: { type: String, default: 'c_' }, refreshKey: String })
const listing = useAuditListing('imports', props.prefix)
const { filters, state, error, selected } = listing
watch(() => props.refreshKey, () => listing.reload())
const fields = [
  { key: 'busca', label: 'Buscar carga', placeholder: 'Arquivo, número ou mensagem' }, { key: 'usuario', label: 'Responsável', placeholder: 'Autor do envio ou exclusão' },
  { key: 'tipoBase', label: 'Tipo de base', options: TYPES }, { key: 'status', label: 'Situação', options: STATUSES },
  { key: 'competencia', label: 'Competência', type: 'month' }, { key: 'origemLote', label: 'Origem', options: ORIGINS },
  { key: 'dataInicio', label: 'Enviado de', type: 'date' }, { key: 'dataFim', label: 'Enviado até', type: 'date' },
  { key: 'somenteComInconsistencias', label: 'Validações', empty: 'Todos os envios', options: { true: 'Somente com apontamentos' } }
]
</script>
<style scoped>
.import-table { @apply w-full min-w-[760px] text-left text-sm; }
.import-table th { @apply bg-sage-pill px-4 py-3 text-xs font-semibold text-sage-muted; }
.import-table td { @apply border-b border-sage-border-light px-4 py-4 align-top; }
</style>
