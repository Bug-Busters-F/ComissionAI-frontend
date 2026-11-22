<template>
  <div class="space-y-7">
    <PageHeader
      :title="`Cálculo · ${formatCompetenceLabel(competenceKey)}`"
      description="Calcule as comissões das vendas cadastradas da competência."
    >
      <template #action>
        <RouterLink to="/dados" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-white">
          ← Dados
        </RouterLink>
      </template>
    </PageHeader>

    <section class="flex flex-col gap-5 rounded-[22px] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">Competência selecionada</p>
        <h2 class="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-brand-dark">{{ formatCompetenceCode(competenceKey) }}</h2>
        <p class="mt-2 text-sm text-sage-muted">
          <template v-if="isClosedCompetence">Competência lacrada e liquidada contabilmente.</template>
          <template v-else-if="salesQueryState === SALES_QUERY_STATE.SUCCESS">{{ salesCount }} vendas cadastradas no período.</template>
          <template v-else-if="salesQueryState === SALES_QUERY_STATE.LOADING">Consultando as vendas cadastradas…</template>
          <template v-else-if="salesQueryState === SALES_QUERY_STATE.ERROR">Não foi possível consultar as vendas.</template>
          <template v-else>Competência não validada.</template>
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <button
          v-if="access.can('calculate') && !isClosedCompetence"
          type="button"
          class="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canCalculate || closingStatusData.bloqueada"
          @click="handleCalculation"
        >
          <RefreshCw v-if="isCalculating" class="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>{{ isCalculating ? (recalculationRequested ? 'Recalculando…' : 'Calculando…') : hasPreviousCalculation ? 'Recalcular e conferir' : 'Calcular comissões' }}</span>
        </button>
      </div>
    </section>

    <!-- Card de Fechamento Contábil e Liquidação ([FRONT-10]) -->
    <CompetenceClosingStatusCard
      v-if="competenceKey && effectiveClosingStatusData"
      :competencia="competenceKey"
      :status-data="effectiveClosingStatusData"
      :is-checking-status="isCheckingClosingStatus"
      :is-recalculating="isCalculating && recalculationRequested"
      :can-execute-closing="canExecuteClosing"
      :has-preview-calculated="Boolean(previewTotals)"
      :has-proof="Boolean(closingResponseData)"
      :proof-downloaded="proofDownloaded"
      :divergence-warning="divergenceWarning"
      :lost-response-warning="lostResponseWarning"
      @refresh-status="checkClosingStatus(true)"
      @download-proof="handleDownloadProof"
      @recalculate-and-check="triggerRecalculateAndCheck"
      @open-closing-modal="isClosingModalOpen = true"
    />

    <section v-if="!competenceKey" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Competência inválida</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">Informe uma competência válida no formato MM/AAAA, com mês entre 01 e 12.</p>
    </section>

    <section v-else-if="!isClosedCompetence && salesQueryState === SALES_QUERY_STATE.LOADING" class="rounded-2xl border border-sage-border bg-white p-6" role="status" aria-live="polite">
      <div class="flex items-center gap-3">
        <RefreshCw class="h-5 w-5 animate-spin text-sage-muted" aria-hidden="true" />
        <div>
          <h2 class="font-extrabold text-brand-dark">Consultando vendas da competência…</h2>
          <p class="mt-1 text-sm text-sage-muted">Os botões de cálculo serão liberados após a consulta.</p>
        </div>
      </div>
    </section>

    <section v-else-if="!isClosedCompetence && salesQueryState === SALES_QUERY_STATE.ERROR" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível consultar as vendas</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ salesQueryError }}</p>
      <button type="button" class="focus-ring mt-5 rounded-full bg-danger px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="isCalculating" @click="retrySalesQuery">
        Tentar consultar novamente
      </button>
    </section>

    <section v-else-if="!isClosedCompetence && salesQueryState === SALES_QUERY_STATE.SUCCESS && salesCount === 0" class="rounded-2xl border border-sage-border bg-white p-6" role="status">
      <h2 class="text-xl font-extrabold text-brand-dark">Nenhuma venda encontrada</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Não há vendas cadastradas para essa competência. O cálculo permanece indisponível.</p>
    </section>

    <p v-if="result" class="rounded-2xl border border-sage-border bg-sage-light px-5 py-4 text-sm leading-6 text-sage-muted">
      {{ result.recalculoExecutado ? 'As regras atuais foram aplicadas ao recálculo desta competência.' : 'Resultados já registrados são reaproveitados pelo sistema quando a competência é executada novamente.' }}
    </p>

    <p v-if="restoredResult" class="rounded-2xl border border-sage-border bg-white px-5 py-4 text-sm leading-6 text-sage-muted" role="status">
      <strong class="text-brand-dark">Resultado da última execução nesta sessão</strong>
      — recebido em {{ formatDateTime(restoredResult.recebidoEm) }}. Esse resultado não garante que as regras e bases atuais já tenham sido aplicadas.
    </p>

    <p v-if="result?.recalculoExecutado && result.totalImpedimentos" class="rounded-2xl border border-warning-border bg-warning-bg px-5 py-4 text-sm leading-6 text-warning-dark" role="status">
      Algumas vendas não foram recalculadas; seus resultados anteriores foram preservados.
    </p>

    <!-- Acompanhamento Assíncrono da Apuração (FRONT-11) -->
    <section
      v-if="isCalculating || activeExecutionForThisCompetence"
      class="rounded-[22px] border border-warning-border bg-warning-bg p-6 space-y-4"
      role="status"
      aria-live="polite"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <RefreshCw
            v-if="isCalculating"
            class="h-5 w-5 animate-spin text-warning-dark shrink-0"
            aria-hidden="true"
          />
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-extrabold text-brand-dark">
                {{ recalculationRequested ? 'Recalculando apuração' : 'Acompanhando apuração' }} de {{ formatCompetenceLabel(competenceKey) }}
              </h2>
              <span
                v-if="calculationStore.executionId"
                class="rounded-md border border-warning-border bg-white/70 px-2 py-0.5 font-mono text-[11px] font-bold text-brand-dark"
                title="Identificador da execução"
              >
                {{ calculationStore.executionId }}
              </span>
            </div>
            <p class="mt-1 text-sm text-sage-muted">
              {{ calculationStore.stage || 'Processamento em andamento...' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2.5">
          <StatusBadge
            :label="currentAsyncStatusLabel"
            :tone="currentAsyncStatusTone"
          />
          <span class="text-sm font-extrabold text-brand-dark tabular-nums">
            {{ calculationStore.progress == null ? '—' : calculationStore.progress + '%' }}
          </span>
        </div>
      </div>

      <!-- Barra de Progresso Percentual -->
      <div class="h-2.5 w-full overflow-hidden rounded-full bg-white/80 border border-warning-border/50">
        <div
          class="h-full bg-brand transition-all duration-300"
          :style="{ width: `${calculationStore.progress ?? 0}%` }"
        ></div>
      </div>

      <!-- Alerta Transitório de Conexão -->
      <div
        v-if="calculationStore.transientWarning"
        class="rounded-xl border border-warning-border/80 bg-white/80 p-3 text-xs font-medium text-warning-dark"
        role="alert"
      >
        {{ calculationStore.transientWarning }}
      </div>

      <button v-if="calculationStore.asyncStatus === ASYNC_EXECUTION_STATES.ACOMPANHAMENTO_PAUSADO" type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark disabled:opacity-50" :disabled="Boolean(calculationStore.monitoringPromise)" @click="calculationStore.resumeExecution()">Retomar acompanhamento</button>
      <!-- Orientação de Fechamento Seguro da Tela -->
      <p class="text-xs text-sage-muted">
        O cálculo continua mesmo fora desta tela. Ao navegar pelo sistema ou atualizar a página nesta aba, o acompanhamento será retomado sem iniciar outra execução.
      </p>
    </section>

    <section v-else-if="anotherCalculationProcessing" class="rounded-[22px] border border-warning-border bg-warning-bg p-6" role="status" aria-live="polite">
      <div class="flex items-center gap-3">
        <RefreshCw class="h-5 w-5 animate-spin text-warning-dark" aria-hidden="true" />
        <div>
          <h2 class="font-extrabold text-brand-dark">Outra competência está sendo processada</h2>
          <p class="mt-1 text-sm text-sage-muted">{{ formatCompetenceLabel(calculationStore.competencia) }} está em processamento. Aguarde a conclusão antes de iniciar outro cálculo.</p>
        </div>
      </div>
    </section>

    <section v-if="calculationErrorMessage" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível concluir o cálculo</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ calculationErrorMessage }}</p>
      <div v-if="!isCalculating" class="mt-5 flex flex-wrap gap-3">
        <button type="button" class="focus-ring rounded-full border border-sage-border-dark bg-white px-5 py-3 text-sm font-bold text-brand-dark" @click="consultHistory">
          Consultar histórico
        </button>
        <button type="button" class="focus-ring rounded-full bg-danger px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canCalculate" @click="retryLastOperation">
          Tentar novamente
        </button>
      </div>
    </section>

    <p v-if="previousResultAfterFailure" class="rounded-2xl border border-warning-border bg-warning-bg px-5 py-4 text-sm leading-6 text-warning-dark" role="status">
      O resultado exibido é da execução anterior. A tentativa mais recente falhou; consulte o histórico antes de tentar novamente.
    </p>

    <template v-if="result">
      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="calculation-summary-heading">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="calculation-summary-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Resultado da competência</h2>
            <p class="mt-1 text-sm text-sage-muted">{{ result.resumoExecucao ? 'Contagens confirmadas desta execução. Os totais financeiros e os detalhes por venda não estão disponíveis neste resumo.' : 'Os totais consideram o retorno integral do cálculo.' }}</p>
            <button v-if="result.resumoExecucao" type="button" class="focus-ring mt-3 rounded text-sm font-bold underline" @click="consultHistory">Consultar histórico de cálculos</button>
          </div>
          <StatusBadge :label="result.totalImpedimentos ? 'Concluído com impedimentos' : 'Concluído'" :tone="result.totalImpedimentos ? 'warning' : 'success'" />
        </div>

        <dl class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div v-for="item in summaryItems" :key="item.label" class="rounded-2xl bg-sage-light p-4">
            <dt class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">{{ item.label }}</dt>
            <dd class="mt-2 text-xl font-extrabold text-brand-dark">{{ item.value }}</dd>
          </div>
        </dl>

        <p v-if="result.totalImpedimentos && !result.resumoExecucao" class="mt-5 rounded-xl border border-warning-border bg-warning-bg px-4 py-3 text-sm leading-6 text-warning-dark">
          O total de comissões considera somente as vendas calculadas com sucesso.
        </p>
      </section>

      <MissingBasesCard
        v-if="coverageGroups.length"
        :groups="coverageGroups"
        :competence-key="competenceKey"
        :is-processing="isCalculating"
        @recalculate="handleMissingBasesRecalculate"
      />

      <section v-if="!result.resumoExecucao && !result.resultados.length && !result.impedimentos.length" class="rounded-2xl border border-sage-border bg-white p-6" role="status">
        <h2 class="text-xl font-extrabold text-brand-dark">Nenhuma venda encontrada</h2>
        <p class="mt-2 text-sm leading-6 text-sage-muted">Não há vendas cadastradas para essa competência.</p>
      </section>
    </template>

    <!-- Navegação de Abas de Apuração e Relatórios Consolidados (FRONT-11) -->
    <section v-if="result || isClosedCompetence" class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-sage-border pb-4">
        <nav class="flex flex-wrap items-center gap-2" aria-label="Abas de apuração e relatórios">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
            :class="activeReportTab === 'colaboradores' ? 'bg-brand text-brand-dark shadow-sm' : 'bg-white text-sage-muted hover:bg-sage-light hover:text-brand-dark'"
            :aria-pressed="activeReportTab === 'colaboradores'"
            @click="activeReportTab = 'colaboradores'"
          >
            <span>Por Colaborador</span>
            <span
              v-if="collaboratorRows.length"
              class="rounded-full bg-brand-dark/10 px-2 py-0.5 text-xs font-extrabold text-brand-dark"
            >
              {{ collaboratorRows.length }}
            </span>
          </button>

          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
            :class="activeReportTab === 'regras' ? 'bg-brand text-brand-dark shadow-sm' : 'bg-white text-sage-muted hover:bg-sage-light hover:text-brand-dark'"
            :aria-pressed="activeReportTab === 'regras'"
            @click="activeReportTab = 'regras'"
          >
            <span>Por Grupo de Regra</span>
            <span
              v-if="ruleRows.length"
              class="rounded-full bg-brand-dark/10 px-2 py-0.5 text-xs font-extrabold text-brand-dark"
            >
              {{ ruleRows.length }}
            </span>
          </button>

          <button
            v-if="result?.resultados?.length"
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
            :class="activeReportTab === 'vendas' ? 'bg-brand text-brand-dark shadow-sm' : 'bg-white text-sage-muted hover:bg-sage-light hover:text-brand-dark'"
            :aria-pressed="activeReportTab === 'vendas'"
            @click="activeReportTab = 'vendas'"
          >
            <span>Vendas Detalhadas</span>
            <span class="rounded-full bg-brand-dark/10 px-2 py-0.5 text-xs font-extrabold text-brand-dark">
              {{ result.resultados.length }}
            </span>
          </button>

          <button
            v-if="cadastralImpediments.length || coverageSales.length"
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition"
            :class="activeReportTab === 'impedimentos' ? 'bg-brand text-brand-dark shadow-sm' : 'bg-white text-sage-muted hover:bg-sage-light hover:text-brand-dark'"
            :aria-pressed="activeReportTab === 'impedimentos'"
            @click="activeReportTab = 'impedimentos'"
          >
            <span>Impedimentos</span>
            <span class="rounded-full bg-warning-dark/20 text-warning-dark px-2 py-0.5 text-xs font-extrabold">
              {{ cadastralImpediments.length + coverageSales.length }}
            </span>
          </button>
        </nav>

        <CommissionReportExportDropdown
          :disabled="!isClosedCompetence || isLoadingReport || isExportingCsv"
          :loading="isExportingCsv"
          @export="handleExportReport"
        />
      </div>

      <div v-if="reportError && isClosedCompetence" class="rounded-2xl border border-danger/30 bg-danger-bg p-5" role="alert">
        <p class="text-sm font-bold text-danger-dark">{{ reportError }}</p>
        <button type="button" class="mt-3 rounded-full bg-danger px-4 py-2 text-xs font-bold text-white" @click="loadClosingReport(competenceKey)">
          Tentar carregar novamente
        </button>
      </div>

      <div
        v-if="!isClosedCompetence && (activeReportTab === 'colaboradores' || activeReportTab === 'regras')"
        class="rounded-[22px] border border-sage-border bg-white p-7 text-center space-y-3"
      >
        <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-light text-sage-muted">
          <FileSpreadsheet class="h-6 w-6" />
        </div>
        <h3 class="text-lg font-extrabold text-brand-dark">Relatório Consolidado Disponível Após o Fechamento</h3>
        <p class="mx-auto max-w-xl text-sm leading-6 text-sage-muted">
          Os relatórios consolidados por colaborador e por grupo de regra com exportação contábil oficial (.csv) são gerados no fechamento contábil e liquidação da competência.
        </p>
        <div class="pt-2">
          <button
            v-if="canExecuteClosing"
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover"
            @click="isClosingModalOpen = true"
          >
            Realizar Fechamento da Competência
          </button>
          <button
            v-else-if="result?.resultados?.length"
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border-dark px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-sage-light"
            @click="activeReportTab = 'vendas'"
          >
            Visualizar Vendas Detalhadas
          </button>
        </div>
      </div>

      <div v-else-if="activeReportTab === 'colaboradores'">
        <CommissionReportCollaboratorTab
          :items="collaboratorRows"
          :loading="isLoadingReport"
        />
      </div>

      <div v-else-if="activeReportTab === 'regras'">
        <CommissionReportRuleTab
          :rules="ruleRows"
          :total-gerais-comissao="totalGeraisComissao"
          :loading="isLoadingReport"
        />
      </div>

      <div v-else-if="activeReportTab === 'vendas' && result?.resultados?.length">
        <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="calculated-sales-heading">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="calculated-sales-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Vendas calculadas</h2>
              <p class="mt-1 text-sm text-sage-muted">Valores e taxas retornados pelo motor de cálculo.</p>
            </div>
            <div class="flex flex-wrap gap-3">
              <label class="sr-only" for="calculation-registration-filter">Filtrar por matrícula</label>
              <input id="calculation-registration-filter" v-model="matriculaFilter" type="search" class="campaign-control max-w-[220px]" placeholder="Filtrar matrícula" />
              <label class="sr-only" for="calculation-origin-filter">Filtrar por origem da taxa</label>
              <select id="calculation-origin-filter" v-model="originFilter" class="campaign-control max-w-[220px]">
                <option value="">Todas as origens</option>
                <option v-for="origin in originOptions" :key="origin" :value="origin">{{ formatOrigin(origin) }}</option>
              </select>
            </div>
          </div>

          <div class="mt-6 overflow-x-auto">
            <table class="w-full min-w-[920px] text-left text-sm">
              <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
                <tr>
                  <th class="rounded-l-xl px-3 py-3">Venda</th>
                  <th class="px-3 py-3">Matrícula</th>
                  <th class="px-3 py-3">Data</th>
                  <th class="px-3 py-3">Valor da venda</th>
                  <th class="px-3 py-3">Taxa aplicada</th>
                  <th class="px-3 py-3">Origem</th>
                  <th class="px-3 py-3">Comissão</th>
                  <th class="rounded-r-xl px-3 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-sage-border-light">
                <tr v-for="sale in paginatedResults" :key="sale.idVenda || sale.protocoloCalculo">
                  <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(sale.idVenda) }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ sale.matricula || 'Não informada' }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ formatDate(sale.dataVenda) }}</td>
                  <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(sale.valorVenda) }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ percent(sale.taxaAplicada) }}</td>
                  <td class="px-3 py-4"><StatusBadge :label="formatOrigin(sale.origemTaxa)" :tone="sale.origemTaxa === 'REGRA_NEGOCIO' ? 'success' : 'neutral'" /></td>
                  <td class="px-3 py-4 font-extrabold text-brand-dark">{{ currency(sale.valorComissao) }}</td>
                  <td class="px-3 py-4">
                    <details>
                      <summary class="cursor-pointer font-bold text-brand-dark">Ver</summary>
                      <dl class="mt-3 min-w-[210px] space-y-1 text-xs text-sage-muted">
                        <div><dt class="inline">Protocolo: </dt><dd class="inline break-all">{{ sale.protocoloCalculo || 'Não informado' }}</dd></div>
                        <div><dt class="inline">Marca: </dt><dd class="inline">{{ sale.codMarca ?? 'Não informada' }}</dd></div>
                        <div><dt class="inline">Loja: </dt><dd class="inline">{{ sale.codLoja ?? 'Não informada' }}</dd></div>
                        <div><dt class="inline">Cargo: </dt><dd class="inline">{{ sale.codCargo ?? 'Não informado' }}</dd></div>
                        <div><dt class="inline">Regra: </dt><dd class="inline">{{ sale.idRegra ?? 'Não informada' }}</dd></div>
                        <div><dt class="inline">Calculado em: </dt><dd class="inline">{{ formatDateTime(sale.dataCalculo) }}</dd></div>
                      </dl>
                    </details>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p v-if="!paginatedResults.length" class="mt-5 rounded-xl bg-sage-light px-4 py-3 text-sm text-sage-muted" role="status">
            Nenhuma venda corresponde aos filtros selecionados.
          </p>

          <PaginationControls :page="resultPage" :total-pages="resultTotalPages" @previous="resultPage -= 1" @next="resultPage += 1" />
        </section>
      </div>

      <div v-else-if="activeReportTab === 'impedimentos'" class="space-y-6">
        <section v-if="cadastralImpediments.length" class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="cadastral-blocked-sales-heading">
          <div>
            <h2 id="cadastral-blocked-sales-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Vendas com impedimento cadastral (RH)</h2>
            <p class="mt-1 text-sm text-sage-muted">Inconsistências em vínculos com colaboradores, ausência de cargo ou datas fora da vigência contratual.</p>
          </div>
          <div class="mt-6 overflow-x-auto">
            <table class="w-full min-w-[720px] text-left text-sm">
              <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
                <tr><th class="rounded-l-xl px-3 py-3">Venda</th><th class="px-3 py-3">Matrícula</th><th class="px-3 py-3">Data</th><th class="px-3 py-3">Valor</th><th class="rounded-r-xl px-3 py-3">Motivo</th></tr>
              </thead>
              <tbody class="divide-y divide-sage-border-light">
                <tr v-for="blocked in cadastralImpediments" :key="blocked.idVenda || `${blocked.matricula}-${blocked.dataVenda}`">
                  <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(blocked.idVenda) }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ blocked.matricula || 'Não informada' }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ formatDate(blocked.dataVenda) }}</td>
                  <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(blocked.valorVenda) }}</td>
                  <td class="px-3 py-4 text-danger-dark">{{ blocked.motivo || 'Motivo não informado' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <details v-if="coverageSales.length" class="group rounded-[22px] bg-white p-6 sm:p-7">
          <summary class="cursor-pointer text-sm font-bold text-brand-dark transition hover:text-brand">
            Ver listagem individual de vendas com bloqueio de cobertura ({{ coverageSales.length }} vendas protegidas)
          </summary>
          <div class="mt-5 overflow-x-auto">
            <table class="w-full min-w-[720px] text-left text-sm">
              <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
                <tr><th class="rounded-l-xl px-3 py-3">Venda</th><th class="px-3 py-3">Matrícula</th><th class="px-3 py-3">Data</th><th class="px-3 py-3">Valor</th><th class="rounded-r-xl px-3 py-3">Motivo</th></tr>
              </thead>
              <tbody class="divide-y divide-sage-border-light">
                <tr v-for="blocked in coverageSales" :key="blocked.idVenda || `${blocked.matricula}-${blocked.dataVenda}`">
                  <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(blocked.idVenda) }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ blocked.matricula || 'Não informada' }}</td>
                  <td class="px-3 py-4 text-sage-subtle">{{ formatDate(blocked.dataVenda) }}</td>
                  <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(blocked.valorVenda) }}</td>
                  <td class="px-3 py-4 text-warning-dark">{{ blocked.motivo || 'Motivo não informado' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>

    <section v-if="historyLoading" class="rounded-2xl bg-white px-6 py-10 text-center text-sm text-sage-muted" role="status">
      Consultando cálculos já registrados…
    </section>

    <section v-else-if="historyError" class="rounded-2xl border border-danger/30 bg-danger-bg p-6" role="alert">
      <h2 class="text-xl font-extrabold text-danger-dark">Não foi possível consultar os cálculos registrados</h2>
      <p class="mt-2 text-sm leading-6 text-danger-dark/80">{{ historyError }}</p>
      <button type="button" class="focus-ring mt-5 rounded-full bg-danger px-5 py-3 text-sm font-bold text-white" @click="loadHistory()">
        Tentar novamente
      </button>
    </section>

    <section v-else-if="history.content.length" class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="history-calculation-heading">
      <div>
        <h2 id="history-calculation-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Cálculos registrados</h2>
        <p class="mt-1 text-sm leading-6 text-sage-muted">Este histórico contém os registros consolidados de cada execução concluída, incluindo a origem histórica da taxa.</p>
      </div>
      <div class="mt-6 overflow-x-auto">
        <table class="w-full min-w-[820px] text-left text-sm">
          <thead class="bg-sage-pill text-[10px] uppercase tracking-[0.12em] text-sage-muted">
            <tr><th class="rounded-l-xl px-3 py-3">Venda</th><th class="px-3 py-3">Matrícula</th><th class="px-3 py-3">Data</th><th class="px-3 py-3">Valor</th><th class="px-3 py-3">Taxa</th><th class="px-3 py-3">Origem</th><th class="px-3 py-3">Comissão</th><th class="rounded-r-xl px-3 py-3">Executado em</th></tr>
          </thead>
          <tbody class="divide-y divide-sage-border-light">
            <tr v-for="log in history.content" :key="log.idLog">
              <td class="px-3 py-4 font-semibold text-brand-dark">{{ shortId(log.idVenda) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ log.matricula || 'Não informada' }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ formatDate(log.dataVenda) }}</td>
              <td class="px-3 py-4 font-semibold text-brand-dark">{{ currency(log.valorVenda ?? log.valorOriginal) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ percent(log.taxaAplicada) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ formatOrigin(log.origemTaxa) }}</td>
              <td class="px-3 py-4 font-extrabold text-brand-dark">{{ currency(log.valorComissao) }}</td>
              <td class="px-3 py-4 text-sage-subtle">{{ formatDateTime(log.executadoEm) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <PaginationControls :page="history.number" :total-pages="history.totalPages" @previous="loadHistory(history.number - 1)" @next="loadHistory(history.number + 1)" />
    </section>

    <section v-else-if="!result && !historyLoading && salesCount === 0" class="rounded-2xl border border-sage-border bg-white p-6" role="status">
      <h2 class="text-xl font-extrabold text-brand-dark">Nenhuma venda encontrada</h2>
      <p class="mt-2 text-sm leading-6 text-sage-muted">Não há vendas cadastradas para essa competência.</p>
    </section>

    <p v-else-if="!result && !historyLoading && !isClosedCompetence" class="rounded-2xl border border-sage-border bg-sage-light px-5 py-4 text-sm leading-6 text-sage-muted">
      Nenhum cálculo foi executado nesta sessão. Use o botão acima para iniciar o processamento.
    </p>

    <div v-if="showRecalculateConfirm && access.can('calculate')" class="fixed inset-0 !m-0 z-50 flex items-center justify-center bg-black/40 px-4" role="presentation" @click.self="showRecalculateConfirm = false">
      <section ref="recalculateDialog" tabindex="-1" class="w-full max-w-lg rounded-[22px] bg-white p-6 shadow-2xl outline-none sm:p-7" role="dialog" aria-modal="true" aria-labelledby="recalculate-confirm-title" @keydown="onRecalculateDialogKeydown">
        <h2 id="recalculate-confirm-title" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">Recalcular comissões?</h2>
        <p class="mt-3 text-sm leading-6 text-sage-muted">
          Serão usadas as regras atualmente cadastradas e aplicáveis às datas das vendas. Resultados anteriores bem-sucedidos serão substituídos; vendas impedidas manterão seus resultados anteriores no histórico.
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" class="focus-ring rounded-full border border-sage-border-dark px-5 py-3 text-sm font-bold text-brand-dark" @click="showRecalculateConfirm = false">
            Cancelar
          </button>
          <button type="button" class="focus-ring rounded-full bg-brand px-5 py-3 text-sm font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-60" :disabled="!canCalculate" @click="confirmRecalculation">
            Confirmar recálculo
          </button>
        </div>
      </section>
    </div>

    <!-- Modal de Fechamento Definitivo ([FRONT-10]) -->
    <CompetenceClosingModal
      :open="isClosingModalOpen"
      :competencia="competenceKey"
      :is-submitting="isSubmittingClosing"
      :current-user="currentUserIdentifier"
      :preview-totals="previewTotals"
      @confirm="handleConfirmClosing"
      @cancel="isClosingModalOpen = false"
    />
  </div>
</template>

<script setup>
import { useAccessPolicy } from '@/services/useAccessPolicy'
const access = useAccessPolicy()
import { computed, defineComponent, h, onBeforeUnmount, ref, watch } from 'vue'
import { useDialogFocus } from '@/services/dialogFocus'
import { useRoute, useRouter } from 'vue-router'
import { RefreshCw, FileSpreadsheet } from 'lucide-vue-next'
import PageHeader from '@/components/common/PageHeader.vue'
import StatusBadge from '@/components/common/StatusBadge.vue'
import CompetenceClosingModal from '@/components/competence/CompetenceClosingModal.vue'
import CompetenceClosingStatusCard from '@/components/competence/CompetenceClosingStatusCard.vue'
import CommissionReportCollaboratorTab from '@/components/calculation/CommissionReportCollaboratorTab.vue'
import CommissionReportRuleTab from '@/components/calculation/CommissionReportRuleTab.vue'
import CommissionReportExportDropdown from '@/components/calculation/CommissionReportExportDropdown.vue'
import {
  getConsolidatedReport,
  exportReportCsv,
  isCompetenceClosed,
  mergeCollaboratorReport
} from '@/services/commissionReportApi'
import { ASYNC_EXECUTION_STATES, formatExecutionStateLabel, executionStateTone } from '@/services/asyncExecutionService'
import { dataService } from '@/services/dataService'
import { calculationService } from '@/services/calculationService'
import { readCalculationCache } from '@/services/calculationCache'
import { CALCULATION_OPERATION, SALES_QUERY_STATE, hasPreviousCalculation as hasPreviousCalculationValue, isCalculationReady, operationToRecalculate } from '@/services/calculationFlow'
import { formatCompetenceCode, formatCompetenceLabel, getCompetenceDateRange, normalizeCompetence } from '@/services/competenceUtils'
import { filterCadastralImpediments, groupCoverageImpediments, isCoverageImpediment } from '@/services/coverageService'
import MissingBasesCard from '@/components/data/MissingBasesCard.vue'
import { useCalculationStore } from '@/stores/calculationStore'
import { useDataStore } from '@/stores/dataStore'
import { useAccountStore } from '@/stores/accountStore'
import {
  getClosingStatus,
  executeClosing,
  downloadClosingProof,
  saveClosingToSession,
  getClosingFromSession
} from '@/services/closingService'

const PaginationControls = defineComponent({
  props: { page: { type: Number, required: true }, totalPages: { type: Number, required: true } },
  emits: ['previous', 'next'],
  setup(props, { emit }) {
    return () => props.totalPages > 1
      ? h('div', { class: 'mt-5 flex items-center justify-between gap-4 border-t border-sage-border-light pt-4' }, [
        h('button', { type: 'button', class: 'focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-50', disabled: props.page <= 0, onClick: () => emit('previous') }, 'Anterior'),
        h('span', { class: 'text-xs font-semibold text-sage-muted' }, `Página ${props.page + 1} de ${props.totalPages}`),
        h('button', { type: 'button', class: 'focus-ring rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-50', disabled: props.page >= props.totalPages - 1, onClick: () => emit('next') }, 'Próxima')
      ])
      : null
  }
})

const route = useRoute()
const router = useRouter()
const calculationStore = useCalculationStore()
const dataStore = useDataStore()
const competenceKey = computed(() => normalizeCompetence(route.params.competencia))
const salesCount = ref(null)
const result = ref(null)
const lastOperation = ref(CALCULATION_OPERATION.NORMAL)
const restoredResult = ref(null)
const showRecalculateConfirm = ref(false)
// FRONT-14: o diálogo de recálculo não recebia foco nem fechava com Esc.
const recalculateDialog = ref(null)
const { onDialogKeydown: onRecalculateDialogKeydown } = useDialogFocus(recalculateDialog, () => showRecalculateConfirm.value, { onClose: () => { showRecalculateConfirm.value = false } })
const salesQueryState = ref(SALES_QUERY_STATE.IDLE)
const salesQueryError = ref('')
const historyLoading = ref(false)
const historyError = ref('')
const history = ref({ content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true })
const matriculaFilter = ref('')
const originFilter = ref('')
const resultPage = ref(0)
const resultPageSize = 10
const competenceGeneration = ref(0)
const salesQueryRequestId = ref(0)
const historyRequestId = ref(0)

const accountStore = useAccountStore()
const closingStatusData = ref({ status: 'ABERTA', bloqueada: false })
const isCheckingClosingStatus = ref(false)
const isClosingModalOpen = ref(false)
const isSubmittingClosing = ref(false)
const closingResponseData = ref(null)
const proofDownloaded = ref(false)
const divergenceWarning = ref(null)
const lostResponseWarning = ref(false)
const previewTotals = ref(null)
const backupPreviewImpediments = ref([])
let closingPollingTimer = null
let closingPollingCounter = 0

const activeReportTab = ref('colaboradores')
const reportData = ref(null)
const isLoadingReport = ref(false)
const reportError = ref(null)
const isExportingCsv = ref(false)

const isClosedCompetence = computed(() => isCompetenceClosed(closingStatusData.value))

const effectiveClosingStatusData = computed(() => {
  if (!closingStatusData.value) return null
  const base = { ...closingStatusData.value }
  if (isCompetenceClosed(base) && reportData.value) {
    const totalComissaoRegras = (reportData.value.totaisPorRegra || reportData.value.porRegra || [])
      .reduce((sum, r) => sum + (Number(r.comissaoGerada ?? r.valorTotalComissao) || 0), 0)
    const totalComissaoColabs = (reportData.value.porColaborador || reportData.value.totaisPorColaborador || [])
      .reduce((sum, c) => sum + (Number(c.valorTotalComissao ?? c.valorTotalAPagar) || 0), 0)
    const totalComissaoReport = Number(reportData.value.valorTotalComissao) || totalComissaoRegras || totalComissaoColabs

    if (totalComissaoReport > 0) {
      base.valorTotalComissao = totalComissaoReport
    }

    const totalVendasRegras = (reportData.value.totaisPorRegra || reportData.value.porRegra || [])
      .reduce((sum, r) => sum + (Number(r.vendasComputadas ?? r.quantidadeVendas) || 0), 0)
    const totalVendasColabs = (reportData.value.porColaborador || reportData.value.totaisPorColaborador || [])
      .reduce((sum, c) => sum + (Number(c.quantidadeVendas) || 0), 0)
    const totalVendasReport = totalVendasRegras || totalVendasColabs

    if (!base.totalVendasProcessadas && totalVendasReport > 0) {
      base.totalVendasProcessadas = totalVendasReport
    }
    if (!base.totalCalculados && totalVendasReport > 0) {
      base.totalCalculados = totalVendasReport
    }
  }
  return base
})

const collaboratorRows = computed(() => {
  return mergeCollaboratorReport(
    reportData.value?.totaisPorColaborador,
    reportData.value?.porColaborador
  )
})

const ruleRows = computed(() => {
  return reportData.value?.totaisPorRegra || reportData.value?.porRegra || []
})

const totalGeraisComissao = computed(() => {
  return reportData.value?.valorTotalComissao ?? closingStatusData.value?.valorTotalComissao ?? result.value?.valorTotalComissao ?? 0
})

watch(isClosedCompetence, (closed) => {
  if (closed) {
    if (activeReportTab.value === 'vendas' && !result.value?.resultados?.length) {
      activeReportTab.value = 'colaboradores'
    }
  } else if (!closed && !['vendas', 'impedimentos'].includes(activeReportTab.value)) {
    if (result.value?.resultados?.length) {
      activeReportTab.value = 'vendas'
    }
  }
})

const currentUserIdentifier = computed(() => {
  return accountStore.user?.email || accountStore.user?.nome || accountStore.user?.name || ''
})

const canExecuteClosing = computed(() => {
  return (access.can('calculate') || accountStore.isAdmin || accountStore.isManager) &&
    closingStatusData.value.status !== 'PROCESSANDO' &&
    closingStatusData.value.status !== 'CONCLUIDO' &&
    Boolean(currentUserIdentifier.value)
})

watch(result, (newResult) => {
  if (newResult) {
    previewTotals.value = {
      totalVendasProcessadas: newResult.totalVendasProcessadas ?? 0,
      totalCalculados: newResult.totalCalculados ?? 0,
      totalImpedimentos: newResult.totalImpedimentos ?? 0,
      valorTotalVendas: newResult.valorTotalVendas,
      valorTotalComissao: newResult.valorTotalComissao
    }
    backupPreviewImpediments.value = [...(newResult.impedimentos || [])]
  }
}, { immediate: true })

const coverageGroups = computed(() =>
  groupCoverageImpediments(result.value?.impedimentos || [], competenceKey.value)
)
const cadastralImpediments = computed(() =>
  filterCadastralImpediments(result.value?.impedimentos || [])
)
const coverageSales = computed(() =>
  (result.value?.impedimentos || []).filter((item) => isCoverageImpediment(item.motivo))
)

const summaryItems = computed(() => [
  { label: 'Vendas processadas', value: result.value?.totalVendasProcessadas ?? 0 },
  { label: 'Calculadas com sucesso', value: result.value?.totalCalculados ?? 0 },
  { label: 'Com impedimento', value: result.value?.totalImpedimentos ?? 0 },
  { label: 'Valor das vendas calculadas', value: currency(result.value?.valorTotalVendas) },
  { label: 'Total de comissões', value: currency(result.value?.valorTotalComissao) }
])

const originOptions = computed(() => [...new Set((result.value?.resultados || []).map((item) => item.origemTaxa).filter(Boolean))])
const filteredResults = computed(() => (result.value?.resultados || []).filter((item) => {
  const registration = String(item.matricula || '').toLocaleLowerCase()
  const matchesRegistration = !matriculaFilter.value || registration.includes(matriculaFilter.value.toLocaleLowerCase())
  const matchesOrigin = !originFilter.value || item.origemTaxa === originFilter.value
  return matchesRegistration && matchesOrigin
}))
const resultTotalPages = computed(() => Math.max(1, Math.ceil(filteredResults.value.length / resultPageSize)))
const paginatedResults = computed(() => filteredResults.value.slice(resultPage.value * resultPageSize, (resultPage.value + 1) * resultPageSize))
const isCalculating = computed(() => calculationStore.isProcessing && calculationStore.competencia === competenceKey.value)
const recalculationRequested = computed(() => isCalculating.value && calculationStore.tipoOperacao === CALCULATION_OPERATION.RECALCULO)
const anotherCalculationProcessing = computed(() => calculationStore.isProcessing && calculationStore.competencia && calculationStore.competencia !== competenceKey.value)
const calculationErrorMessage = computed(() => calculationStore.competencia === competenceKey.value ? calculationStore.mensagemErro : '')
const previousResultAfterFailure = computed(() => calculationStore.competencia === competenceKey.value && calculationStore.hasError && Boolean(result.value))
const canCalculate = computed(() => access.can('calculate') && isCalculationReady({
  competencia: competenceKey.value,
  consultaVendas: salesQueryState.value,
  vendasEncontradas: salesCount.value,
  historicoConsultando: historyLoading.value,
  historicoComErro: Boolean(historyError.value),
  calculando: calculationStore.isProcessing
}))
const activeExecutionForThisCompetence = computed(() =>
  calculationStore.competencia === competenceKey.value &&
  (calculationStore.asyncStatus === ASYNC_EXECUTION_STATES.AGUARDANDO ||
   calculationStore.asyncStatus === ASYNC_EXECUTION_STATES.PROCESSANDO ||
   calculationStore.asyncStatus === ASYNC_EXECUTION_STATES.ACOMPANHAMENTO_PAUSADO)
)

const currentAsyncStatusLabel = computed(() =>
  formatExecutionStateLabel(calculationStore.asyncStatus || (isCalculating.value ? ASYNC_EXECUTION_STATES.PROCESSANDO : ASYNC_EXECUTION_STATES.IDLE))
)

const currentAsyncStatusTone = computed(() =>
  executionStateTone(calculationStore.asyncStatus || (isCalculating.value ? ASYNC_EXECUTION_STATES.PROCESSANDO : ASYNC_EXECUTION_STATES.IDLE))
)

const hasPreviousCalculation = computed(() => hasPreviousCalculationState())

watch(competenceKey, () => {
  loadCompetence()
}, { immediate: true })

watch([matriculaFilter, originFilter], () => {
  resultPage.value = 0
})

async function loadCompetence() {
  stopClosingPolling()
  calculationStore.recoverExecution(competenceKey.value)
  const generation = competenceGeneration.value + 1
  competenceGeneration.value = generation
  salesQueryRequestId.value += 1
  historyRequestId.value += 1
  result.value = null
  restoredResult.value = null
  salesCount.value = null
  salesQueryError.value = ''
  salesQueryState.value = SALES_QUERY_STATE.IDLE
  historyError.value = ''
  historyLoading.value = false
  history.value = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true }
  matriculaFilter.value = ''
  originFilter.value = ''
  resultPage.value = 0
  showRecalculateConfirm.value = false
  lastOperation.value = CALCULATION_OPERATION.NORMAL
  closingStatusData.value = { status: 'ABERTA', bloqueada: false }
  divergenceWarning.value = null
  lostResponseWarning.value = false
  closingResponseData.value = null
  proofDownloaded.value = false
  reportData.value = null
  reportError.value = null

  if (!competenceKey.value) return

  const sessionClosing = getClosingFromSession()
  if (sessionClosing && sessionClosing.competencia === competenceKey.value) {
    closingResponseData.value = sessionClosing
  }

  const hasSharedCalculationState = syncCalculationStoreState(competenceKey.value)
  if (!hasSharedCalculationState) restoreSessionResult(competenceKey.value)
  await checkClosingStatus()
  if (isClosedCompetence.value) {
    await loadClosingReport(competenceKey.value)
  } else {
    await Promise.all([
      loadSalesCount(competenceKey.value, generation),
      loadHistory(0, competenceKey.value, generation)
    ])
  }
}

async function checkClosingStatus(manual = false) {
  if (!competenceKey.value) return
  if (manual) isCheckingClosingStatus.value = true
  try {
    const data = await getClosingStatus(competenceKey.value)
    closingStatusData.value = data
    if (data?.status === 'PROCESSANDO') {
      startClosingPolling()
    } else {
      stopClosingPolling()
      if (isCompetenceClosed(data) && !reportData.value) {
        void loadClosingReport(competenceKey.value)
      }
    }
  } catch (err) {
    if (err?.response?.status !== 403) {
      console.warn('Erro ao consultar status de fechamento:', err)
    }
  } finally {
    if (manual) isCheckingClosingStatus.value = false
  }
}

function startClosingPolling() {
  stopClosingPolling()
  closingPollingCounter = 0
  const poll = async () => {
    closingPollingCounter++
    try {
      const data = await getClosingStatus(competenceKey.value)
      closingStatusData.value = data
      if (data?.status !== 'PROCESSANDO') {
        stopClosingPolling()
        return
      }
    } catch (e) {
      // transient network error during polling
    }
    // Primeiros 60s (20 ciclos de 3s) a cada 3s; após 60s, a cada 15s sem desbloquear
    const delay = closingPollingCounter <= 20 ? 3000 : 15000
    closingPollingTimer = setTimeout(poll, delay)
  }
  closingPollingTimer = setTimeout(poll, 3000)
}

function stopClosingPolling() {
  if (closingPollingTimer) {
    clearTimeout(closingPollingTimer)
    closingPollingTimer = null
  }
}

function triggerRecalculateAndCheck() {
  showRecalculateConfirm.value = true
}

async function handleConfirmClosing({ motivo, executadoPor }) {
  isSubmittingClosing.value = true
  divergenceWarning.value = null
  lostResponseWarning.value = false
  try {
    const response = await executeClosing({
      competencia: competenceKey.value,
      executadoPor,
      motivo
    })
    closingResponseData.value = response
    proofDownloaded.value = false
    saveClosingToSession(response)

    // Comparar totais da prévia com os do fechamento usando centavos inteiros (evita imprecisão de ponto flutuante)
    if (previewTotals.value && response) {
      const prevTotalCents = Math.round((Number(previewTotals.value.valorTotalComissao) || 0) * 100)
      const closedTotalCents = Math.round((Number(response.valorTotalComissao) || 0) * 100)
      const prevVendas = Number(previewTotals.value.totalCalculados) || 0
      const closedVendas = Number(response.totalCalculados) || 0
      const hasFinancialPreview = previewTotals.value.valorTotalComissao !== null && previewTotals.value.valorTotalComissao !== undefined
      if ((hasFinancialPreview && prevTotalCents !== closedTotalCents) || prevVendas !== closedVendas) {
        divergenceWarning.value = `Os valores consolidados (R$ ${(closedTotalCents / 100).toFixed(2)}, ${closedVendas} vendas) diferem da prévia recalculada (${prevVendas} vendas${hasFinancialPreview ? `, R$ ${(prevTotalCents / 100).toFixed(2)}` : ''}). Verifique se regras ou vendas foram alteradas durante o processo.`
      }
    }

    closingStatusData.value = {
      status: 'CONCLUIDO',
      bloqueada: true,
      protocolo: response.protocolo,
      fechadoEm: response.concluidoEm,
      executadoPor: response.executadoPor,
      totalVendasProcessadas: response.totalVendasProcessadas,
      totalCalculados: response.totalCalculados,
      totalImpedimentos: response.totalImpedimentos,
      valorTotalVendas: response.valorTotalVendas,
      valorTotalComissao: response.valorTotalComissao
    }
    isClosingModalOpen.value = false

    activeReportTab.value = 'colaboradores'
    void loadClosingReport(competenceKey.value)

    handleDownloadProof()
  } catch (err) {
    if (err.isNetworkRecovery) {
      lostResponseWarning.value = true
      isClosingModalOpen.value = false
      if (err.recoveredStatus) {
        closingStatusData.value = err.recoveredStatus
        if (err.recoveredStatus.status === 'PROCESSANDO') {
          startClosingPolling()
        }
      }
    } else {
      alert(err.response?.data?.message || err.message || 'Falha ao executar fechamento.')
    }
  } finally {
    isSubmittingClosing.value = false
  }
}

function handleDownloadProof() {
  if (closingResponseData.value) {
    try {
      downloadClosingProof(closingResponseData.value)
      proofDownloaded.value = true
    } catch (e) {
      console.warn('Erro ao disparar download do comprovante:', e)
    }
  }
}

async function loadClosingReport(competencia = competenceKey.value) {
  if (!competencia || !isClosedCompetence.value) {
    reportData.value = null
    return
  }
  isLoadingReport.value = true
  reportError.value = null
  try {
    const data = await getConsolidatedReport(competencia)
    reportData.value = data
  } catch (err) {
    if (err?.response?.status !== 404 && err?.response?.status !== 400) {
      reportError.value = err?.response?.data?.message || err?.message || 'Não foi possível carregar os relatórios consolidados.'
      console.warn('Erro ao carregar relatório consolidado de fechamento:', err)
    }
  } finally {
    isLoadingReport.value = false
  }
}

async function handleExportReport(tipo) {
  if (!competenceKey.value) return
  isExportingCsv.value = true
  try {
    await exportReportCsv(competenceKey.value, tipo)
  } catch (err) {
    alert(err?.response?.data?.message || err?.message || 'Falha ao exportar relatório CSV.')
  } finally {
    isExportingCsv.value = false
  }
}

onBeforeUnmount(() => {
  stopClosingPolling()
})

function syncCalculationStoreState(expectedCompetence = competenceKey.value) {
  if (calculationStore.competencia !== expectedCompetence) return false

  lastOperation.value = calculationStore.tipoOperacao

  if (calculationStore.isProcessing || calculationStore.hasError) {
    result.value = null
    restoredResult.value = null
    return true
  }

  if (!calculationStore.resultado) return false

  result.value = calculationStore.resultado
  restoredResult.value = null
  return true
}

watch(
  () => [calculationStore.competencia, calculationStore.status, calculationStore.resultado, calculationStore.concluidoEm],
  () => {
    if (calculationStore.competencia !== competenceKey.value) return
    const synchronized = syncCalculationStoreState(competenceKey.value)
    if (synchronized && calculationStore.resultado && !calculationStore.isProcessing) {
      void loadHistory(0, competenceKey.value, competenceGeneration.value)
    }
  }
)

async function loadSalesCount(expectedCompetence = competenceKey.value, generation = competenceGeneration.value) {
  const requestId = salesQueryRequestId.value + 1
  salesQueryRequestId.value = requestId
  salesQueryState.value = SALES_QUERY_STATE.LOADING
  salesQueryError.value = ''

  try {
    const sales = await dataService.listAllSales()
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== salesQueryRequestId.value) return
    salesCount.value = sales.filter((sale) => sale?.saleDate?.slice(0, 7) === expectedCompetence).length
    salesQueryState.value = SALES_QUERY_STATE.SUCCESS
  } catch (error) {
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== salesQueryRequestId.value) return
    salesCount.value = null
    salesQueryState.value = SALES_QUERY_STATE.ERROR
    salesQueryError.value = error?.response?.data?.message || 'Não foi possível consultar as vendas persistidas desta competência.'
  }
}

