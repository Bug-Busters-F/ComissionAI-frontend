<template>
  <section class="space-y-5" aria-labelledby="proposal-review-heading">
    <div class="rounded-[22px] bg-white p-5 sm:p-6">
      <h2 id="proposal-review-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">Conferência das regras</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Confira os campos atuais de todos os blocos. Esta etapa não calcula comissão nem confirma cadastros.</p>
      <dl class="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt class="text-xs font-bold text-sage-muted">Título</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ campaign.titulo || 'Pendente' }}</dd></div>
        <div><dt class="text-xs font-bold text-sage-muted">Vigência comum</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ formatCampaignValidity(campaign) }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs font-bold text-sage-muted">Descrição original</dt><dd class="mt-1 whitespace-pre-wrap text-sm leading-6 text-brand-dark">{{ campaign.textoOriginal || 'Pendente' }}</dd></div>
      </dl>
    </div>

    <div v-if="!campaign.propostas.length" class="rounded-[22px] bg-white p-6 text-sm text-sage-muted">Nenhuma regra para conferir.</div>
    <component :is="showPython ? 'details' : 'article'" v-for="(proposal, index) in campaign.propostas" :key="proposal.clientId" class="group rounded-[22px] border p-5 sm:p-6" :class="showPython ? 'border-sage-border-dark bg-gradient-to-br from-sage-light to-white hover:border-brand-ring motion-safe:transition-colors' : 'border-transparent bg-white'">
      <component :is="showPython ? 'summary' : 'div'" class="flex items-start justify-between gap-4 rounded" :class="showPython ? 'focus-ring cursor-pointer list-none [&::-webkit-details-marker]:hidden' : ''">
        <div class="min-w-0">
          <h3 class="text-lg font-extrabold text-brand-dark">Regra {{ index + 1 }}</h3>
          <p class="mt-2 break-words text-sm leading-6 text-sage-subtle">{{ explainRule(proposal) }}</p>
        </div>
        <ChevronDown v-if="showPython" :size="20" aria-hidden="true" class="mt-1 h-7 w-7 shrink-0 rounded-full bg-sage p-1 text-sage-subtle transition-transform group-open:rotate-180 motion-reduce:transition-none" />
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
      <ul v-if="validation.byProposal[proposal.clientId]?.length" class="mt-4 space-y-2">
        <li v-for="item in validation.byProposal[proposal.clientId]" :key="item.id" class="rounded-xl px-3 py-2 text-sm" :class="item.severidade === 'IMPEDITIVO' ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'">
          {{ item.severidade === 'IMPEDITIVO' ? 'Impeditiva:' : 'Aviso:' }} {{ item.mensagem }}
        </li>
      </ul>
      <CampaignPythonExample v-if="showPython" :rule-number="index + 1" expanded />
      </div>
    </component>
    <CampaignPythonExample v-if="showPython && campaign.propostas.length" campaign />
  </section>
</template>

<script setup>
import CampaignPythonExample from './CampaignPythonExample.vue'
import { ChevronDown } from 'lucide-vue-next'
import { parseDecimalToMinor } from '@/services/campaignProposalValidation'
import { formatCampaignValidity } from '@/services/campaignProposalFormatting'

const props = defineProps({
  campaign: { type: Object, required: true },
  validation: { type: Object, required: true },
  showPython: { type: Boolean, default: false }
})

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
  const pending = props.validation.byProposal[proposal.clientId] || []
  if (pending.some((item) => item.severidade === 'IMPEDITIVO')) return 'Com pendências'
  if (pending.some((item) => item.severidade === 'AVISO')) return 'Com avisos'
  return 'Campos preenchidos'
}
function statusTone(proposal) {
  const label = statusLabel(proposal)
  return label === 'Com pendências' ? 'bg-danger-bg text-danger-dark' : label === 'Com avisos' ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-dark'
}
</script>
