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
    <article v-for="(proposal, index) in campaign.propostas" :key="proposal.clientId" class="rounded-[22px] bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 class="text-lg font-extrabold text-brand-dark">Regra {{ index + 1 }}</h3>
          <p class="mt-1 text-sm leading-5 text-sage-muted">{{ proposal.textoOrigem || 'Regra configurada nesta campanha.' }}</p>
        </div>
        <span class="rounded-full px-3 py-1 text-xs font-bold" :class="statusTone(proposal)">{{ statusLabel(proposal) }}</span>
      </div>
      <dl class="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <div v-for="item in summaryFields(proposal)" :key="item.label">
          <dt class="text-xs font-bold text-sage-muted">{{ item.label }}</dt>
          <dd class="mt-1 break-words text-sm font-semibold text-brand-dark">{{ item.value }}</dd>
        </div>
        <div><dt class="text-xs font-bold text-sage-muted">Taxa final</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ proposal.campos.taxaPercentual ? proposal.campos.taxaPercentual + '%' : 'Pendente' }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs font-bold text-sage-muted">Faixa por valor da venda</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ rangeText(proposal.campos) }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-xs font-bold text-sage-muted">Vigência</dt><dd class="mt-1 text-sm font-semibold text-brand-dark">{{ formatCampaignValidity(campaign, true) }}</dd></div>
      </dl>
      <ul v-if="validation.byProposal[proposal.clientId]?.length" class="mt-4 space-y-2">
        <li v-for="item in validation.byProposal[proposal.clientId]" :key="item.id" class="rounded-xl px-3 py-2 text-sm" :class="item.severidade === 'IMPEDITIVO' ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'">
          {{ item.severidade === 'IMPEDITIVO' ? 'Impeditiva:' : 'Aviso:' }} {{ item.mensagem }}
        </li>
      </ul>
    </article>
  </section>
</template>

<script setup>
import { parseDecimalToMinor } from '@/services/campaignProposalValidation'
import { formatCampaignValidity } from '@/services/campaignProposalFormatting'

const props = defineProps({
  campaign: { type: Object, required: true },
  validation: { type: Object, required: true }
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
  const min = fields.valorMinimo ? (fields.minimoInclusivo ? 'a partir de ' : 'acima de ') + formatMoney(fields.valorMinimo) : ''
  const max = fields.valorMaximo ? (fields.maximoInclusivo ? 'até ' : 'abaixo de ') + formatMoney(fields.valorMaximo) : ''
  if (!min && !max) return 'Sem restrição por valor da venda'
  return [min, max].filter(Boolean).join(' e ')
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
