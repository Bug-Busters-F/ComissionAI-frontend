<template>
  <section ref="panel" class="rounded-2xl border border-sage-border bg-white p-5 sm:p-6" aria-labelledby="import-detail-heading" tabindex="-1">
    <div class="mb-5 flex items-start justify-between gap-4"><h2 id="import-detail-heading" class="text-xl font-extrabold">Detalhes da carga</h2><button type="button" class="focus-ring rounded-full border border-sage-border px-4 py-2 text-xs font-semibold hover:bg-sage-light" @click="$emit('close')">Fechar detalhes</button></div>
    <AuditQueryStatus :state="state" loading-text="Consultando a carga…" @retry="resource.load({ id })" />
    <template v-if="state.data && !state.loading && !state.error">
      <div class="flex flex-wrap items-start justify-between gap-4"><div class="min-w-0"><h3 class="break-words text-lg font-bold">{{ state.data.nomeArquivo }}</h3><p class="mt-1 text-xs text-sage-muted">Carga #{{ state.data.reportId }} · {{ label(TYPES, state.data.tipoBase) }} · {{ month(state.data.competencia) }}</p></div><StatusBadge :label="label(STATUSES, state.data.status)" :tone="tone(state.data.status)" /></div>
      <p v-if="state.data.mensagem" class="mt-4 rounded-xl bg-sage-light p-4 text-sm text-sage-muted">{{ text(state.data.mensagem) }}</p>
      <dl class="mt-5 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div><dt class="text-xs text-sage-muted">Enviado em</dt><dd class="mt-1 font-semibold">{{ date(state.data.criadoEm) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Autor do envio</dt><dd class="mt-1 break-words font-semibold">{{ state.data.criadoPor || 'Não informado' }}</dd><dd class="mt-1 text-xs text-sage-muted">{{ label(PROFILES, state.data.perfilCriador) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Origem</dt><dd class="mt-1 font-semibold">{{ label(ORIGINS, state.data.origemLote) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Início do processamento</dt><dd class="mt-1">{{ date(state.data.iniciadoEm) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Fim do processamento</dt><dd class="mt-1">{{ date(state.data.finalizadoEm) }}</dd></div>
        <div><dt class="text-xs text-sage-muted">Linhas válidas / total processado</dt><dd class="mt-1 font-semibold">{{ count(state.data.linhasValidas) }} / {{ count(state.data.totalLinhas) }}</dd></div>
      </dl>
      <p v-if="state.data.rejeicaoIntegral" class="mt-4 rounded-xl bg-danger-bg p-4 text-sm text-danger-dark">Este envio foi rejeitado integralmente. As validações foram preservadas para consulta.</p>
      <section v-if="state.data.status === 'EXCLUIDO' || state.data.excluidoEm" class="mt-5 rounded-xl border border-sage-border bg-sage-light p-4 text-sm"><h3 class="font-bold">Exclusão registrada</h3><p class="mt-2">{{ date(state.data.excluidoEm) }} · {{ state.data.excluidoPor || 'Autor não informado' }}</p><p class="mt-1 text-xs text-sage-muted">{{ label(PROFILES, state.data.perfilExclusao) }}</p><p class="mt-2 break-words">{{ text(state.data.motivoExclusao || 'Motivo não informado no registro histórico.') }}</p><p class="mt-2 text-xs text-sage-muted">A exclusão dos dados não remove este histórico nem suas validações.</p></section>
      <div v-if="state.data.envioAnteriorReportId || state.data.substituidoPorReportId" class="mt-4 flex flex-wrap gap-4 text-xs"><button v-if="positiveId(state.data.envioAnteriorReportId)" type="button" class="focus-ring font-semibold underline underline-offset-4" @click="$emit('select', state.data.envioAnteriorReportId)">Consultar carga anterior #{{ state.data.envioAnteriorReportId }}</button><button v-if="positiveId(state.data.substituidoPorReportId)" type="button" class="focus-ring font-semibold underline underline-offset-4" @click="$emit('select', state.data.substituidoPorReportId)">Consultar carga substituta #{{ state.data.substituidoPorReportId }}</button></div>
      <div class="mt-5 border-t border-sage-border-light pt-5"><button v-if="state.data.arquivoImportacaoId" type="button" class="focus-ring rounded-full border border-sage-border px-4 py-2 text-xs font-semibold hover:bg-sage-light disabled:opacity-50" :disabled="download.state.loading" @click="downloadOriginal">{{ download.state.loading ? 'Preparando arquivo…' : 'Baixar arquivo original' }}</button><p v-else class="text-xs text-sage-muted">Arquivo original não disponível para esta carga.</p><p v-if="download.state.error" class="mt-3 text-sm text-danger-dark" role="alert">Não foi possível baixar o arquivo. Verifique seu acesso e tente novamente.</p><p v-if="downloadStarted" class="mt-3 text-xs text-sage-muted" role="status">Download iniciado.</p></div>
      <section class="mt-6 border-t border-sage-border-light pt-5" aria-labelledby="import-validations-heading">
        <h3 id="import-validations-heading" class="text-lg font-bold">Validações do envio</h3>
        <p class="mt-2 text-xs text-sage-muted">{{ count(state.data.totalImpeditivos) }} impeditivas · {{ count(state.data.totalAdvertencias) }} advertências · {{ count(state.data.totalAvisos) }} avisos</p>
        <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="applyValidations"><div><label :for="`validation-severity-${id}`" class="text-xs font-semibold">Severidade</label><select :id="`validation-severity-${id}`" v-model="validationDraft.severidade" class="audit-detail-control"><option value="">Todas</option><option value="IMPEDITIVO">Impeditiva</option><option value="ADVERTENCIA">Advertência</option><option value="AVISO">Aviso</option></select></div><div><label :for="`validation-field-${id}`" class="text-xs font-semibold">Campo</label><input :id="`validation-field-${id}`" v-model="validationDraft.campo" class="audit-detail-control" maxlength="100" placeholder="Ex.: matrícula" /></div><button type="submit" class="focus-ring rounded-full border border-sage-border px-4 py-2.5 text-xs font-bold hover:bg-sage-light" :disabled="validations.state.loading">Filtrar validações</button></form>
        <div class="mt-4"><AuditQueryStatus :state="validations.state" @retry="retryValidations" /></div>
        <template v-if="validations.state.data && !validations.state.loading && !validations.state.error">
          <p v-if="!validations.state.data.content.length" class="mt-4 rounded-xl bg-sage-light p-4 text-sm text-sage-muted">Nenhuma validação registrada para estes filtros.</p>
          <div v-else class="mt-4 overflow-x-auto"><table class="validation-table"><caption class="sr-only">Validações persistidas da carga</caption><thead><tr><th scope="col">Linha</th><th scope="col">Campo</th><th scope="col">Severidade</th><th scope="col">Motivo</th></tr></thead><tbody><tr v-for="(item, index) in validations.state.data.content" :key="item.id || index"><td>{{ item.linha > 0 ? item.linha : 'Arquivo' }}</td><td>{{ item.campo || 'Não informado' }}</td><td><StatusBadge :label="label(SEVERITIES, item.severidade)" :tone="tone(item.severidade)" /></td><td class="max-w-lg whitespace-pre-wrap break-words">{{ text(item.motivo || 'Motivo não informado') }}</td></tr></tbody></table></div>
          <AuditPagination :page="validations.state.data" label="Paginação das validações" @page="validationPage = $event" @size="validationSize = $event; validationPage = 0" />
        </template>
      </section>
    </template>
  </section>
