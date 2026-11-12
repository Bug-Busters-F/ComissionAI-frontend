<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 sm:p-6"
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-line-title"
    @keydown.esc="$emit('cancel')"
  >
    <div class="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-5 max-h-[90vh] overflow-y-auto">
      <div class="flex items-start justify-between border-b border-sage-border-light pb-4">
        <div>
          <h3 id="edit-line-title" class="text-lg font-black text-brand-dark">
            Editar Linha #{{ line?.numeroLinha }} (Versão {{ line?.versao }})
          </h3>
          <p class="text-xs text-sage-muted">
            Corrija inconsistências de dados. Ao salvar, a linha será revalidada imediatamente pelo backend.
          </p>
        </div>
        <button
          type="button"
          @click="$emit('cancel')"
          class="focus-ring rounded-lg p-1 text-sage-muted hover:text-brand-dark"
          aria-label="Fechar modal"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Alerta de Conflito de Concorrência (409 Conflict) -->
      <div v-if="conflitoConcorrencia" class="rounded-xl border border-warning-border bg-warning-bg p-4 space-y-1">
        <p class="text-xs font-extrabold text-warning-text flex items-center gap-1.5">
          <AlertTriangle class="h-4 w-4 text-warning-dark" />
          Conflito de Concorrência (409)
        </p>
        <p class="text-xs text-warning-text leading-5">
          A linha foi alterada por outro usuário ou versão no servidor. Atualizamos a versão para <strong>{{ form.versao }}</strong> preservando o que você preencheu. Revise os campos e clique em salvar novamente.
        </p>
      </div>

      <!-- Erros Atuais da Linha -->
      <div v-if="line?.erros?.length" class="rounded-xl border border-danger/30 bg-danger-bg/40 p-4 space-y-2">
        <p class="text-xs font-extrabold text-danger-dark">Inconsistências identificadas nesta linha:</p>
        <ul class="list-disc pl-4 text-xs text-danger-dark space-y-1">
          <li v-for="(err, i) in line.erros" :key="i">
            <strong>{{ err.campo }}:</strong> {{ err.mensagem }}
            <span class="ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold uppercase bg-danger text-white">
              {{ err.severidade }}
            </span>
          </li>
        </ul>
      </div>

      <!-- Formulário de Campos Editáveis -->
      <form @submit.prevent="salvar" class="space-y-4 text-xs">
        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Matrícula -->
          <div>
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Matrícula</label>
            <input
              type="text"
              v-model="form.matricula"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
              placeholder="Ex: 001234"
            />
          </div>

          <!-- Cargo -->
          <div>
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Descrição do Cargo</label>
            <input
              type="text"
              v-model="form.descrCargo"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
              placeholder="Ex: VENDEDOR"
            />
          </div>

          <!-- Loja -->
          <div>
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Código da Loja</label>
            <input
              type="number"
              v-model.number="form.codLoja"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
              placeholder="Ex: 10"
            />
          </div>

          <!-- Marca -->
          <div>
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Descrição da Marca</label>
            <input
              type="text"
              v-model="form.descrMarca"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
              placeholder="Ex: PRETO"
            />
          </div>

          <!-- Valor da Venda (Formato pt-BR) -->
          <div v-if="tipoBase !== 'HR'">
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Valor da Venda (R$)</label>
            <input
              type="text"
              v-model="form.valorVendaTexto"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
              placeholder="Ex: 1.250,00"
            />
          </div>

          <!-- Data de Referência / Venda -->
          <div>
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Data de Referência</label>
            <input
              type="date"
              v-model="form.dataReferencia"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
            />
          </div>

          <!-- Datas de RH (Admissão / Demissão) -->
          <div v-if="tipoBase === 'HR'">
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Data de Admissão</label>
            <input
              type="date"
              v-model="form.dataAdmissao"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
            />
          </div>

          <div v-if="tipoBase === 'HR'">
            <label class="block font-bold text-sage-muted uppercase tracking-wider">Data de Demissão</label>
            <input
              type="date"
              v-model="form.dataDemissao"
              class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark px-3 py-2 font-bold text-brand-dark"
            />
          </div>
        </div>

        <!-- Opção: Ignorar Linha na Efetivação -->
        <div class="rounded-xl border border-sage-border-light bg-sage-light/40 p-3.5 flex items-center justify-between">
          <div>
            <p class="font-bold text-brand-dark">Ignorar linha na efetivação</p>
            <p class="text-sage-muted">A linha não será inserida na base geral e será desconsiderada nos cálculos.</p>
          </div>
          <input
            type="checkbox"
            v-model="form.ignorarNaEfetivacao"
            class="h-4 w-4 rounded border-sage-border-dark text-brand focus:ring-brand"
          />
        </div>

        <!-- Motivo da Alteração (Obrigatório) -->
        <div>
          <label class="block font-bold text-sage-muted uppercase tracking-wider">
            Motivo da Correção <span class="text-danger">*</span>
          </label>
          <textarea
            v-model="form.motivo"
            rows="2"
            required
            class="focus-ring mt-1 block w-full rounded-xl border border-sage-border-dark p-3 font-semibold text-brand-dark"
            placeholder="Descreva a razão da correção para fins de auditoria (mínimo de 5 caracteres)..."
          ></textarea>
        </div>

        <p v-if="formErro" class="text-danger font-bold">{{ formErro }}</p>

        <!-- Botões de Ação -->
        <div class="flex items-center justify-end gap-3 pt-3 border-t border-sage-border-light">
          <button
            type="button"
            @click="$emit('cancel')"
            :disabled="salvando"
            class="focus-ring rounded-xl border border-sage-border px-4 py-2 text-xs font-bold text-sage-muted hover:text-brand-dark"
          >
            Cancelar
          </button>
          <button
            type="submit"
            :disabled="salvando || !podeSalvar"
            class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2 text-xs font-black text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCw v-if="salvando" class="h-3.5 w-3.5 animate-spin" />
            <span>{{ salvando ? 'Revalidando...' : 'Salvar e Revalidar' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { X, AlertTriangle, RefreshCw } from 'lucide-vue-next'
import { parseCurrencyPtBr, formatCurrencyPtBr } from '@/services/currencyUtils'

const props = defineProps({
  open: { type: Boolean, default: false },
  line: { type: Object, default: null },
  tipoBase: { type: String, default: 'SALES' },
  salvando: { type: Boolean, default: false }
})

const emit = defineEmits(['save', 'cancel', 'refresh-line'])

const form = ref({
  versao: 1,
  matricula: '',
  descrCargo: '',
  codCargo: null,
  codLoja: null,
  descrMarca: '',
  codMarca: null,
  valorVendaTexto: '',
  dataReferencia: '',
  dataAdmissao: '',
  dataDemissao: '',
  ignorarNaEfetivacao: false,
  motivo: ''
})

const formErro = ref('')
const conflitoConcorrencia = ref(false)

function inicializarFormulario() {
  conflitoConcorrencia.value = false
  formErro.value = ''
  if (!props.line) return

  const d = props.line.dadosInterpretados || {}
  form.value = {
    versao: props.line.versao ?? 1,
    matricula: d.matricula || '',
    descrCargo: d.descrCargo || '',
    codCargo: d.codCargo ?? null,
    codLoja: d.codLoja ?? null,
    descrMarca: d.descrMarca || '',
    codMarca: d.codMarca ?? null,
    valorVendaTexto: d.valorVenda != null ? formatCurrencyPtBr(d.valorVenda) : '',
    dataReferencia: d.dataReferencia || '',
    dataAdmissao: d.dataAdmissao || '',
    dataDemissao: d.dataDemissao || '',
    ignorarNaEfetivacao: Boolean(props.line.ignorarNaEfetivacao),
    motivo: ''
  }
}

watch(() => props.line, inicializarFormulario, { immediate: true })

const podeSalvar = computed(() => {
  return form.value.motivo.trim().length >= 5
})

function salvar() {
  if (!podeSalvar.value) {
    formErro.value = 'O motivo da correção deve conter no mínimo 5 caracteres.'
    return
  }
  formErro.value = ''

  let valorVendaFinal = null
  if (props.tipoBase !== 'HR' && form.value.valorVendaTexto) {
    valorVendaFinal = parseCurrencyPtBr(form.value.valorVendaTexto)
  }

  const payload = {
    versao: form.value.versao,
    motivo: form.value.motivo.trim(),
    ignorarNaEfetivacao: form.value.ignorarNaEfetivacao,
    matricula: form.value.matricula || null,
    descrCargo: form.value.descrCargo || null,
    codCargo: form.value.codCargo,
    descrLoja: form.value.descrLoja || null,
    codLoja: form.value.codLoja,
    descrMarca: form.value.descrMarca || null,
    codMarca: form.value.codMarca,
    valorVenda: valorVendaFinal,
    dataReferencia: form.value.dataReferencia || null,
    dataAdmissao: form.value.dataAdmissao || null,
    dataDemissao: form.value.dataDemissao || null
  }

  emit('save', { numeroLinha: props.line.numeroLinha, payload })
}

function registrarConflito(novaVersao) {
  conflitoConcorrencia.value = true
  if (novaVersao) {
    form.value.versao = novaVersao
  }
}

defineExpose({ registrarConflito })
</script>
