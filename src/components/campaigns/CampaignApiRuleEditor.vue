<template>
  <div :aria-busy="busyHere" class="space-y-3">
    <CampaignRequestStatus v-if="busyHere" :message="integration.state.kind === 'rule' ? 'Interpretando somente este bloco…' : 'Validando campos e atualizando explicação…'" @cancel="integration.cancel" />
    <fieldset :disabled="busyHere" class="min-w-0">
      <CampaignProposalCard :proposal="proposal" :campaign="campaign" :index="index" :pendencias="pendencias" @update-proposal="(...args) => $emit('update-proposal', ...args)" @set-all-sales="(...args) => $emit('set-all-sales', ...args)" @request-remove="$emit('request-remove', $event)">
        <template #rule-text>
          <section class="mt-4 rounded-xl border border-sage-border bg-sage-light p-4" :aria-labelledby="textId + '-heading'">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <h4 :id="textId + '-heading'" class="text-xs font-bold text-sage-muted">Texto da regra {{ index + 1 }}</h4>
                <p v-if="!editing" class="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-brand-dark">{{ proposal.textoOrigem || 'Informe o texto deste bloco para interpretá-lo.' }}</p>
              </div>
              <button v-if="!editing" ref="editButton" type="button" class="focus-ring shrink-0 rounded-full p-2 text-brand-dark transition-colors hover:bg-white disabled:opacity-50" :aria-label="'Editar texto da regra ' + (index + 1)" :disabled="integration.state.busy || Boolean(integration.state.review)" @click="start"><Pencil :size="18" aria-hidden="true" /></button>
            </div>
            <template v-if="editing">
              <label :for="textId" class="sr-only">Texto da regra {{ index + 1 }}</label>
              <textarea :id="textId" ref="textInput" v-model="integration.state.text" rows="3" class="focus-ring mt-3 w-full rounded-xl border border-sage-border bg-white p-3 text-sm" />
              <div class="mt-3 flex flex-wrap gap-3">
                <button type="button" class="focus-ring rounded-full bg-brand px-4 py-2 text-sm font-bold disabled:opacity-50" :disabled="!integration.state.text.trim() || integration.state.busy || Boolean(integration.state.review)" @click="integration.reinterpretRule(proposal.clientId)">Reinterpretar</button>
                <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-sm font-bold" @click="close">Cancelar</button>
              </div>
            </template>
          </section>
        </template>
      </CampaignProposalCard>
    </fieldset>
    <p v-if="integration.state.errors[proposal.clientId]" class="rounded-xl bg-danger-bg p-3 text-sm text-danger-dark" role="alert">{{ integration.state.errors[proposal.clientId] }}</p>
  </div>
</template>
<script setup>
import { computed, nextTick, ref } from 'vue'
import { Pencil } from 'lucide-vue-next'
import CampaignProposalCard from './CampaignProposalCard.vue'
import CampaignRequestStatus from './CampaignRequestStatus.vue'
const props = defineProps({ proposal: { type: Object, required: true }, campaign: { type: Object, required: true }, integration: { type: Object, required: true }, index: Number, pendencias: { type: Array, default: () => [] } })
defineEmits(['update-proposal', 'set-all-sales', 'request-remove'])
const textId = 'api-rule-text-' + encodeURIComponent(props.proposal.clientId)
const textInput = ref(null)
const editButton = ref(null)
const editing = computed(() => props.integration.state.editorId === props.proposal.clientId)
const busyHere = computed(() => props.integration.state.busy && props.integration.state.targetId === props.proposal.clientId)
async function start() { if (props.integration.openEditor(props.proposal.clientId)) { await nextTick(); textInput.value?.focus() } }
async function close() { props.integration.closeEditor(); await nextTick(); editButton.value?.focus() }
</script>
