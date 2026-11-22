<template>
  <section aria-labelledby="program-title" class="space-y-5 rounded-3xl border border-sage-border bg-white p-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0 flex-1"><h2 id="program-title" class="text-xl font-bold text-brand-dark">Revisão técnica do programa</h2><p class="mt-1 text-sm text-sage-muted">Este é o código completo que será executado na simulação.</p></div>
      <div class="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
        <button v-if="needsPreparation && canPrepare" type="button" class="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto" :disabled="busy || model.changed" @click="$emit('prepare')">
          <LoaderCircle v-if="busy" class="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
          <ListChecks v-else class="h-4 w-4 shrink-0" aria-hidden="true" />
          {{ busy ? 'Validando e preparando…' : 'Validar dados e preparar revisão' }}
        </button>
        <button type="button" :class="needsPreparation && canPrepare ? 'focus-ring self-center rounded px-2 py-1 text-xs font-semibold text-sage-muted underline-offset-4 hover:text-brand-dark hover:underline sm:self-end' : 'action'" :disabled="busy || model.changed" @click="$emit('refresh')">Atualizar revisão</button>
      </div>
    </div>
    <div v-if="needsPreparation" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text"><p>{{ preparationReason || 'Os campos ou as explicações da proposta precisam ser conferidos antes da aprovação técnica.' }}</p><p v-if="!canPrepare" class="mt-2 text-xs">Após a correção por negócios, use “Atualizar revisão” para buscar as regras e o código atuais.</p></div>
    <p v-if="unsaved" class="rounded-xl bg-warning-bg p-3 text-sm text-warning-text">{{ canPrepare ? 'Valide e salve as regras antes de revisar e aprovar o programa.' : 'O analista de negócios precisa validar e salvar as regras antes da revisão do programa.' }}</p>
    <p v-if="model.error" role="alert" class="rounded-xl bg-danger-bg p-3 text-sm text-danger-dark">{{ userFacingText(model.error) }}</p>
    <p v-if="model.loading" role="status">Carregando programa e histórico…</p>
    <template v-if="current">
      <div class="flex flex-wrap gap-3 text-sm"><strong>Programa {{ current.versaoPrograma }}</strong><span>Proposta {{ current.versaoCampanhaNumero }}</span><span class="rounded-full bg-sage-light px-3 py-1 font-bold">{{ status }}</span></div>
      <p v-if="current.aprovadoPor" class="text-sm text-sage-muted">Revisado por {{ current.aprovadoPor }} · {{ date(current.aprovadoEm) }}</p>
      <p v-if="current.rejeitadoPor" class="text-sm text-sage-muted">Devolvido por {{ current.rejeitadoPor }} · {{ date(current.rejeitadoEm) }}</p>
      <p v-if="current.justificativa" class="rounded-xl border border-sage-border p-3 text-sm">Parecer: {{ current.justificativa }}</p>
      <details class="rounded-xl border border-sage-border p-3"><summary class="cursor-pointer font-bold">Premissas declaradas no programa</summary><pre class="mt-3 whitespace-pre-wrap text-sm">{{ premises || 'O programa não apresenta premissas em comentários. Confira suas condições no código completo.' }}</pre></details>
      <div class="min-w-0 rounded-2xl border border-brand-dark bg-brand-dark p-4 text-brand sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3"><strong class="text-sm">Python executável</strong><button type="button" class="focus-ring inline-flex items-center gap-2 rounded-full border border-brand bg-brand px-4 py-2 text-xs font-bold text-brand-dark hover:bg-brand-hover" @click="copy">{{ copied ? 'Copiado' : 'Copiar código' }}</button></div>
        <label class="sr-only" for="campaign-executable-code">Código Python completo</label>
        <textarea id="campaign-executable-code" v-model="source" spellcheck="false" :readonly="!editable || busy || unsaved || needsPreparation" class="focus-ring mt-3 min-h-[26rem] w-full resize-y rounded-xl border border-sage-muted !bg-brand-dark-hover p-3 font-mono text-xs leading-5 !text-brand outline-none" @input="$emit('changed', source.trim() !== current.codigoFonte.trim())" />
      </div>
      <p class="break-all font-mono text-xs text-sage-muted">Assinatura: {{ current.checksumSha256 }}</p>
      <div v-if="editable" class="space-y-3">
        <label class="block text-sm font-bold" for="program-reason">Parecer / motivo da alteração ou devolução</label><textarea id="program-reason" v-model="reason" class="control min-h-20" :disabled="busy" />
        <p v-if="model.changed" class="text-sm text-warning-text">Código editado. Salvar cria uma nova revisão e invalida a aprovação e os resultados anteriores da proposta.</p>
        <div class="flex flex-wrap gap-3"><button v-if="model.changed" type="button" class="action" :disabled="busy" @click="source = current.codigoFonte; $emit('changed', false)">Descartar edição do código</button><button type="button" class="action" :disabled="busy || unsaved || needsPreparation || !model.changed || !source.trim()" @click="$emit('decide', 'save', {codigoFonte: source.trim(), justificativa: reason})">Salvar nova revisão</button><button type="button" class="action text-danger-dark" :disabled="busy || unsaved || model.changed || !reason.trim()" @click="$emit('decide', 'reject', {justificativa: reason})">Devolver com motivo</button><button type="button" class="action bg-brand" :disabled="busy || unsaved || needsPreparation || model.changed || current.validoParaExecucao" @click="$emit('decide', 'approve', {justificativa: reason})">Aprovar este programa</button></div>
      </div>
      <p v-else class="text-sm text-sage-muted">A aprovação e os ajustes do programa são responsabilidade do analista de código.</p>
      <details v-if="model.history.length" class="rounded-xl border border-sage-border p-4"><summary class="cursor-pointer font-bold">Histórico e comparação de programas</summary><label for="program-base" class="mt-4 block text-sm">Comparar com a revisão</label><select id="program-base" v-model="baseId" class="control mt-2"><option value="">Selecione uma revisão</option><option v-for="item in model.history" :key="item.id" :value="item.id">Programa {{ item.versaoPrograma }} · {{ item.statusAprovacao }}</option></select><p class="mt-3 text-xs text-sage-muted">− Código anterior · + Código atual{{ model.changed ? ' (com edições ainda não salvas)' : '' }}</p><pre v-if="base" class="mt-2 max-h-96 overflow-auto rounded-xl border border-sage-muted bg-brand-dark-hover p-4 font-mono text-xs text-brand"><span v-for="(line,index) in differences" :key="index" class="block" :class="line.type === 'added' ? 'text-green-300' : line.type === 'removed' ? 'text-red-300' : 'text-gray-300'">{{ line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' ' }} {{ line.text }}</span></pre></details>
    </template>
    <p v-else-if="!model.loading" class="text-sm text-sage-muted">Salve a proposta e carregue o programa para iniciar a revisão técnica.</p>
    <p v-if="copyError" role="alert" class="text-sm text-danger-dark">Não foi possível copiar. Selecione o código e copie manualmente.</p>
  </section>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import { ListChecks, LoaderCircle } from 'lucide-vue-next'
