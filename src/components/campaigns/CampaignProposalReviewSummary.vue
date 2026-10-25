<template>
  <section class="space-y-5" :aria-labelledby="hideCampaignSummary ? undefined : headingId">
    <div v-if="!hideCampaignSummary" class="rounded-[22px] bg-white p-5 sm:p-6">
      <h2 :id="headingId" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Conferência das regras</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Confira os campos atuais, as origens disponíveis e os avisos de todas as regras.</p>
      <dl class="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt class="text-xs font-bold text-sage-muted">Título</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ campaign.titulo || 'Pendente' }}</dd></div>
        <div><dt class="text-xs font-bold text-sage-muted">Vigência comum</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ formatCampaignValidity(campaign) }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs font-bold text-sage-muted">Descrição original</dt><dd class="mt-1 whitespace-pre-wrap text-sm leading-6 text-brand-dark">{{ campaign.textoOriginal || 'Pendente' }}</dd></div>
      </dl>
    </div>

    <div v-if="!campaign.propostas.length" class="rounded-[22px] bg-white p-6 text-sm text-sage-muted">Nenhuma regra para conferir.</div>
    <component :is="showPython || collapsible ? 'details' : 'article'" v-for="(proposal, index) in campaign.propostas" :key="proposal.clientId" class="group rounded-[22px] border p-5 sm:p-6" :class="showPython || collapsible ? 'border-sage-border-dark bg-gradient-to-br from-sage-light to-white hover:border-brand-ring motion-safe:transition-colors' : 'border-transparent bg-white'">
      <component :is="showPython || collapsible ? 'summary' : 'div'" class="flex items-start justify-between gap-4 rounded" :class="showPython || collapsible ? 'focus-ring cursor-pointer list-none [&::-webkit-details-marker]:hidden' : ''">
        <div class="min-w-0">
          <h3 class="text-lg font-extrabold text-brand-dark">Regra {{ index + 1 }}</h3>
          <p class="mt-2 break-words text-sm leading-6 text-sage-subtle">{{ explainRule(proposal) }}</p>
        </div>
        <ChevronDown v-if="showPython || collapsible" :size="20" aria-hidden="true" class="mt-1 h-7 w-7 shrink-0 rounded-full bg-sage p-1 text-sage-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none" />
      </component>
      <div class="mt-5 border-t border-sage-border-light pt-5">
        <span class="inline-flex rounded-full px-3 py-1 text-xs font-bold" :class="statusTone(proposal)">{{ statusLabel(proposal) }}</span>
      <details v-if="proposal.trechoOriginal || proposal.textoOrigem" class="mt-3 text-xs leading-5 text-sage-muted">
        <summary class="focus-ring cursor-pointer rounded">Trecho original — referência histórica</summary>
        <p class="mt-2 whitespace-pre-wrap break-words">{{ proposal.trechoOriginal || proposal.textoOrigem }}</p>
      </details>
      <dl class="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div v-for="item in summaryFields(proposal)" :key="item.label">
          <dt class="text-xs font-bold text-sage-muted">{{ item.label }}</dt>
          <dd class="mt-1 break-words text-sm font-semibold text-brand-dark">{{ item.value }}</dd>
        </div>
        <div><dt class="text-xs font-bold text-sage-muted">Taxa final</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ proposal.campos.taxaPercentual ? proposal.campos.taxaPercentual + '%' : 'Pendente' }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs font-bold text-sage-muted">Faixa por valor da venda</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ rangeText(proposal.campos) }}</dd></div>
      </dl>
      <div class="mt-4 rounded-xl bg-sage-light p-4 text-sm">
        <p v-if="!ruleArtifactsCurrent(proposal, campaign)" class="font-bold text-warning-text">Explicação recebida desatualizada. O resumo acima acompanha os campos atuais.</p>
        <p v-else-if="proposal.metadadosRecebidos.explicacao" class="whitespace-pre-wrap">{{ userFacingText(proposal.metadadosRecebidos.explicacao) }}</p>
        <p v-else class="text-sage-muted">Explicação do serviço não recebida. Confira o resumo dos campos atuais.</p>
        <p v-if="proposal.metadadosRecebidos.vigenciaRecebida" class="mt-3 text-xs">Período recebido neste bloco: {{ proposal.metadadosRecebidos.vigenciaRecebida.dataInicio || 'Pendente' }} → {{ proposal.metadadosRecebidos.vigenciaRecebida.dataFim || 'Pendente' }}</p>
        <p v-if="proposal.metadadosRecebidos.operacaoBase" class="mt-3 text-xs">Operação: {{ userFacingText(proposal.camposManuais.includes('taxaPercentual') ? 'Percentual definido manualmente' : proposal.metadadosRecebidos.operacaoBase.tipoOperacao) }}.</p>
        <p v-if="proposal.metadadosRecebidos.bonusPercentual != null" class="mt-2 text-xs">Bônus percentual recebido (somente leitura): {{ decimalFractionToPercent(proposal.metadadosRecebidos.bonusPercentual) }}%.</p>
        <p v-if="proposal.metadadosRecebidos.bonusValorFixo != null" class="mt-2 text-xs">Bônus fixo recebido (somente leitura): {{ formatMoney(String(proposal.metadadosRecebidos.bonusValorFixo)) }}.</p>
      </div>
      <details class="mt-4 text-sm">
        <summary class="focus-ring cursor-pointer rounded font-bold">Origens dos campos e referências disponíveis</summary>
        <dl class="mt-3 space-y-2">
          <div v-for="field in originFields" :key="field"><dt class="text-xs font-bold">{{ labels[field] || (field === 'dataInicio' ? 'Início da vigência' : 'Fim da vigência') }}</dt><dd class="text-xs leading-5 text-sage-muted">{{ userFacingText(describeFieldOrigin(proposal, field)) }}</dd></div>
        </dl>
        <p v-if="proposal.metadadosRecebidos.origensDesatualizadas" class="mt-3 text-xs text-warning-text">As origens anteriores não certificam os campos atuais após alterações do público.</p>
        <p v-for="(reference, referenceIndex) in references(proposal)" :key="referenceIndex" class="mt-2 text-xs text-sage-muted">Referência consultada: {{ userFacingText(reference.tipo) }} · {{ userFacingText(reference.identificador) }} · {{ userFacingText(reference.descricao) }}. Uma consulta não comprova a origem de todos os campos.</p>
      </details>
      <ul v-if="proposalDisplayPendings(validation, proposal.clientId).length" class="mt-4 space-y-2">
        <li v-for="item in proposalDisplayPendings(validation, proposal.clientId)" :key="item.id" class="rounded-xl px-3 py-2 text-sm" :class="item.severidade === 'IMPEDITIVO' ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'">
          {{ item.severidade === 'IMPEDITIVO' ? 'Impeditiva:' : 'Aviso:' }} {{ userFacingText(item.mensagem) }}
        </li>
      </ul>
      <CampaignRulePython v-if="showPython" :rule-number="index + 1" :code="proposal.metadadosRecebidos.pythonAtualizado || ''" :current="ruleArtifactsCurrent(proposal, campaign) && !proposal.metadadosRecebidos.artefatosLegados" />
      </div>
    </component>
    <CampaignImpactSummary v-if="showPython && campaign.propostas.length" :impact="impact" />
  </section>