async function retrySalesQuery() {
  if (!competenceKey.value || isCalculating.value) return
  await loadSalesCount(competenceKey.value, competenceGeneration.value)
}

async function loadHistory(page = 0, expectedCompetence = competenceKey.value, generation = competenceGeneration.value) {
  if (!expectedCompetence) return
  const requestId = historyRequestId.value + 1
  historyRequestId.value = requestId
  historyLoading.value = true
  historyError.value = ''
  try {
    const range = getCompetenceDateRange(expectedCompetence)
    const response = await calculationService.listLogs({ ...range, page })
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== historyRequestId.value) return
    history.value = response
  } catch (error) {
    if (generation !== competenceGeneration.value || expectedCompetence !== competenceKey.value || requestId !== historyRequestId.value) return
    history.value = { content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true }
    historyError.value = error?.response?.data?.message || 'Não foi possível consultar os logs desta competência.'
  } finally {
    if (generation === competenceGeneration.value && expectedCompetence === competenceKey.value && requestId === historyRequestId.value) {
      historyLoading.value = false
    }
  }
}

function hasPreviousCalculationState() {
  return hasPreviousCalculationValue({
    resultadoSessao: result.value,
    totalHistorico: history.value.totalElements
  })
}

function handleCalculation() {
  if (!canCalculate.value) return
  if (hasPreviousCalculation.value) {
    showRecalculateConfirm.value = true
    return
  }
  calculate(false)
}

