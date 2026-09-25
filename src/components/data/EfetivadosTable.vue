<template>
  <div class="space-y-4">
    <!-- Cabeçalho e Seleção de Base -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <!-- Seletor de Base (Abas estilizadas Wise) -->
      <div class="flex items-center gap-1.5 rounded-2xl bg-sage-light p-1.5 w-fit">
        <button
          type="button"
          @click="store.mudarTipoBaseEfetivados('RH')"
          :class="[
            'focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition',
            store.dadosEfetivados.tipoBaseAtiva === 'RH'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'text-sage-muted hover:text-brand-dark'
          ]"
        >
          <Users class="h-3.5 w-3.5" />
          <span>RH (Matrículas)</span>
          <span
            v-if="store.dadosEfetivados.tipoBaseAtiva === 'RH' && store.dadosEfetivados.totalElements"
            class="rounded-full bg-sage-pill px-2 py-0.5 text-[10px] font-bold text-brand-dark"
          >
            {{ store.dadosEfetivados.totalElements }}
          </span>
        </button>

        <button
          type="button"
          @click="store.mudarTipoBaseEfetivados('VENDAS')"
          :class="[
            'focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition',
            store.dadosEfetivados.tipoBaseAtiva === 'VENDAS'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'text-sage-muted hover:text-brand-dark'
          ]"
        >
          <TrendingUp class="h-3.5 w-3.5" />
          <span>Vendas</span>
          <span
            v-if="store.dadosEfetivados.tipoBaseAtiva === 'VENDAS' && store.dadosEfetivados.totalElements"
            class="rounded-full bg-sage-pill px-2 py-0.5 text-[10px] font-bold text-brand-dark"
          >
            {{ store.dadosEfetivados.totalElements }}
          </span>
        </button>

        <button
          type="button"
          @click="store.mudarTipoBaseEfetivados('COMISS')"
          :class="[
            'focus-ring flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition',
            store.dadosEfetivados.tipoBaseAtiva === 'COMISS'
              ? 'bg-white text-brand-dark shadow-sm'
              : 'text-sage-muted hover:text-brand-dark'
          ]"
        >
          <Percent class="h-3.5 w-3.5" />
          <span>Comissões Base</span>
          <span
            v-if="store.dadosEfetivados.tipoBaseAtiva === 'COMISS' && store.dadosEfetivados.totalElements"
            class="rounded-full bg-sage-pill px-2 py-0.5 text-[10px] font-bold text-brand-dark"
          >
            {{ store.dadosEfetivados.totalElements }}
          </span>
        </button>
      </div>

      <!-- Filtros e Busca -->
      <div class="flex flex-wrap items-center gap-3">
        <!-- Filtro de Competência -->
        <select
          :value="store.dadosEfetivados.competenciaFiltro"
          @change="store.setCompetenciaFiltro($event.target.value)"
          aria-label="Filtrar por competência"
          class="focus-ring rounded-xl border border-sage-border bg-white px-3.5 py-2 text-xs font-semibold text-brand-dark outline-none"
        >
          <option value="TODAS">Todas as competências</option>
          <option
            v-for="c in store.competencias"
            :key="c.competenciaCodigo || c.name"
            :value="c.competenciaCodigo"
          >
            {{ c.name }} ({{ c.competenciaCodigo }})
          </option>
        </select>

        <!-- Campo de busca rápida -->
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sage-muted" />
          <input
            :value="store.dadosEfetivados.termoBusca"
            @input="store.setTermoBusca($event.target.value)"
            placeholder="Filtrar matrícula, cargo..."
            class="focus-ring rounded-xl border border-sage-border bg-white pl-8 pr-4 py-2 text-xs text-brand-dark outline-none w-48 sm:w-56"
          />
        </div>

        <!-- Ações de Exclusão de Base e Limpeza -->
        <template v-if="store.dadosEfetivados.tipoBaseAtiva === 'VENDAS'">
          <!-- Excluir Vendas da Competência Selecionada -->
          <button
            v-if="store.dadosEfetivados.competenciaFiltro !== 'TODAS'"
            type="button"
            @click="store.abrirModalExclusaoBase(store.dadosEfetivados.competenciaFiltro)"
            class="focus-ring flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger-bg px-3 py-2 text-xs font-bold text-danger hover:bg-danger hover:text-white transition"
            :title="`Excluir permanentemente todas as vendas da competência ${store.dadosEfetivados.competenciaFiltro}`"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>Excluir base da competência</span>
          </button>

          <!-- Excluir Todas as Vendas -->
          <button
            type="button"
            @click="store.abrirModalExclusaoTodasVendas"
            class="focus-ring flex items-center gap-1.5 rounded-xl border border-sage-border bg-white px-3 py-2 text-xs font-semibold text-sage-muted hover:text-danger hover:border-danger/30 hover:bg-danger-bg/50 transition"
            title="Excluir todas as vendas registradas no banco"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Limpar vendas</span>
          </button>
        </template>

        <template v-else-if="store.dadosEfetivados.tipoBaseAtiva === 'RH'">
          <!-- Excluir Todas as Matrículas (quando sem vendas) -->
          <button
            type="button"
            @click="store.abrirModalExclusaoTodasMatriculas"
            class="focus-ring flex items-center gap-1.5 rounded-xl border border-sage-border bg-white px-3 py-2 text-xs font-semibold text-sage-muted hover:text-danger hover:border-danger/30 hover:bg-danger-bg/50 transition"
            title="Excluir todas as matrículas se não houver vendas vinculadas"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Limpar matrículas</span>
          </button>
        </template>

        <!-- Botão Recarregar -->
        <button
          type="button"
          @click="store.carregarDadosEfetivados"
          :disabled="store.dadosEfetivados.loading"
          class="focus-ring rounded-xl border border-sage-border bg-white p-2 text-sage-muted hover:text-brand-dark hover:bg-sage-light transition disabled:opacity-50"
          title="Recarregar dados do servidor"
        >
          <RefreshCw class="h-4 w-4" :class="{ 'animate-spin': store.dadosEfetivados.loading }" />
        </button>
      </div>
    </div>

    <!-- Banner Orientativo Mandatório de Governança -->
    <div class="rounded-xl border border-sage-border bg-sage-surface/60 p-4 text-xs text-brand-dark flex items-start gap-3">
      <Info class="h-4 w-4 text-brand-dark shrink-0 mt-0.5" />
      <div class="leading-relaxed">
        <strong>Consulta de Dados Efetivados (S1-B18):</strong>
        Esta visualização apresenta os registros integrados ao banco relacional. Caso identifique inconsistências nos dados, efetue os ajustes no arquivo XLSX/CSV original e realize um novo envio pelo upload. A alteração individual direta não é permitida para manter a rastreabilidade do ciclo.
      </div>
    </div>

    <!-- Estado de Erro -->
    <div
      v-if="store.dadosEfetivados.error"
      class="rounded-xl border border-danger bg-danger-bg p-4 text-xs text-danger font-semibold flex items-center justify-between"
    >
      <span>{{ store.dadosEfetivados.error }}</span>
      <button
        type="button"
        @click="store.carregarDadosEfetivados"
        class="underline underline-offset-2 hover:text-danger-dark"
      >
        Tentar novamente
      </button>
    </div>

    <!-- Tabela de Dados Efetivados -->
    <div class="overflow-x-auto rounded-2xl border border-sage-border-light bg-white relative">
      <!-- Loading overlay -->
      <div
        v-if="store.dadosEfetivados.loading"
        class="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
      >
        <div class="flex items-center gap-2 text-xs font-bold text-brand-dark">
          <RefreshCw class="h-4 w-4 animate-spin text-brand" />
          <span>Consultando registros no servidor...</span>
        </div>
      </div>

      <!-- TABELA RH -->
      <table v-if="store.dadosEfetivados.tipoBaseAtiva === 'RH'" class="w-full min-w-[700px] text-left text-sm">
        <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted border-b border-sage-border-light">
          <tr>
            <th class="px-5 py-3.5 font-semibold">Matrícula</th>
            <th class="px-5 py-3.5 font-semibold">Cargo</th>
            <th class="px-5 py-3.5 font-semibold">Loja / Filial</th>
            <th class="px-5 py-3.5 font-semibold">Data Admissão</th>
            <th class="px-5 py-3.5 font-semibold">Data Demissão</th>
            <th class="px-5 py-3.5 font-semibold text-right">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sage-border-light">
          <tr
            v-for="item in store.dadosEfetivados.itens"
            :key="item.id"
            class="hover:bg-sage-light/40 transition"
          >
            <td class="px-5 py-3.5 font-mono font-bold text-xs text-brand-dark">
              {{ item.registration || item.id?.substring(0, 8) }}
            </td>
            <td class="px-5 py-3.5 text-xs text-brand-dark">
              <span class="font-semibold">{{ item.position?.description || 'Cargo padrão' }}</span>
              <span class="text-sage-muted text-[11px] ml-1">({{ item.position?.code || '-' }})</span>
            </td>
            <td class="px-5 py-3.5 text-xs text-sage-muted">
              {{ item.store?.description || 'Filial' }} ({{ item.store?.code || '-' }})
            </td>
            <td class="px-5 py-3.5 text-xs text-sage-muted">
              {{ formatarData(item.admissDate) }}
            </td>
            <td class="px-5 py-3.5 text-xs text-sage-muted">
              {{ item.demissDate ? formatarData(item.demissDate) : '— (Ativo)' }}
            </td>
            <td class="px-5 py-3.5 text-right">
              <button
                type="button"
                @click="store.abrirModalExclusaoRegistro('RH', item)"
                class="focus-ring inline-flex items-center rounded-lg p-1.5 text-sage-muted hover:bg-danger-bg hover:text-danger transition"
                title="Excluir matrícula"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </td>
          </tr>

          <!-- Vazio -->
          <tr v-if="!store.dadosEfetivados.loading && store.dadosEfetivados.itens.length === 0">
            <td colspan="6" class="px-5 py-12 text-center text-sage-muted">
              <Users class="mx-auto h-8 w-8 text-sage-border mb-2" />
              <p class="font-medium text-sm">Nenhuma matrícula localizada.</p>
              <p class="text-xs mt-1">Carregue a base de RH através do envio de ciclo conjunto.</p>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- TABELA VENDAS -->
      <table v-else-if="store.dadosEfetivados.tipoBaseAtiva === 'VENDAS'" class="w-full min-w-[750px] text-left text-sm">
        <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted border-b border-sage-border-light">
          <tr>
            <th class="px-5 py-3.5 font-semibold">ID / Protocolo</th>
            <th class="px-5 py-3.5 font-semibold">Matrícula</th>
            <th class="px-5 py-3.5 font-semibold">Marca</th>
            <th class="px-5 py-3.5 font-semibold">Loja</th>
            <th class="px-5 py-3.5 font-semibold">Data da Venda</th>
            <th class="px-5 py-3.5 font-semibold">Valor Bruto</th>
            <th class="px-5 py-3.5 font-semibold">Canal</th>
            <th class="px-5 py-3.5 font-semibold text-right">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sage-border-light">
          <tr
            v-for="item in store.dadosEfetivados.itens"
            :key="item.id"
            class="hover:bg-sage-light/40 transition"
          >
            <td class="px-5 py-3.5 font-mono text-[11px] text-sage-muted max-w-[120px] truncate" :title="item.id">
              {{ item.id ? item.id.substring(0, 8) + '...' : '-' }}
            </td>
            <td class="px-5 py-3.5 font-mono font-bold text-xs text-brand-dark">
              {{ item.registration?.registration || 'MATRIC-VEND' }}
            </td>
            <td class="px-5 py-3.5 text-xs text-brand-dark font-medium">
              {{ item.brand?.description || 'Marca' }}
            </td>
            <td class="px-5 py-3.5 text-xs text-sage-muted">
              {{ item.store?.description || 'Loja' }}
            </td>
            <td class="px-5 py-3.5 text-xs text-sage-muted">
              {{ formatarData(item.saleDate) }}
            </td>
            <td class="px-5 py-3.5 text-xs font-extrabold text-brand-dark">
              {{ formatarMoeda(item.value) }}
            </td>
            <td class="px-5 py-3.5 text-xs">
              <span class="rounded bg-sage-light px-2 py-0.5 text-[10px] font-bold uppercase text-brand-dark">
                {{ item.saleChannel || 'LOJA_FISICA' }}
              </span>
            </td>
            <td class="px-5 py-3.5 text-right">
              <button
                type="button"
                @click="store.abrirModalExclusaoRegistro('VENDAS', item)"
                class="focus-ring inline-flex items-center rounded-lg p-1.5 text-sage-muted hover:bg-danger-bg hover:text-danger transition"
                title="Excluir venda"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </td>
          </tr>

          <!-- Vazio -->
          <tr v-if="!store.dadosEfetivados.loading && store.dadosEfetivados.itens.length === 0">
            <td colspan="8" class="px-5 py-12 text-center text-sage-muted">
              <TrendingUp class="mx-auto h-8 w-8 text-sage-border mb-2" />
              <p class="font-medium text-sm">Nenhuma venda localizada.</p>
              <p class="text-xs mt-1">Carregue a base de Vendas através do envio de ciclo conjunto.</p>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- TABELA COMISS -->
      <table v-else class="w-full min-w-[650px] text-left text-sm">
        <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted border-b border-sage-border-light">
          <tr>
            <th class="px-5 py-3.5 font-semibold">Cargo Elegível</th>
            <th class="px-5 py-3.5 font-semibold">Marca / Linha</th>
            <th class="px-5 py-3.5 font-semibold">Taxa Percentual</th>
            <th class="px-5 py-3.5 font-semibold">Vigência Obrigatória</th>
            <th class="px-5 py-3.5 font-semibold text-right">Ação</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sage-border-light">
          <tr
            v-for="item in store.dadosEfetivados.itens"
            :key="item.id"
            class="hover:bg-sage-light/40 transition"
          >
            <td class="px-5 py-3.5 text-xs font-bold text-brand-dark">
              {{ item.cargo }}
            </td>
            <td class="px-5 py-3.5 text-xs text-brand-dark font-medium">
              {{ item.marca }}
            </td>
            <td class="px-5 py-3.5 text-xs font-extrabold text-success">
              {{ (item.percentual * 100).toFixed(2) }}%
            </td>
            <td class="px-5 py-3.5 text-xs text-sage-muted">
              {{ formatarData(item.vigenciaInicio) }} até {{ formatarData(item.vigenciaFim) }}
            </td>
            <td class="px-5 py-3.5 text-right">
              <button
                type="button"
                @click="store.abrirModalExclusaoRegistro('COMISS', item)"
                class="focus-ring inline-flex items-center rounded-lg p-1.5 text-sage-muted hover:bg-danger-bg hover:text-danger transition"
                title="Excluir taxa"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </td>
          </tr>

          <!-- Vazio -->
          <tr v-if="!store.dadosEfetivados.loading && store.dadosEfetivados.itens.length === 0">
            <td colspan="5" class="px-5 py-12 text-center text-sage-muted">
              <Percent class="mx-auto h-8 w-8 text-sage-border mb-2" />
              <p class="font-medium text-sm">Nenhuma taxa de comissão localizada.</p>
              <p class="text-xs mt-1">Carregue a planilha pelo botão "Tabelas de Comissão".</p>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Paginação -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-sage-border-light px-5 py-3.5 bg-sage-surface text-xs text-sage-muted">
        <div>
          Mostrando página <strong>{{ store.dadosEfetivados.page + 1 }}</strong> de <strong>{{ Math.max(1, store.dadosEfetivados.totalPages) }}</strong>
          (Total: <strong>{{ store.dadosEfetivados.totalElements }}</strong> registros)
        </div>

        <div class="flex items-center gap-3">
          <!-- Tamanho da página -->
          <div class="flex items-center gap-1.5">
            <span>Exibir:</span>
            <select
              :value="store.dadosEfetivados.size"
              @change="store.mudarTamanhoPaginaEfetivados($event.target.value)"
              class="rounded-lg border border-sage-border bg-white px-2 py-1 font-semibold text-brand-dark outline-none"
            >
              <option :value="10">10</option>
              <option :value="20">20</option>
              <option :value="50">50</option>
            </select>
          </div>

          <!-- Botões Anterior / Próxima -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              @click="store.mudarPaginaEfetivados(store.dadosEfetivados.page - 1)"
              :disabled="store.dadosEfetivados.page <= 0 || store.dadosEfetivados.loading"
              class="focus-ring flex items-center gap-1 rounded-lg border border-sage-border bg-white px-3 py-1 font-semibold text-brand-dark hover:bg-sage-light disabled:opacity-40 transition"
            >
              <ChevronLeft class="h-3.5 w-3.5" />
              <span>Anterior</span>
            </button>
            <button
              type="button"
              @click="store.mudarPaginaEfetivados(store.dadosEfetivados.page + 1)"
              :disabled="store.dadosEfetivados.page + 1 >= store.dadosEfetivados.totalPages || store.dadosEfetivados.loading"
              class="focus-ring flex items-center gap-1 rounded-lg border border-sage-border bg-white px-3 py-1 font-semibold text-brand-dark hover:bg-sage-light disabled:opacity-40 transition"
            >
              <span>Próxima</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import {
  Users,
  TrendingUp,
  Percent,
  Search,
  RefreshCw,
  Info,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()

onMounted(() => {
  if (store.dadosEfetivados.itens.length === 0) {
    store.carregarDadosEfetivados()
  }
})

function formatarData(val) {
  if (!val) return '-'
  try {
    const parts = String(val).split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return val
  } catch {
    return val
  }
}

function formatarMoeda(val) {
  if (val == null) return 'R$ 0,00'
  return Number(val).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}
</script>
