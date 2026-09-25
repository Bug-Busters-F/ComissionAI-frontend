<template>
  <div class="space-y-4">
    <!-- Cabeçalho da seção -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-lg font-extrabold tracking-[-0.03em] text-brand-dark">
          Histórico de Envios & Validação de Planilhas
        </h3>
        <p class="text-xs text-sage-muted">
          Acompanhe o status e consulte os diagnósticos estruturais e relacionais de cada lote processado.
        </p>
      </div>
      <div class="text-xs text-sage-muted">
        Total de envios registrados: <strong>{{ store.enviosHistorico.length }}</strong>
      </div>
    </div>

    <!-- Banner Orientativo -->
    <div class="rounded-xl border border-warning-border bg-warning-bg/40 p-4 text-xs text-brand-dark flex items-start gap-3">
      <AlertCircle class="h-4 w-4 text-warning-dark shrink-0 mt-0.5" />
      <div>
        <p class="font-bold text-warning-dark">Regra de Governança e Integridade</p>
        <p class="mt-0.5 text-sage-muted">
          Lotes com erros impeditivos não são importados parcialmente. As correções devem ser efetuadas diretamente no arquivo XLSX/CSV e reenviadas através do botão "+ Enviar ciclo" ou "Tabelas de Comissão".
        </p>
      </div>
    </div>

    <!-- Tabela de Envios -->
    <div class="overflow-x-auto rounded-2xl border border-sage-border-light bg-white">
      <table class="w-full min-w-[700px] text-left text-sm">
        <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted border-b border-sage-border-light">
          <tr>
            <th class="px-5 py-3.5 font-semibold">Competência / Vigência</th>
            <th class="px-5 py-3.5 font-semibold">Tipo de Base</th>
            <th class="px-5 py-3.5 font-semibold">Arquivos Enviados</th>
            <th class="px-5 py-3.5 font-semibold">Data do Envio</th>
            <th class="px-5 py-3.5 font-semibold">Volume (Válidas / Total)</th>
            <th class="px-5 py-3.5 font-semibold">Situação</th>
            <th class="px-5 py-3.5 font-semibold text-right">Ações</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-sage-border-light">
          <tr
            v-for="envio in store.enviosHistorico"
            :key="envio.id"
            class="hover:bg-sage-light/40 transition"
          >
            <!-- Competência -->
            <td class="px-5 py-4">
              <p class="font-bold text-brand-dark">{{ envio.competenciaNome || envio.competencia }}</p>
              <p class="text-xs text-sage-muted">{{ envio.competencia || 'Sem código' }}</p>
            </td>

            <!-- Tipo de Base -->
            <td class="px-5 py-4">
              <span
                :class="[
                  'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider',
                  envio.tipoBase === 'CICLO_MENSAL'
                    ? 'bg-brand/20 text-brand-dark'
                    : 'bg-sage-border text-brand-dark'
                ]"
              >
                {{ formatarTipoBase(envio.tipoBase) }}
              </span>
            </td>

            <!-- Arquivos -->
            <td class="px-5 py-4 max-w-xs truncate">
              <div class="flex items-center gap-1.5 text-xs text-brand-dark font-medium truncate" :title="envio.nomeArquivo">
                <FileSpreadsheet class="h-3.5 w-3.5 text-sage-muted shrink-0" />
                <span class="truncate">{{ envio.nomeArquivo }}</span>
              </div>
            </td>

            <!-- Data do Envio -->
            <td class="px-5 py-4 text-xs text-sage-muted">
              {{ formatarData(envio.criadoEm) }}
            </td>

            <!-- Volume de Linhas -->
            <td class="px-5 py-4 text-xs">
              <span class="font-bold text-brand-dark">{{ envio.linhasValidas }}</span>
              <span class="text-sage-muted"> / {{ envio.totalLinhas }}</span>
              <span v-if="envio.totalLinhas > 0" class="text-[11px] text-sage-muted ml-1">
                ({{ Math.round((envio.linhasValidas / envio.totalLinhas) * 100) }}%)
              </span>
            </td>

            <!-- Status -->
            <td class="px-5 py-4">
              <StatusBadge
                :label="formatarStatus(envio.status)"
                :tone="obterToneStatus(envio.status)"
              />
            </td>

            <!-- Ações -->
            <td class="px-5 py-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  @click="store.abrirRelatorioEnvio(envio)"
                  class="focus-ring inline-flex items-center gap-1 rounded-lg border border-sage-border px-3 py-1.5 text-xs font-semibold text-brand-dark hover:bg-sage-light transition"
                  title="Consultar relatório e apontamentos"
                >
                  <Eye class="h-3.5 w-3.5" />
                  <span>Relatório</span>
                </button>

                <button
                  type="button"
                  @click="store.abrirModalExclusaoEnvio(envio)"
                  class="focus-ring inline-flex items-center rounded-lg p-1.5 text-sage-muted hover:bg-danger-bg hover:text-danger transition"
                  title="Remover envio do histórico"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>

          <!-- Estado Vazio -->
          <tr v-if="store.enviosHistorico.length === 0">
            <td colspan="7" class="px-5 py-12 text-center text-sage-muted">
              <FileSpreadsheet class="mx-auto h-8 w-8 text-sage-border mb-2" />
              <p class="font-medium text-sm">Nenhum envio registrado até o momento.</p>
              <p class="text-xs mt-1">Utilize o botão "+ Enviar ciclo" acima para carregar novas planilhas.</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { FileSpreadsheet, Eye, Trash2, AlertCircle } from 'lucide-vue-next'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { useDataStore } from '@/stores/dataStore'

const store = useDataStore()

function formatarTipoBase(tipo) {
  if (tipo === 'CICLO_MENSAL') return 'Ciclo (RH + Vendas)'
  if (tipo === 'TAXAS_BASE' || tipo === 'COMISS') return 'Taxas de Comissão'
  if (tipo === 'RH') return 'RH'
  if (tipo === 'VENDAS') return 'Vendas'
  return tipo
}

function formatarStatus(status) {
  if (status === 'SUCESSO') return 'Efetivado'
  if (status === 'PROCESSADO_COM_AVISOS') return 'Com Avisos'
  if (status === 'REJEITADO') return 'Rejeitado'
  return status
}

function obterToneStatus(status) {
  if (status === 'SUCESSO') return 'success'
  if (status === 'PROCESSADO_COM_AVISOS') return 'warning'
  return 'danger'
}

function formatarData(isoStr) {
  if (!isoStr) return '-'
  try {
    const d = new Date(isoStr)
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return isoStr
  }
}
</script>