function confirmRecalculation() {
  if (!canCalculate.value) return
  showRecalculateConfirm.value = false
  calculate(true)
}

function calculate(recalcular = false) {
  const shouldRecalculate = recalcular === true
  if (!canCalculate.value) return
  const expectedCompetence = competenceKey.value
  lastOperation.value = shouldRecalculate ? CALCULATION_OPERATION.RECALCULO : CALCULATION_OPERATION.NORMAL
  result.value = null
  restoredResult.value = null
  resultPage.value = 0
  void calculationStore.execute({
    competencia: expectedCompetence,
    recalcular: shouldRecalculate,
    onViewResult: () => openCalculation(expectedCompetence),
    onViewHistory: () => openCalculation(expectedCompetence)
  })
}

function retryLastOperation() {
  if (!canCalculate.value) return
  calculate(operationToRecalculate(lastOperation.value))
}

function handleMissingBasesRecalculate() {
  if (!canCalculate.value) return
  calculate(true)
}

watch(
  () => [dataStore.activeJob.status, dataStore.activeJob.modo],
  ([status, modo], [prevStatus]) => {
    if (modo === 'COMISS' && status === 'SUCCESS' && prevStatus === 'PROCESSING') {
      if (coverageGroups.value.length > 0 && canCalculate.value && !isCalculating.value) {
        calculate(true)
      }
    }
  }
)