import { userFacingText } from '@/services/userFacingText'
import { programLineDiff } from '@/services/campaignProgramReview'
const props = defineProps({ model: { type: Object, required: true }, editable: Boolean, busy: Boolean, unsaved: Boolean, needsPreparation: Boolean, preparationReason: String, canPrepare: Boolean })
const emit = defineEmits(['refresh', 'changed', 'decide', 'prepare'])
const source = ref(''), reason = ref(''), baseId = ref(''), copied = ref(false), copyError = ref(false)
const current = computed(() => props.model.current)
watch(() => current.value, value => { source.value = value?.codigoFonte || ''; reason.value = ''; emit('changed', false) }, { immediate: true })
const status = computed(() => current.value?.validoParaExecucao ? 'Aprovado para execução' : current.value?.statusAprovacao === 'REJEITADO' ? 'Devolvido para correção' : current.value?.statusAprovacao === 'APROVADO' ? 'Aprovação desatualizada' : 'Aguardando revisão')
const premises = computed(() => source.value.split('\n').filter(line => /^\s*#/.test(line)).join('\n'))
const base = computed(() => props.model.history.find(item => item.id === baseId.value))
const differences = computed(() => programLineDiff(base.value?.codigoFonte || '', source.value))
const date = value => value ? new Date(value).toLocaleString('pt-BR') : ''
async function copy() { try { await navigator.clipboard.writeText(source.value); copied.value = true; copyError.value = false } catch { copyError.value = true } }
</script>
<style scoped>
.action { @apply rounded-full border border-sage-border px-4 py-2 text-sm font-bold transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40; }
.control { @apply w-full rounded-xl border border-sage-border bg-white p-3 text-sm text-brand-dark; }
</style>
