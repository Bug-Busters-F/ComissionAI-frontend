<template>
  <div class="space-y-6">
    <!-- BANNER DE STATUS DO PROCESSAMENTO -->

    <!-- Caso 1: Rejeição Integral por Falha Impeditiva ou Bloqueio -->
    <div
      v-if="temErroImpeditivo"
      class="rounded-2xl border border-[#d03238] bg-[#fce8e8] p-5 text-[#0e0f0c] sm:p-6"
      role="alert"
    >
      <div class="flex items-start gap-4">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#d03238] text-white">
          <AlertCircle class="h-6 w-6" />
        </div>
        <div class="flex-1">
          <!-- Frase mandatória estrita do projeto -->
          <h3 class="text-lg font-extrabold tracking-[-0.03em] text-[#a7000d]">
            Planilha com pendências: corrija e envie novamente
          </h3>
          <p class="mt-1 text-sm leading-6 text-[#454745]">
            <template v-if="report.isCiclo">
              O ciclo da competência <strong>{{ report.competencia }}</strong> foi <strong>integralmente rejeitado</strong> devido a inconsistências impeditivas em RH, Vendas ou violação de integridade relacional entre as bases. Nenhuma linha foi gravada no banco de dados.
            </template>
            <template v-else>
              A carga foi <strong>integralmente rejeitada</strong> devido a apontamentos impeditivos ou violação de regras de integridade (como duplicidade ou sobreposição). Nenhuma linha foi gravada no banco de dados.
            </template>
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#a72027]">
            <span>Status da API: REJEITADO</span>
            <span>•</span>
            <span>Importação parcial ou forçada não permitida</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Caso 2: Processado com Avisos Não Impeditivos -->
    <div
      v-else-if="report.status === 'PROCESSADO_COM_AVISOS'"
      class="rounded-2xl border border-[#ffd11a] bg-[#fff7d9] p-5 text-[#0e0f0c] sm:p-6"
      role="alert"
    >
      <div class="flex items-start gap-4">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ffd11a] text-[#4a3b1c]">
          <AlertTriangle class="h-6 w-6" />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-extrabold tracking-[-0.03em] text-[#4a3b1c]">
            Planilha com avisos não impeditivos
          </h3>
          <p class="mt-1 text-sm leading-6 text-[#646862]">
            Foram identificadas inconsistências leves que não impedem a importação. Você pode concluir e fechar o ciclo agora ou reenviar uma versão corrigida.
          </p>
        </div>
      </div>
    </div>

    <!-- Caso 3: Sucesso Total -->
    <div
      v-else
      class="rounded-2xl border border-[#2ead4b] bg-[#e3f6d8] p-5 text-[#0e0f0c] sm:p-6"
      role="alert"
    >
      <div class="flex items-start gap-4">
        <div class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#2ead4b] text-white">
          <CheckCircle2 class="h-6 w-6" />
        </div>
        <div class="flex-1">
          <h3 class="text-lg font-extrabold tracking-[-0.03em] text-[#054d28]">
            {{ report.isCiclo ? 'Ciclo validado e fechado com sucesso' : 'Carga validada e efetivada com sucesso' }}
          </h3>
          <p class="mt-1 text-sm leading-6 text-[#054d28]">
            <template v-if="report.isCiclo">
              As bases de <strong>RH e Vendas</strong> foram devidamente cruzadas e validadas. A competência <strong>{{ report.competencia }}</strong> está pronta para apuração e simulação de comissões.
            </template>
            <template v-else>
              Todos os registros foram validados pelo Spring Boot e integrados à base de dados.
            </template>
          </p>
        </div>
      </div>
    </div>

    <!-- RESUMO NUMÉRICO DA VALIDAÇÃO -->
    <div v-if="report.isCiclo" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-[#e4e8e2] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Base de RH</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#0e0f0c]">
          {{ report.rh?.linhasValidas || 0 }} <span class="text-xs font-normal text-[#646862]">/ {{ report.rh?.totalLinhas || 0 }}</span>
        </p>
        <p class="mt-0.5 text-[11px] font-semibold text-[#2ead4b]">Colaboradores válidos</p>
      </div>

      <div class="rounded-xl border border-[#e4e8e2] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Base de Vendas</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#0e0f0c]">
          {{ report.vendas?.linhasValidas || 0 }} <span class="text-xs font-normal text-[#646862]">/ {{ report.vendas?.totalLinhas || 0 }}</span>
        </p>
        <p class="mt-0.5 text-[11px] font-semibold text-[#2ead4b]">Vendas válidas</p>
      </div>

      <div
        class="rounded-xl border p-4"
        :class="totalImpeditivos > 0 ? 'border-[#d03238] bg-[#fce8e8]/50' : 'border-[#e4e8e2] bg-white'"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Impeditivos</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em]" :class="totalImpeditivos > 0 ? 'text-[#d03238]' : 'text-[#0e0f0c]'">
          {{ totalImpeditivos }}
        </p>
        <p class="mt-0.5 text-[11px] font-semibold text-[#646862]">Bloqueios no ciclo</p>
      </div>

      <div class="rounded-xl border border-[#e4e8e2] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Avisos</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em]" :class="totalAvisos > 0 ? 'text-[#b86700]' : 'text-[#0e0f0c]'">
          {{ totalAvisos }}
        </p>
        <p class="mt-0.5 text-[11px] font-semibold text-[#646862]">Alertas leves</p>
      </div>
    </div>

    <!-- RESUMO PADRÃO (BASE AVULSA / COMISS) -->
    <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-xl border border-[#e4e8e2] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Total de linhas</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#0e0f0c]">{{ report.totalLinhas }}</p>
      </div>

      <div class="rounded-xl border border-[#e4e8e2] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Linhas válidas</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em] text-[#2ead4b]">{{ report.linhasValidas }}</p>
      </div>

      <div
        class="rounded-xl border p-4"
        :class="totalImpeditivos > 0 ? 'border-[#d03238] bg-[#fce8e8]/50' : 'border-[#e4e8e2] bg-white'"
      >
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Impeditivos</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em]" :class="totalImpeditivos > 0 ? 'text-[#d03238]' : 'text-[#0e0f0c]'">
          {{ totalImpeditivos }}
        </p>
      </div>

      <div class="rounded-xl border border-[#e4e8e2] bg-white p-4">
        <p class="text-xs font-semibold uppercase tracking-wider text-[#646862]">Avisos</p>
        <p class="mt-2 text-2xl font-extrabold tracking-[-0.04em]" :class="totalAvisos > 0 ? 'text-[#b86700]' : 'text-[#0e0f0c]'">
          {{ totalAvisos }}
        </p>
      </div>
    </div>

    <!-- RELATÓRIO DE INCONSISTÊNCIAS TABULAR -->
    <div class="rounded-xl border border-[#e4e8e2] bg-white p-5 sm:p-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 class="text-base font-extrabold tracking-[-0.02em] text-[#0e0f0c]">
            Relatório de inconsistências detalhado
          </h4>
          <p class="text-xs text-[#646862]">
            <template v-if="report.isCiclo">
              Ciclo Mensal: RH & Vendas • Competência {{ report.competencia }}
            </template>
            <template v-else>
              Arquivo: {{ report.nomeArquivo }} • Base: {{ report.tipoBase }}
            </template>
          </p>
        </div>

        <!-- Filtros Rápidos -->
        <div class="flex items-center gap-1 rounded-full bg-[#eef1ec] p-1 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            @click="filtroAtual = 'TODOS'"
            :class="[
              'whitespace-nowrap rounded-full px-3 py-1.5 transition',
              filtroAtual === 'TODOS' ? 'bg-white text-[#0e0f0c] shadow-sm' : 'text-[#646862] hover:text-[#0e0f0c]'
            ]"
          >
            Todas ({{ listaInconsistencias.length }})
          </button>
          <button
            type="button"
            @click="filtroAtual = 'IMPEDITIVO'"
            :class="[
              'whitespace-nowrap rounded-full px-3 py-1.5 transition',
              filtroAtual === 'IMPEDITIVO' ? 'bg-[#d03238] text-white shadow-sm' : 'text-[#646862] hover:text-[#0e0f0c]'
            ]"
          >
            Impeditivos ({{ totalImpeditivos }})
          </button>
          <button
            type="button"
            @click="filtroAtual = 'AVISO'"
            :class="[
              'whitespace-nowrap rounded-full px-3 py-1.5 transition',
              filtroAtual === 'AVISO' ? 'bg-[#ffd11a] text-[#4a3b1c] shadow-sm' : 'text-[#646862] hover:text-[#0e0f0c]'
            ]"
          >
            Avisos ({{ totalAvisos }})
          </button>
          <button
            v-if="totalCruzamento > 0"
            type="button"
            @click="filtroAtual = 'CRUZAMENTO'"
            :class="[
              'whitespace-nowrap rounded-full px-3 py-1.5 transition',
              filtroAtual === 'CRUZAMENTO' ? 'bg-[#0e0f0c] text-white shadow-sm' : 'text-[#646862] hover:text-[#0e0f0c]'
            ]"
          >
            Cruzamento ({{ totalCruzamento }})
          </button>
        </div>
      </div>

      <!-- Tabela -->
      <div class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[620px] text-left text-sm" v-if="inconsistenciasFiltradas.length > 0">
          <thead class="bg-[#eef1ec] text-[10px] uppercase tracking-[0.12em] text-[#646862]">
            <tr>
              <th v-if="report.isCiclo" class="rounded-l-lg px-4 py-3 font-semibold">Origem</th>
              <th :class="[!report.isCiclo ? 'rounded-l-lg' : '', 'px-4 py-3 font-semibold']">Linha</th>
              <th class="px-4 py-3 font-semibold">Campo / Coluna</th>
              <th class="px-4 py-3 font-semibold">Motivo do apontamento</th>
              <th class="rounded-r-lg px-4 py-3 font-semibold text-right">Severidade</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#edf0eb]">
            <tr
              v-for="(item, idx) in inconsistenciasFiltradas"
              :key="idx"
              :class="item.severidade === 'IMPEDITIVO' ? 'bg-[#fffbfb]' : ''"
            >
              <!-- Coluna Origem para Ciclos -->
              <td v-if="report.isCiclo" class="px-4 py-3">
                <span
                  v-if="item.base === 'CRUZAMENTO'"
                  class="inline-flex items-center rounded-md bg-[#0e0f0c] px-2 py-0.5 text-[11px] font-bold text-white"
                >
                  RH ↔ Vendas
                </span>
                <span
                  v-else-if="item.base === 'RH'"
                  class="inline-flex items-center rounded-md bg-[#eef1ec] px-2 py-0.5 text-[11px] font-bold text-[#0e0f0c]"
                >
                  RH
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-md bg-[#eef8e6] px-2 py-0.5 text-[11px] font-bold text-[#1e6e2f]"
                >
                  Vendas
                </span>
              </td>

              <td class="px-4 py-3 font-mono text-xs font-bold text-[#0e0f0c]">
                Linha {{ item.linha }}
              </td>
              <td class="px-4 py-3 font-semibold text-[#0e0f0c]">
                <code class="rounded bg-[#edf0eb] px-1.5 py-0.5 text-xs text-[#0e0f0c]">{{ item.campo || 'Geral' }}</code>
              </td>
              <td class="px-4 py-3 text-sm text-[#454745]">
                {{ item.motivo }}
              </td>
              <td class="px-4 py-3 text-right">
                <StatusBadge
                  :label="item.severidade"
                  :tone="item.severidade === 'IMPEDITIVO' ? 'danger' : 'warning'"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Estado vazio da tabela -->
        <div v-else class="py-8 text-center text-sm text-[#646862]">
          <CheckCircle2 class="mx-auto h-8 w-8 text-[#2ead4b] opacity-70" />
          <p class="mt-2 font-medium">Nenhuma inconsistência encontrada para este filtro.</p>
        </div>
      </div>
    </div>

    <!-- AÇÕES INFERIORES -->
    <div class="flex flex-col-reverse items-center justify-end gap-3 sm:flex-row">
      <!-- Se houver erro impeditivo: OBRIGATORIAMENTE NÃO oferecer importação forçada/parcial -->
      <template v-if="temErroImpeditivo">
        <button
          type="button"
          @click="$emit('reenviar')"
          class="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#0e0f0c] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#252824] sm:w-auto"
        >
          <RefreshCw class="h-4 w-4" />
          <span>{{ report.isCiclo ? 'Substituir planilhas e reenviar ciclo' : 'Substituir e reenviar planilha' }}</span>
        </button>
      </template>

      <!-- Se houver apenas avisos ou sucesso total: permite concluir -->
      <template v-else>
        <button
          type="button"
          @click="$emit('reenviar')"
          class="focus-ring w-full rounded-full border border-[#d7dcd5] bg-white px-5 py-3 text-sm font-semibold text-[#0e0f0c] transition hover:bg-[#f1f4ef] sm:w-auto"
        >
          Enviar novamente
        </button>
        <button
          type="button"
          @click="$emit('concluir')"
          class="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-[#9fe870] px-6 py-3 text-sm font-bold text-[#0e0f0c] transition hover:bg-[#8fe25f] sm:w-auto"
        >
          <CheckCircle2 class="h-4 w-4" />
          <span>{{ report.isCiclo ? 'Concluir e fechar ciclo' : 'Concluir importação' }}</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-vue-next'
import StatusBadge from '@/components/common/StatusBadge.vue'

const props = defineProps({
  report: {
    type: Object,
    required: true
  }
})

defineEmits(['reenviar', 'concluir'])

const filtroAtual = ref('TODOS')

const listaInconsistencias = computed(() => {
  return props.report?.inconsistencias || []
})

const temErroImpeditivo = computed(() => {
  return (
    props.report.rejeicaoIntegral === true ||
    props.report.status === 'REJEITADO' ||
    listaInconsistencias.value.some((i) => i.severidade === 'IMPEDITIVO')
  )
})

const totalImpeditivos = computed(() => {
  return listaInconsistencias.value.filter((i) => i.severidade === 'IMPEDITIVO').length
})

const totalAvisos = computed(() => {
  return listaInconsistencias.value.filter((i) => i.severidade === 'AVISO').length
})

const totalCruzamento = computed(() => {
  return listaInconsistencias.value.filter((i) => i.base === 'CRUZAMENTO').length
})

const inconsistenciasFiltradas = computed(() => {
  if (filtroAtual.value === 'IMPEDITIVO') {
    return listaInconsistencias.value.filter((i) => i.severidade === 'IMPEDITIVO')
  }
  if (filtroAtual.value === 'AVISO') {
    return listaInconsistencias.value.filter((i) => i.severidade === 'AVISO')
  }
  if (filtroAtual.value === 'CRUZAMENTO') {
    return listaInconsistencias.value.filter((i) => i.base === 'CRUZAMENTO')
  }
  return listaInconsistencias.value
})
</script>