</template>

<script setup>
import { userFacingText } from '@/services/userFacingText'
import { useId } from 'vue'
import { ruleArtifactsCurrent } from '@/services/campaignRuleArtifacts'
import CampaignImpactSummary from './CampaignImpactSummary.vue'
import { describeFieldOrigin } from '@/services/campaignFieldOrigins'
import { PROPOSAL_FIELD_NAMES } from '@/services/campaignProposalModel'
import { RULE_FIELD_LABELS as labels } from '@/services/ruleReinterpretation'
import CampaignRulePython from './CampaignRulePython.vue'
import { ChevronDown } from 'lucide-vue-next'
import { parseDecimalToMinor, decimalFractionToPercent } from '@/services/campaignProposalValidation'
import { formatCampaignValidity, proposalDisplayPendings } from '@/services/campaignProposalFormatting'

function references(proposal) {
  const m = proposal.metadadosRecebidos
  const unique = new Map([...(m.referenciasConsultadas || []), ...(m.referenciasValidadas || [])].map((ref) => [JSON.stringify(ref), ref]))
  return [...unique.values()]
}

const props = defineProps({
  impact: { type: Object, default: null },
  campaign: { type: Object, required: true },
  validation: { type: Object, required: true },
  showPython: { type: Boolean, default: false },
  collapsible: Boolean,
  hideCampaignSummary: Boolean
})

