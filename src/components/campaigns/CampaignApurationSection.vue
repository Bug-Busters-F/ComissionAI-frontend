<template>
  <section v-if="access.can('viewCampaignApuration')" id="campaign-apuration" class="space-y-5 rounded-[22px] border border-sage-border bg-white p-6 sm:p-7" aria-labelledby="apuration-title" :aria-busy="state.working">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="apuration-title" class="text-xl font-extrabold text-brand-dark">Resultados da campanha</h2><p class="mt-2 text-sm text-sage-muted">Apure as vendas reais de cada competência dentro da vigência e consulte os resultados desta campanha.</p></div>
      <button type="button" class="secondary" :disabled="state.working || state.loading || state.checking" @click="refresh">Atualizar consulta</button>
    </header>
    <p v-if="!campaign.versaoVigente" class="rounded-xl bg-sage-light p-4 text-sm text-sage-muted">Publique a campanha para disponibilizar a apuração definitiva. Os resultados anteriores, quando existentes, continuam disponíveis no histórico.</p>
    <div v-else class="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <label class="text-sm font-bold text-brand-dark">Competência da apuração
        <select class="control mt-2 h-12" :value="state.month" :disabled="state.working || !flow.periods.value.length" @change="changeMonth($event.target.value)"><option v-for="p in flow.periods.value" :key="p.competencia" :value="p.competencia">{{ month(p.competencia) }}</option></select>
      </label>
      <div v-if="access.can('runCampaignApuration')" class="flex flex-wrap items-center justify-center gap-3 sm:justify-end">
        <button type="button" class="secondary inline-flex h-12 items-center justify-center" :disabled="state.working || !state.month" @click="openBases">Selecionar bases</button>
        <button type="button" class="primary inline-flex h-12 items-center justify-center" :disabled="!flow.canRun.value" @click="confirmOpen = true">{{ state.working ? 'Apurando campanha…' : 'Apurar competência' }}</button>
      </div>
      <p v-if="flow.period.value" class="-mt-2 text-xs text-sage-muted sm:col-span-2">Versão vigente {{ campaign.versaoVigente }} · {{ date(flow.period.value.dataInicio) }} → {{ date(flow.period.value.dataFim) }}</p>
    </div>
    <p v-if="state.checking" role="status" class="text-sm text-sage-muted">Conferindo bases, revisão do código e fechamento…</p>
    <p v-if="state.ready && !state.working" class="text-sm text-success-dark">Bases conferidas e código aprovado para esta competência.</p>
    <div v-if="state.checkError" class="rounded-xl bg-warning-bg p-4 text-sm text-warning-text" role="alert"><p>{{ state.checkError }}</p><ul v-if="state.coverageIssues?.length" class="mt-3 space-y-2"><li v-for="issue in state.coverageIssues" :key="issue.area"><strong>{{ issue.area }}:</strong> {{ issue.message }}<ul v-if="issue.references?.length" class="mt-1 list-inside list-disc"><li v-for="reference in issue.references" :key="reference">{{ reference }}</li></ul></li></ul><button v-if="state.checkError.includes('bases')" type="button" :disabled="state.working" class="mt-2 inline-block rounded font-bold underline" @click="openBases">Selecionar ou corrigir bases</button></div>
    <p v-if="!access.can('runCampaignApuration')" class="text-sm text-sage-muted">Seu perfil permite consultar os resultados. A execução é realizada pelo gerente ou administrador.</p>
    <div v-if="state.error" role="alert" class="rounded-xl bg-danger-bg p-4 text-sm text-danger-dark"><p>{{ state.error }}</p><button v-if="!state.uncertain" type="button" class="mt-2 rounded font-bold underline" :disabled="state.working" @click="refresh">Consultar novamente</button></div>
    <div v-if="state.uncertain" class="space-y-3 rounded-xl bg-warning-bg p-4 text-sm text-warning-text" role="alert">
      <p>Há uma solicitação sem conclusão confirmada para {{ month(state.uncertain.competencia) }}. Confira o histórico antes de solicitar outra execução. Não haverá reenvio automático. Se encontrar o novo resultado, selecione-o no histórico para reconhecê-lo. Caso não apareça, aguarde e consulte novamente.</p>
      <div class="flex flex-wrap gap-3"><button type="button" class="secondary" :disabled="state.working || state.loading" @click="flow.loadHistory()">Consultar histórico</button><button v-if="flow.canResolveUncertain.value" type="button" class="secondary" :disabled="state.working || state.loading" @click="acknowledge">Reconhecer resultado consultado</button></div>
    </div>
    <p v-if="state.loading" role="status" class="text-sm text-sage-muted">Consultando apurações…</p>
    <p v-else-if="state.historyLoaded && !state.history.length" class="text-sm text-sage-muted">Esta campanha ainda não possui apurações.</p>
    <label v-if="state.history.length" class="block text-sm font-bold text-brand-dark">Histórico de apurações
      <select class="control mt-2" :value="state.selected" :disabled="state.working || state.detailLoading" @change="select($event.target.value)"><option value="">Selecione um resultado</option><option v-for="entry in state.history" :key="entry.apuracaoId" :value="entry.apuracaoId">{{ month(entry.competencia) }} · Versão {{ entry.versaoCampanhaNumero }} · {{ dateTime(entry.executadoEm) }} · {{ entry.executadoPor || 'Responsável não informado' }}</option></select>
    </label>
    <p v-if="state.detailLoading" role="status" class="text-sm text-sage-muted">Carregando resultado…</p>
    <p v-if="state.detailError" role="alert" class="text-sm text-danger-dark">{{ state.detailError }} <button type="button" class="rounded font-bold underline" @click="select(state.selected)">Tentar novamente</button></p>
    <div v-if="result && !state.detailLoading" class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-sage-border pt-5"><div><h3 class="font-bold text-brand-dark">{{ month(result.competencia) }} · {{ statusLabel }}</h3><p class="mt-1 text-xs text-sage-muted">{{ date(result.dataInicio) }} → {{ date(result.dataFim) }} · Versão {{ result.versaoCampanhaNumero }}{{ result.versaoCampanhaNumero === campaign.versaoVigente ? ' (vigente)' : ' (histórica)' }}</p></div><button type="button" class="secondary" :disabled="state.exporting || state.working" @click="exportCsv">{{ state.exporting ? 'Preparando arquivo…' : 'Exportar relatório CSV' }}</button></div>
      <p v-if="state.exportError" role="alert" class="text-sm text-danger-dark">{{ state.exportError }}</p>
      <div class="grid gap-3 sm:grid-cols-3"><div v-for="item in totals" :key="item.label" class="rounded-2xl border border-sage-border bg-sage-light/30 p-4"><p class="text-xs font-bold text-sage-muted">{{ item.label }}</p><p class="mt-2 text-xl font-black text-brand-dark">{{ item.value }}</p></div></div>
      <p class="text-xs text-sage-muted">Valores reais deste resultado, sem projeção de volume ou comparação com a comissão contratual. Bônus apresentado separadamente, conforme informado na apuração.</p>
      <div class="flex flex-wrap gap-x-6 gap-y-2 text-sm"><p><strong>{{ result.totalVendasProcessadas }}</strong> vendas analisadas</p><p><strong>{{ result.totalCalculados }}</strong> calculadas</p><p :class="result.totalImpedimentos ? 'font-bold text-warning-text' : ''"><strong>{{ result.totalImpedimentos }}</strong> com impedimentos</p></div>
      <p v-if="!result.totalVendasProcessadas" class="rounded-xl bg-sage-light p-4 text-sm">Nenhuma venda foi encontrada para o público e o período desta apuração.</p>
      <p v-if="incompleteItems" class="rounded-xl bg-warning-bg p-4 text-sm text-warning-text">Os totais foram recuperados, mas o detalhamento disponível contém {{ result.itens.length }} das {{ result.totalCalculados }} vendas calculadas. Não use esta lista como detalhamento completo do resultado histórico.</p>
      <div v-if="result.itens.length" class="overflow-x-auto"><table class="w-full text-left text-sm"><caption class="mb-3 text-left font-bold text-brand-dark">Vendas apuradas · {{ result.itens.length }} registros disponíveis</caption><thead class="bg-sage-light text-xs text-sage-muted"><tr><th class="p-3">Matrícula</th><th class="p-3">Data / loja</th><th class="p-3">Valor da venda</th><th class="p-3">Taxa</th><th class="p-3">Comissão</th><th class="p-3">Memória</th></tr></thead><tbody><tr v-for="item in visibleItems" :key="item.id || item.idVenda" class="border-b border-sage-border"><td class="p-3">{{ item.matricula || 'Não informada' }}</td><td class="p-3">{{ date(item.dataVenda) }}<span class="block text-xs text-sage-muted">Loja {{ item.codLoja ?? 'não informada' }}</span></td><td class="p-3">{{ money(item.valorVenda) }}</td><td class="p-3">{{ percent(item.taxaAplicada) }}</td><td class="p-3 font-bold">{{ money(item.valorComissao) }}</td><td class="p-3"><details><summary class="cursor-pointer whitespace-nowrap font-bold">Ver memória</summary><dl class="mt-3 min-w-52 space-y-2 text-xs text-sage-muted"><div><dt class="font-bold">Origem da taxa</dt><dd>{{ source(item.origemTaxa) }}</dd></div><div><dt class="font-bold">Marca / cargo</dt><dd>{{ item.codMarca ?? 'Não informado' }} / {{ item.codCargo ?? 'Não informado' }}</dd></div><div><dt class="font-bold">Bônus percentual apurado</dt><dd>{{ money(item.valorBonusPercentual) }}</dd></div><div><dt class="font-bold">Bônus fixo apurado</dt><dd>{{ money(item.valorBonusFixo) }}</dd></div><div><dt class="font-bold">Calculado em</dt><dd>{{ dateTime(item.calculadoEm) }}</dd></div><div><dt class="font-bold">Protocolo da venda</dt><dd class="break-all">{{ item.protocoloCalculo || 'Não informado' }}</dd></div></dl></details></td></tr></tbody></table><div class="mt-4 flex items-center justify-between gap-3 text-xs"><p>Página {{ page }} de {{ pages }}</p><div class="flex gap-2"><button type="button" class="secondary" :disabled="page <= 1" @click="page--">← Anterior</button><button type="button" class="secondary" :disabled="page >= pages" @click="page++">Próxima →</button></div></div></div>
      <details v-if="result.totalImpedimentos || result.impedimentos.length" class="rounded-xl border border-warning/40 p-4"><summary class="cursor-pointer text-sm font-bold text-warning-text">Impedimentos da apuração ({{ result.totalImpedimentos }})</summary><p v-if="result.impedimentos.length < result.totalImpedimentos" class="mt-3 text-sm text-sage-muted">O histórico informa os impedimentos, mas não devolveu todos os motivos individuais. Os totais permanecem registrados.</p><ul class="mt-3 max-h-72 space-y-3 overflow-auto text-sm"><li v-for="(item, index) in result.impedimentos" :key="index"><strong>{{ item.matricula || 'Matrícula não informada' }} · {{ date(item.dataVenda) }}</strong><p>{{ userFacingText(item.motivo) }}</p></li></ul></details>
      <footer class="space-y-1 border-t border-sage-border pt-4 text-xs text-sage-muted"><p>Executada por {{ result.executadoPor || 'Responsável não informado' }} em {{ dateTime(result.executadoEm) }}</p><p class="break-all">Protocolo: {{ result.protocolo }}</p><p v-if="result.observacoes">{{ userFacingText(result.observacoes) }}</p></footer>
    </div>
    <CampaignLifecycleDialog v-if="basesMounted" :open="basesOpen" title="Bases para apuração" confirm-label="Confirmar bases" :disabled="!basesReady" :busy="basesBusy" @cancel="closeBases" @confirm="confirmBases">
      <label class="block text-sm font-bold">Competência
        <select class="control mt-2" :value="state.month" :disabled="basesBusy || state.working" @change="changeMonth($event.target.value)"><option v-for="p in flow.periods.value" :key="p.competencia" :value="p.competencia">{{ month(p.competencia) }}</option></select>
      </label>
      <CampaignBasesSection ref="basesSection" :campanha-id="campaign.id" :competencia="state.month" :auto-select-competence="false" compact @selection-ready="basesReady = $event" @busy-change="basesBusy = $event" @base-associated="basesChanged" @base-uploaded="basesChanged" @base-effective="baseEffective" />
    </CampaignLifecycleDialog>
    <CampaignLifecycleDialog :open="confirmOpen" title="Apurar esta campanha?" confirm-label="Confirmar apuração" :busy="state.working" :disabled="!flow.canRun.value" @cancel="confirmOpen = false" @confirm="execute">
      <p>Será apurada a versão {{ campaign.versaoVigente }} para {{ month(state.month) }}, de {{ date(flow.period.value?.dataInicio) }} a {{ date(flow.period.value?.dataFim) }}.</p>
      <p class="mt-3">Esta operação grava resultados definitivos e pode substituir cálculos anteriores dessas vendas. Não é uma simulação.</p>
      <p v-if="alreadyCalculated" class="mt-3 font-bold text-warning-text">Já existe apuração desta competência. A nova execução será registrada no histórico.</p>
      <label class="mt-4 block font-bold">Observação (opcional)<textarea v-model="notes" class="control mt-2 min-h-20" :disabled="state.working" maxlength="1000" /></label>
    </CampaignLifecycleDialog>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useAccountStore } from '@/stores/accountStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useAccessPolicy } from '@/services/useAccessPolicy'
