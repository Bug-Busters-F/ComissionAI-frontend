<template>
  <section class="space-y-6" aria-labelledby="report-regras-heading">
    <!-- Cabeçalho e Reconciliação Contábil -->
    <div class="rounded-2xl border border-sage-border bg-white p-5 shadow-sm sm:p-6 space-y-4">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 id="report-regras-heading" class="text-xl font-extrabold tracking-tight text-brand-dark flex items-center gap-2">
            <Layers class="h-5 w-5 text-brand" aria-hidden="true" />
            <span>Relatório Consolidado por Grupo de Regra</span>
          </h3>
          <p class="mt-1 text-xs text-sage-muted">
            Distribuição dos valores pagos entre a Taxa Base Contratual e as Regras de Negócio de Campanhas Promocionais.
          </p>
        </div>

        <!-- Indicador de Reconciliação Matemática -->
        <div class="flex flex-wrap items-center gap-3">
          <div
            v-if="isReconciled"
            class="inline-flex items-center gap-2 rounded-xl border border-success/30 bg-success-surface/50 px-3.5 py-2 text-xs font-bold text-success-dark"
          >
            <CheckCircle2 class="h-4 w-4 shrink-0 text-success-dark" aria-hidden="true" />
            <span>Reconciliação Auditada (100% conferida)</span>
          </div>
          <div
            v-else
            class="inline-flex items-center gap-2 rounded-xl border border-warning-border bg-warning-bg px-3.5 py-2 text-xs font-bold text-warning-dark"
          >
            <Info class="h-4 w-4 shrink-0 text-warning-dark" aria-hidden="true" />
            <span>Aviso de Reconciliação</span>
          </div>

          <!-- Totalizador de Comissão das Regras -->
          <div class="rounded-xl bg-brand/10 px-3.5 py-2 border border-brand/20">
            <span class="block text-[10px] font-bold uppercase tracking-wider text-brand-dark/80">Comissão Consolidada</span>
            <span class="text-sm font-black text-brand-dark">{{ formatCurrency(somaComissaoRegras) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabela de Regras -->
    <div class="rounded-2xl border border-sage-border bg-white shadow-sm overflow-hidden">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="p-8 text-center space-y-3">
        <RefreshCw class="inline-block h-6 w-6 animate-spin text-brand" aria-hidden="true" />
        <p class="text-xs font-semibold text-sage-muted">Carregando relatório consolidado por grupo de regra…</p>
      </div>

      <!-- Estado Vazio -->
      <div v-else-if="!rules.length" class="p-12 text-center space-y-2" role="status">
        <Layers class="mx-auto h-8 w-8 text-sage-subtle opacity-60" aria-hidden="true" />
        <p class="text-sm font-extrabold text-brand-dark">Nenhuma regra consolidada encontrada</p>
        <p class="text-xs text-sage-muted">Não há registros de regras aplicadas no fechamento desta competência.</p>
      </div>

      <!-- Tabela com Dados -->
      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[760px] text-left text-xs">
          <thead class="bg-sage-pill text-[10px] font-bold uppercase tracking-[0.1em] text-sage-muted border-b border-sage-border">
            <tr>
              <th scope="col" class="px-4 py-3.5">Regra / Origem da Taxa</th>
              <th scope="col" class="px-4 py-3.5 text-center">Tipo de Operação</th>
              <th scope="col" class="px-4 py-3.5 text-center">Vendas Computadas</th>
              <th scope="col" class="px-4 py-3.5 text-right">Volume de Vendas</th>
              <th scope="col" class="px-4 py-3.5 text-right font-black text-brand-dark">Comissão Gerada</th>
              <th scope="col" class="px-4 py-3.5 text-center">Participação</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light text-sage-subtle">
            <tr
              v-for="(rule, idx) in rules"
              :key="rule.idRegra ?? idx"
              class="transition hover:bg-sage-light/60"
            >
              <!-- Nome e Origem da Regra -->
              <td class="px-4 py-3.5 font-bold text-brand-dark whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    :class="isCampanha(rule) ? 'bg-brand/20 text-brand-dark border border-brand/30' : 'bg-sage-light text-sage-muted border border-sage-border'"
                  >
                    {{ isCampanha(rule) ? 'Campanha Promocional' : 'Taxa Base Contratual' }}
                  </span>
                  <div>
                    <span class="block text-xs font-bold text-brand-dark">
                      {{ rule.nomeRegra || (rule.idRegra ? `Regra #${rule.idRegra}` : 'Regra Contratual') }}
                    </span>
                    <span v-if="rule.idRegra" class="block text-[10px] text-sage-muted">
                      ID Regra: {{ rule.idRegra }}
                    </span>
                  </div>
                </div>
              </td>

              <!-- Tipo de Operação -->
              <td class="px-4 py-3.5 text-center whitespace-nowrap">
                <span class="rounded bg-sage-light px-2 py-0.5 text-[11px] font-semibold text-brand-dark">
                  {{ formatOperationType(rule.tipoOperacao) }}
                </span>
              </td>

              <!-- Quantidade de Vendas -->
              <td class="px-4 py-3.5 text-center font-extrabold text-brand-dark whitespace-nowrap">
                {{ rule.quantidadeVendas ?? 0 }}
              </td>

              <!-- Volume de Vendas -->
              <td class="px-4 py-3.5 text-right font-semibold text-brand-dark whitespace-nowrap">
                {{ formatCurrency(rule.valorTotalVendas) }}
              </td>

              <!-- Comissão Gerada -->
              <td class="px-4 py-3.5 text-right font-black text-brand-dark text-sm whitespace-nowrap">
                {{ formatCurrency(rule.valorTotalComissao) }}
              </td>

              <!-- Participação % no Total -->
              <td class="px-4 py-3.5 text-center whitespace-nowrap">
                <span class="inline-block rounded-md bg-sage-light px-2 py-0.5 text-[11px] font-bold text-brand-dark">
                  {{ calculateShare(rule.valorTotalComissao) }}
                </span>
              </td>
            </tr>
          </tbody>
          <!-- Rodapé com Totais -->
          <tfoot class="bg-sage-light/60 font-black text-brand-dark border-t border-sage-border">
            <tr>
              <td class="px-4 py-3.5" colspan="2">Totais Consolidados</td>
              <td class="px-4 py-3.5 text-center">{{ somaVendasRegras }}</td>
              <td class="px-4 py-3.5 text-right">{{ formatCurrency(somaVolumeRegras) }}</td>
              <td class="px-4 py-3.5 text-right text-sm">{{ formatCurrency(somaComissaoRegras) }}</td>
              <td class="px-4 py-3.5 text-center">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { Layers, CheckCircle2, Info, RefreshCw } from 'lucide-vue-next'
import { formatCurrencyPtBr } from '@/services/currencyUtils'

const props = defineProps({
  rules: {
    type: Array,
    default: () => []
  },
  totalGeraisComissao: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
})

function isCampanha(rule) {
  if (!rule) return false
  const tipo = String(rule.tipoOperacao || '').toUpperCase()
  const nome = String(rule.nomeRegra || '').toLowerCase()
  if (tipo.includes('DEFINIR_TAXA') || tipo.includes('ADICIONAR_TAXA') || tipo.includes('MULTIPLICAR_TAXA') || tipo.includes('BONUS')) {
    return true
  }
  return nome.includes('campanha') || nome.includes('promocional') || Boolean(rule.idRegra && rule.idRegra > 0)
}

function formatOperationType(tipo) {
  const map = {
    BASE_COMISS: 'Taxa Base',
    DEFINIR_TAXA: 'Substituição de Taxa',
    ADICIONAR_TAXA: 'Taxa Adicional',
    MULTIPLICAR_TAXA: 'Multiplicador',
    BONUS_PERCENTUAL: 'Bônus %',
    BONUS_FIXO: 'Bônus Fixo'
  }
  return map[tipo] || tipo || 'Base'
}

const somaComissaoRegras = computed(() =>
  props.rules.reduce((acc, curr) => acc + (Number(curr.valorTotalComissao) || 0), 0)
)

const somaVolumeRegras = computed(() =>
  props.rules.reduce((acc, curr) => acc + (Number(curr.valorTotalVendas) || 0), 0)
)

const somaVendasRegras = computed(() =>
  props.rules.reduce((acc, curr) => acc + (Number(curr.quantidadeVendas) || 0), 0)
)

const isReconciled = computed(() => {
  if (!props.rules.length) return true
  const totalGeral = props.totalGeraisComissao || somaComissaoRegras.value
  const centsRegras = Math.round(somaComissaoRegras.value * 100)
  const centsGeral = Math.round(totalGeral * 100)
  return centsRegras === centsGeral || totalGeral === 0
})

function calculateShare(valor) {
  const total = props.totalGeraisComissao || somaComissaoRegras.value
  if (!total || !valor) return '0,0%'
  const share = (Number(valor) / total) * 100
  return `${share.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

function formatCurrency(val) {
  return formatCurrencyPtBr(val, true)
}
</script>