const headingId = 'proposal-review-' + useId()
const originFields = [...PROPOSAL_FIELD_NAMES, 'dataInicio', 'dataFim']

function summaryFields(proposal) {
  const fields = proposal.campos
  return [
    { label: 'Marca', value: [fields.codMarca, fields.descrMarca].filter(Boolean).join(' · ') || 'Sem filtro' },
    { label: 'Cargo', value: [fields.codCargo, fields.descriCargo].filter(Boolean).join(' · ') || 'Sem filtro' },
    { label: 'Loja', value: fields.codLoja || 'Sem filtro' },
    { label: 'Canal', value: fields.canal || 'Sem filtro' },
    { label: 'Matrícula', value: fields.matricula || 'Sem filtro' },
    { label: 'Público', value: fields.publicoTodasVendas ? 'Todas as vendas' : 'Filtros combinados por E' }
  ]
}
function formatMoney(value) {
  const minor = parseDecimalToMinor(value, 2)
  return Number.isFinite(minor)
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minor / 100)
    : 'valor inválido'
}
function rangeText(fields) {
  const min = fields.valorMinimo ? (fields.minimoInclusivo === true ? 'a partir de ' : fields.minimoInclusivo === false ? 'acima de ' : 'mínimo com inclusão pendente: ') + formatMoney(fields.valorMinimo) : ''
  const max = fields.valorMaximo ? (fields.maximoInclusivo === true ? 'até ' : fields.maximoInclusivo === false ? 'abaixo de ' : 'máximo com inclusão pendente: ') + formatMoney(fields.valorMaximo) : ''
  if (!min && !max) return 'Sem restrição por valor da venda'
  return [min, max].filter(Boolean).join(' e ')
}
function explainRule(proposal) {
  const fields = proposal.campos
  const rate = parseDecimalToMinor(fields.taxaPercentual, 2)
  const rateText = Number.isFinite(rate) && rate > 0 ? 'Comissão de ' + fields.taxaPercentual + '% sobre o valor de cada venda.' : 'Taxa de comissão pendente ou inválida.'
  const filters = summaryFields(proposal).filter((item) => item.label !== 'Público' && item.value !== 'Sem filtro')
  let audience
  if (fields.publicoTodasVendas && filters.length) audience = 'Público inconsistente: todas as vendas e filtros específicos foram selecionados; revise os campos.'
  else if (fields.publicoTodasVendas) audience = 'Aplica-se a todas as vendas.'
  else if (!filters.length) audience = 'Público ainda não definido.'
  else audience = 'Público: ' + filters.map((item) => item.label.toLowerCase() + ': ' + item.value).join('; ') + '. Todos os filtros devem ser atendidos juntos.'
  return rateText + ' ' + audience + ' Faixa por venda: ' + rangeText(fields) + '. A vigência é a mesma da campanha.'
}
function statusLabel(proposal) {
  const pending = proposalDisplayPendings(props.validation, proposal.clientId)
  if (pending.some((item) => item.severidade === 'IMPEDITIVO')) return 'Com pendências'
  if (pending.some((item) => item.severidade === 'AVISO')) return 'Com avisos'
  return 'Campos preenchidos'
}
function statusTone(proposal) {
  const label = statusLabel(proposal)
  return label === 'Com pendências' ? 'bg-danger-bg text-danger-dark' : label === 'Com avisos' ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-dark'
}
</script>