function restoreSessionResult(expectedCompetence = competenceKey.value) {
  const cached = readCalculationCache(expectedCompetence)
  if (!cached) return
  result.value = cached.resultado
  restoredResult.value = cached
  lastOperation.value = cached.tipoOperacao
}

function openCalculation(expectedCompetence = competenceKey.value) {
  if (!expectedCompetence) return
  router.push({ name: 'dados-calculo', params: { competencia: expectedCompetence } })
}

function consultHistory() {
  if (!competenceKey.value) return
  void loadHistory(0, competenceKey.value, competenceGeneration.value)
}

function currency(value) {
  if (value == null || value === '') return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
}

function percent(value) {
  if (value === null || value === undefined || value === '') return 'Não informado'
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 4 }).format(Number(value))
}

function formatDate(value) {
  if (!value) return 'Não informada'
  const [year, month, day] = String(value).slice(0, 10).split('-')
  return year && month && day ? `${day}/${month}/${year}` : 'Não informada'
}

function formatDateTime(value) {
  if (!value) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function formatOrigin(origin) {
  return { REGRA_NEGOCIO: 'Regra de negócio', BASE_COMISS: 'Taxa base', PADRAO: 'Taxa padrão' }[origin] || origin || 'Não informada'
}

function shortId(value) {
  if (!value) return 'Não informado'
  const text = String(value)
  return text.length > 12 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text
}
</script>

<style scoped>
.campaign-control { @apply rounded-xl border border-sage-border bg-white px-3 py-2.5 text-sm text-brand-dark outline-none focus:border-sage-border-dark; }
</style>
