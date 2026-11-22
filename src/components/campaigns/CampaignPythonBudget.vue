<template>
  <section class="space-y-4 rounded-3xl border border-sage-border bg-white p-6" aria-labelledby="budget-title">
    <h2 id="budget-title" class="text-xl font-bold">Orçamento e execução aprovada</h2>
    <p class="text-sm text-sage-muted">Confirme o teto de comissão projetada para comparar os quatro cenários.</p>
    <p v-if="campaign.orcamentoExtraidoIa != null" class="text-sm">Valor identificado no texto: <strong>{{ money(campaign.orcamentoExtraidoIa) }}</strong>. Confira antes de confirmar.</p>
    <div class="flex flex-wrap items-end gap-3"><div class="min-w-56 flex-1"><label for="python-budget" class="mb-2 block text-sm font-bold">Orçamento total (R$)</label><input id="python-budget" v-model="amount" inputmode="decimal" placeholder="Ex.: 100000,00" class="w-full rounded-xl border border-sage-border bg-white p-3 text-brand-dark" :readonly="!editable || busy" /></div><button v-if="editable" type="button" class="action bg-brand" :disabled="busy || unsaved || !amount || confirmed" @click="$emit('confirm-budget', amount)">{{ confirmed ? 'Orçamento confirmado' : 'Confirmar orçamento' }}</button></div>
    <p v-if="!confirmed" class="text-sm text-warning-text">É necessário confirmar o orçamento antes de executar a simulação.</p>
    <p class="text-sm">{{ approved ? 'Programa aprovado para execução.' : 'O programa precisa ser aprovado na revisão técnica antes da simulação.' }}</p>
    <p v-if="simulation.isRunning" role="status" class="text-sm">Executando o programa aprovado e verificando alternativas. Aguarde; a duração depende do volume de vendas.</p>
    <template v-if="result">
      <p v-if="!result.executadoViaPython" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">Este resultado foi produzido pelo fluxo anterior. Execute uma nova simulação para usar o programa aprovado e consultar alternativas.</p>
      <div v-else class="space-y-4">
        <p class="text-sm">Resultado do programa {{ result.versaoProgramaPython }} · {{ analysis ? 'Orçamento utilizado: ' + money(analysis.orcamento) : 'Análise de alternativas indisponível para este resultado.' }}</p>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><article v-for="key in ['80','100','120','150']" :key="key" class="rounded-2xl border border-sage-border p-4"><h3 class="font-bold">Cenário {{ key }}%</h3><p class="mt-3 text-xl font-bold">{{ money(result['cenario'+key]?.comissaoProjetada) }}</p><p class="mt-2 text-sm" :class="enrollment(key)?.dentroDoOrcamento === false ? 'text-danger-dark' : 'text-sage-muted'">{{ enrollment(key)?.dentroDoOrcamento === true ? 'Dentro do orçamento' : enrollment(key)?.dentroDoOrcamento === false ? 'Acima do orçamento' : 'Enquadramento não informado' }}</p><p v-if="enrollment(key)?.excedenteOrcamento > 0" class="text-sm">Excedente: {{ money(enrollment(key).excedenteOrcamento) }}</p></article></div>
        <h3 class="font-bold">Alternativas por cenário</h3><p class="text-sm text-sage-muted">Cada alternativa é independente. Aplicar uma delas altera a proposta e exige nova revisão técnica e simulação.</p>
        <p v-if="analysis?.motivo" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">{{ userFacingText(analysis.motivo) }}</p>
        <p v-if="!analysis?.calibracoes?.length" class="text-sm text-sage-muted">Não há alternativas disponíveis nesta execução.</p>
        <article v-for="item in analysis?.calibracoes || []" :key="item.cenario" class="space-y-3 rounded-2xl border border-sage-border p-4"><div class="flex flex-wrap justify-between gap-3"><h4 class="font-bold">{{ item.cenario }} · {{ labels[item.status] || 'Alternativa indisponível' }}</h4><button v-if="editable && item.status === 'ENQUADRADA'" type="button" class="action" :disabled="busy || !approved || unsaved" @click="selected = item">Revisar e aplicar alternativa</button></div><p v-if="item.motivo" class="text-sm">{{ userFacingText(item.motivo) }}</p><template v-if="item.status === 'ENQUADRADA'"><p class="text-sm">Custo original: {{ money(item.custoProjetadoOriginal) }} → Custo recalculado: <strong>{{ money(item.custoProjetadoRecalculado) }}</strong> · Folga: {{ money(item.folga) }}</p><ul class="space-y-1 text-sm"><li v-for="(change,index) in item.alteracoes" :key="index">{{ ruleName(change.regraId) }} · {{ fieldName(change.campo) }}: {{ value(change.antes, change.campo) }} → {{ value(change.depois, change.campo) }}</li></ul></template></article>
        <details v-if="analysis?.explicacoes?.length" class="rounded-xl border border-sage-border p-4"><summary class="cursor-pointer font-bold">Explicações e limitações dos cenários</summary><div v-for="item in analysis.explicacoes" :key="item.cenario" class="mt-4 text-sm"><strong>{{ item.cenario }}</strong><p>{{ item.resumo }}</p><ul><li v-for="limitation in item.limitacoes" :key="limitation">{{ limitation }}</li></ul></div></details>
      </div>
    </template>
    <CampaignLifecycleDialog :open="Boolean(selected)" title="Aplicar alternativa à proposta?" confirm-label="Aplicar e voltar à revisão técnica" :busy="busy" @cancel="selected = null" @confirm="$emit('apply-calibration', selected.cenario)"><p>Você está aplicando somente a alternativa de {{ selected?.cenario }}. As regras da proposta serão atualizadas; a campanha publicada será preservada.</p><p class="mt-3">A aprovação técnica e a simulação atuais deixarão de valer. Será necessário revisar o novo programa e simular novamente.</p><p v-if="simulation.error" role="alert" class="mt-3 text-danger-dark">{{ userFacingText(simulation.error) }}</p></CampaignLifecycleDialog>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import CampaignLifecycleDialog from './CampaignLifecycleDialog.vue'