</template>
<script setup>
import { computed, nextTick, onUnmounted, reactive, ref, watch } from 'vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import AuditQueryStatus from './AuditQueryStatus.vue'
import AuditPagination from './AuditPagination.vue'
import { auditService } from '@/services/auditService'
import { createAuditResource } from '@/services/auditResource'
import { useAuditSessionResource } from '@/services/useAuditListing'
import { useAccountStore } from '@/stores/accountStore'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import { IMPORT_TYPES as TYPES, IMPORT_STATUSES as STATUSES, AUDIT_PROFILES as PROFILES, IMPORT_ORIGINS as ORIGINS, SEVERITIES, auditLabel as label, auditDate as date, auditMonth as month, auditCount as count, statusTone as tone, positiveId } from '@/services/auditModel'
import { userFacingText as text } from '@/services/userFacingText'
const props = defineProps({ id: { type: String, required: true } })
defineEmits(['close', 'select'])
const account = useAccountStore(), access = useAccessPolicy(), panel = ref(null)
const resource = useAuditSessionResource(auditService.batch, () => ({ id: props.id }), 'viewData', true)
const { state } = resource
const validationDraft = reactive({ campo: '', severidade: '' }), validationApplied = ref({ campo: '', severidade: '' })
const validationPage = ref(0), validationSize = ref(20)
const validationParams = computed(() => state.data ? { id: props.id, ...validationApplied.value, page: validationPage.value, size: validationSize.value, sort: 'linha,asc' } : null)
const validations = useAuditSessionResource(auditService.validations, () => validationParams.value, 'viewData', true)
const retryValidations = () => validationParams.value && validations.load(validationParams.value)
function applyValidations() {
  const next = { campo: validationDraft.campo.trim(), severidade: validationDraft.severidade }
  if (validationPage.value === 0 && JSON.stringify(next) === JSON.stringify(validationApplied.value)) retryValidations()
  else { validationPage.value = 0; validationApplied.value = next }
}
const download = createAuditResource(auditService.original, true), downloadStarted = ref(false)
watch(() => [props.id, account.user?.id, account.user?.role, ...(account.user?.permissions || [])].join('|'), async () => {
  download.clear(); downloadStarted.value = false
  validationDraft.campo = ''; validationDraft.severidade = ''; validationApplied.value = { campo: '', severidade: '' }; validationPage.value = 0
  await nextTick(); panel.value?.focus()
}, { immediate: true })
onUnmounted(download.dispose)
async function downloadOriginal() {
  if (download.state.loading || !account.user || !access.can('viewData')) return
  downloadStarted.value = false
  const filename = String(state.data?.nomeArquivo || 'arquivo-original.xlsx').replace(/[\\/\u0000-\u001f:"<>|?*]/g, '_')
  if (!await download.load({ id: props.id })) return
  let url, link
  try {
    url = URL.createObjectURL(download.state.data); link = document.createElement('a')
    link.href = url; link.download = filename; document.body.appendChild(link); link.click(); downloadStarted.value = true
  } catch { download.state.error = 'Não foi possível iniciar o download.' }
  finally { link?.remove(); if (url) setTimeout(() => URL.revokeObjectURL(url), 1000) }
}
</script>
<style scoped>
.audit-detail-control { @apply focus-ring mt-2 block rounded-xl border border-sage-border bg-white px-3 py-2 text-sm font-normal; }
.validation-table { @apply w-full min-w-[600px] text-left text-sm; }
.validation-table th { @apply bg-sage-pill px-3 py-3 text-xs font-semibold text-sage-muted; }
.validation-table td { @apply border-b border-sage-border-light px-3 py-3 align-top; }
</style>
