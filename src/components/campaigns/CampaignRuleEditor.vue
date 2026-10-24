<template>
  <div class="relative rounded-[22px]" :aria-busy="state.loading">
    <fieldset class="min-w-0 space-y-3" :disabled="state.loading" :class="{ 'opacity-50': state.loading }">
      <CampaignProposalCard :proposal="proposal" :campaign="campaign" :index="index" :pendencias="pendencias" @update-proposal="(...args) => $emit('update-proposal', ...args)" @set-all-sales="(...args) => $emit('set-all-sales', ...args)" @request-remove="$emit('request-remove', $event)">
        <template #rule-text>
          <section v-if="proposal.origem !== 'manual'" class="mt-4 rounded-xl border border-sage-border bg-sage-light p-4" :aria-labelledby="summaryId">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h3 :id="summaryId" class="text-xs font-bold text-sage-muted">Texto da regra {{ index + 1 }}</h3>
                <p v-if="!state.editing" class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-brand-dark">{{ proposal.resumo || proposal.textoOrigem || 'Resumo não recebido para esta regra.' }}</p>
              </div>
              <button v-if="!state.editing" ref="editButton" type="button" class="focus-ring rounded-full p-2 text-brand-dark hover:bg-white" :aria-label="'Editar texto da regra ' + (index + 1)" @click="start"><Pencil :size="18" /></button>
            </div>
            <template v-if="state.editing">
              <label :for="summaryId + '-input'" class="sr-only">Texto da regra {{ index + 1 }}</label>
              <textarea :id="summaryId + '-input'" ref="textInput" v-model="state.text" rows="3" class="focus-ring mt-3 w-full rounded-xl border border-sage-border bg-white p-3 text-sm" />
              <div v-if="provider.mode === 'demo'" class="mt-3">
                <label :for="summaryId + '-scenario'" class="text-xs font-bold text-warning-text">Demonstração — resposta fictícia</label>
                <select :id="summaryId + '-scenario'" v-model="state.scenario" class="focus-ring ml-2 rounded-lg border border-sage-border bg-white p-2 text-xs">
                  <option value="texto">Taxa, marca ou loja do texto</option><option value="novoFiltro">Novo preenchimento: loja 75</option>
                  <option value="falha">Falha de interpretação</option><option value="multiplas">Resposta com várias regras</option><option value="vazio">Resposta sem regras</option>
                </select>
              </div>
              <p v-if="state.error && !state.reviewing" class="mt-3 text-sm text-danger-dark" role="alert">{{ state.error }}</p>
              <div class="mt-3 flex gap-3">
                <button type="button" class="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold disabled:opacity-50" :disabled="!state.text.trim()" @click="session.interpret">Reinterpretar</button>
                <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-sm font-bold" @click="cancel">Cancelar</button>
              </div>
            </template>
          </section>
        </template>
      </CampaignProposalCard>
    </fieldset>
    <div v-if="state.loading" class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-[22px] bg-white/80 p-5">
      <CampaignRequestStatus class="w-full max-w-lg" :message="'Reinterpretando regra ' + (index + 1) + '…'" @cancel="cancel" />
    </div>
    <CampaignRuleReviewDialog :open="state.reviewing" :state="state" :index="index" :client-id="proposal.clientId" :demo="provider.mode === 'demo'" :can-apply="session.canApply()" :stale="state.reviewing && !session.isCurrent()" @cancel="cancel" @closed="restoreEditorFocus" @text="state.text = $event" @reinterpret="session.interpret" @correct="session.correct" @confirm="confirm" />
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { Pencil } from 'lucide-vue-next'
import CampaignProposalCard from './CampaignProposalCard.vue'
import CampaignRequestStatus from './CampaignRequestStatus.vue'
import CampaignRuleReviewDialog from './CampaignRuleReviewDialog.vue'
import { createRuleReinterpretationSession } from '@/services/ruleReinterpretation'

const props = defineProps({ proposal: { type: Object, required: true }, campaign: { type: Object, required: true }, provider: { type: Object, required: true }, index: Number, pendencias: { type: Array, default: () => [] } })
const emit = defineEmits(['update-proposal', 'set-all-sales', 'request-remove', 'apply-reinterpretation'])
const state = reactive({ editing: false, reviewing: false, loading: false, text: '', error: '', result: null, scenario: 'texto', proposed: {}, corrected: [], original: null, sentText: '' })
const summaryId = 'rule-summary-' + encodeURIComponent(props.proposal.clientId)
const editButton = ref(null)
const textInput = ref(null)
const session = createRuleReinterpretationSession({
  state, provider: props.provider, getProposal: () => props.proposal,
  getContext: () => ({ titulo: props.campaign.titulo, descricao: props.campaign.textoOriginal, dataInicio: props.campaign.dataInicio, dataFim: props.campaign.dataFim }),
  onApply: (proposal) => emit('apply-reinterpretation', proposal)
})
async function start() { session.start(); await nextTick(); textInput.value?.focus() }
async function cancel() { session.cancel(); await nextTick(); editButton.value?.focus() }
async function confirm() { if (session.apply()) { await nextTick(); editButton.value?.focus() } }
async function restoreEditorFocus() { await nextTick(); editButton.value?.focus() }
watch(() => state.loading, async (loading) => {
  if (!loading && state.editing && !state.reviewing) { await nextTick(); textInput.value?.focus() }
})
watch(() => props.proposal, () => session.cancel())
onBeforeUnmount(session.cancel)
</script>