import { userFacingText } from '@/services/userFacingText'
import { decimalFractionToPercent } from '@/services/campaignProposalValidation'
const props = defineProps({ campaign: Object, persistence: Object, simulation: Object, editable: Boolean, approved: Boolean, busy: Boolean, unsaved: Boolean })
defineEmits(['confirm-budget', 'apply-calibration'])
const amount = ref(''), selected = ref(null)
watch(() => props.persistence.orcamento, val => { amount.value = val == null ? '' : String(val).replace('.', ',') }, { immediate: true })
watch(() => props.simulation.result?.id, () => { selected.value = null })
const confirmed = computed(() => props.persistence.orcamentoConfirmado && Number(amount.value.replace(',', '.')) === Number(props.persistence.orcamento))
const result = computed(() => props.simulation.result), analysis = computed(() => result.value?.analise)
const enrollment = key => result.value?.['cenario'+key]?.enquadramento
const labels = { NAO_NECESSARIA: 'Ajuste não necessário', ENQUADRADA: 'Alternativa dentro do orçamento', SEM_SOLUCAO_VIAVEL: 'Sem solução viável', FALHA: 'Não foi possível verificar a alternativa' }
const money = val => val == null ? 'Não informado' : Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fieldName = field => ({ taxa: 'Taxa final', 'bonus.percentual': 'Bônus percentual', 'bonus.valorFixo': 'Bônus fixo' }[field] || field)
const value = (val, field) => field === 'bonus.valorFixo' ? money(val) : decimalFractionToPercent(val).replace('.', ',') + '%'
const ruleName = id => { const index = props.campaign.propostas.findIndex(p => String(p.serverId) === String(id)); return index < 0 ? 'Regra ' + id : 'Regra ' + (index + 1) }
</script>
<style scoped>.action { @apply rounded-full border border-sage-border px-4 py-3 text-sm font-bold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40; }</style>