import { createCampaignApurationService } from '@/services/campaignApurationService'
import { createCampaignApuration } from '@/services/campaignApuration'
import { userFacingText } from '@/services/userFacingText'
import CampaignLifecycleDialog from './CampaignLifecycleDialog.vue'
import CampaignBasesSection from './CampaignBasesSection.vue'
const emit = defineEmits(['competence-selected', 'base-effective'])
const props = defineProps({ campaign: { type: Object, required: true } })
const access = useAccessPolicy(), account = useAccountStore(), notifications = useNotificationStore()
const api = createCampaignApurationService()
let storage
try { storage = window.sessionStorage } catch { /* Storage availability checked again before a financial request. */ }
const flow = createCampaignApuration({ campaign: () => props.campaign, api, canView: () => access.can('viewCampaignApuration'), canExecute: () => access.can('runCampaignApuration'), userId: account.user?.id, storage, notify: (type, title, message) => notifications[type](title, message) })
const state = flow.state, result = computed(() => state.detail), confirmOpen = ref(false), notes = ref(''), page = ref(1)
const basesOpen = ref(false), basesMounted = ref(false), basesBusy = ref(false), basesReady = ref(false), basesSection = ref(null)
async function openBases() {
  if (state.working || !state.month || !access.can('runCampaignApuration')) return
  const mounted = basesMounted.value
  basesMounted.value = true; basesOpen.value = true
  if (mounted) await basesSection.value?.refresh()
}
async function confirmBases() { if (!basesReady.value || basesBusy.value) return; if (await basesSection.value?.confirmSelection()) await closeBases() }
async function closeBases() { if (basesBusy.value) return; basesOpen.value = false; await refresh() }
async function basesChanged() { await flow.check() }
function baseEffective() { emit('base-effective'); void basesChanged() }
const pages = computed(() => Math.max(1, Math.ceil((result.value?.itens.length || 0) / 10)))
const visibleItems = computed(() => result.value?.itens.slice((page.value - 1) * 10, page.value * 10) || [])
const incompleteItems = computed(() => result.value && result.value.itens.length !== result.value.totalCalculados)
const alreadyCalculated = computed(() => state.history.some(r => r.competencia === state.month))
const statusLabel = computed(() => result.value?.status === 'CONCLUIDO' ? result.value.totalImpedimentos ? 'Concluída com impedimentos' : 'Concluída' : 'Resultado com ressalvas')
const totals = computed(() => result.value ? [{ label: 'Vendas calculadas', value: money(result.value.valorTotalVendas) }, { label: 'Comissão apurada', value: money(result.value.valorTotalComissao) }, { label: 'Bônus apurado', value: money(result.value.valorTotalBonus) }] : [])
function money(value) { return value != null && value !== '' && Number.isFinite(Number(value)) ? Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado' }
function percent(value) { return value != null && value !== '' && Number.isFinite(Number(value)) ? `${(Number(value) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%` : 'Não informada' }
function month(value) { return /^\d{4}-\d{2}$/.test(value || '') ? `${value.slice(5)}/${value.slice(0, 4)}` : 'Não informada' }
function date(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : 'Não informada' }
function dateTime(value) { const date = value ? new Date(value) : null; return date && Number.isFinite(date.getTime()) ? date.toLocaleString('pt-BR') : 'Data não informada' }
function source(value) { return value === 'REGRA_CAMPANHA' ? 'Regra da campanha' : ['BASE_COMISS', 'TAXA_BASE_CONTRATUAL'].includes(value) ? 'Taxa contratual' : 'Origem não informada' }
async function refresh() { await Promise.all([flow.loadHistory(), flow.check()]) }
async function changeMonth(value) { page.value = 1; await flow.changeMonth(value) }
async function select(id) { page.value = 1; await flow.select(id) }
async function acknowledge() { flow.acknowledge(); await flow.check() }
async function execute() { await flow.execute(notes.value); confirmOpen.value = false; page.value = 1 }
async function exportCsv() {
  if (!result.value || state.exporting || state.working) return
  const id = result.value.apuracaoId
  state.exporting = true; state.exportError = ''
  try {
    const blob = await api.exportCsv(props.campaign.id, id)
    if (!(blob instanceof Blob) || !blob.size || !blob.type.includes('text/csv')) throw new Error('Arquivo inválido')
    const url = URL.createObjectURL(blob), link = document.createElement('a')
    link.href = url; link.download = `campanha-${props.campaign.id}-apuracao-${id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { state.exportError = 'Não foi possível exportar o relatório. Tente novamente.' }
  finally { state.exporting = false }
}
watch(() => state.month, value => { if (value) emit('competence-selected', value) }, { immediate: true })
watch(() => result.value?.apuracaoId, () => { page.value = 1 })
void flow.init()
onBeforeUnmount(flow.dispose)
defineExpose({ refresh, selectCompetence: changeMonth })
</script>
<style scoped>
.control { @apply w-full rounded-xl border border-sage-border bg-white px-4 py-3 text-sm font-normal text-brand-dark; }
.primary { @apply focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50; }
.secondary { @apply focus-ring rounded-full border border-sage-border bg-white px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-50; }
</style>
