<template>
  <div class="space-y-6">
    <!-- 1. Seleção da Competência, Origem dos Dados e Período da Campanha ([FRONT-4]) -->
    <section class="rounded-[24px] border border-sage-border-light bg-white p-6 shadow-sm sm:p-7" aria-labelledby="simulation-heading">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <h2 id="simulation-heading" class="text-2xl font-black tracking-[-0.04em] text-brand-dark">
              Simulação da Campanha
            </h2>
            <StatusBadge
              v-if="simulation.accepted && !hasInvalidation"
              label="Simulação aceita"
              tone="success"
            />
            <StatusBadge
              v-else-if="hasInvalidation"
              label="Simulação desatualizada"
              tone="warning"
            />
            <StatusBadge
              v-else-if="simulation.status === 'CONCLUIDA'"
              label="Aguardando aceite"
              tone="neutral"
            />
          </div>
          <p class="mt-1.5 max-w-2xl text-sm leading-6 text-sage-muted">
            Selecione a competência de referência para recortar o público, auditar a base contratual e simular o impacto financeiro com projeção temporal.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="simulation.isLoadingCompetences || simulation.isRunning"
            @click="$emit('refresh-competences')"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': simulation.isLoadingCompetences }" aria-hidden="true" />
            <span>{{ simulation.isLoadingCompetences ? 'Atualizando…' : 'Atualizar competências' }}</span>
          </button>
          <RouterLink
            to="/dados"
            class="focus-ring inline-flex items-center gap-2 rounded-full border border-sage-border-dark px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
          >
            <Database class="h-3.5 w-3.5" aria-hidden="true" />
            <span>Gerenciar bases em Dados</span>
          </RouterLink>
        </div>
      </div>

      <!-- Seletor de Competência + Cards Dinâmicos de Contexto -->
      <div class="mt-6 grid gap-4 lg:grid-cols-12">
        <!-- Card 1: Seleção de Competência (5 colunas) -->
        <div class="rounded-2xl border border-sage-border-light bg-sage-light/80 p-5 flex flex-col justify-between lg:col-span-5">
          <div>
            <label
              for="simulation-competence-select"
              class="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-sage-muted"
            >
              <Database class="h-4 w-4 text-brand-dark" aria-hidden="true" />
              Competência de Referência
            </label>
            <div class="mt-2.5">
              <select
                id="simulation-competence-select"
                :value="simulation.selectedCompetencia"
                :disabled="simulation.isLoadingCompetences || simulation.isRunning || !competenceOptions.length"
                class="focus-ring w-full rounded-xl border border-sage-border-dark bg-white px-4 py-3 text-sm font-extrabold text-brand-dark shadow-sm transition hover:border-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                @change="$emit('select-competence', $event.target.value)"
              >
                <option v-if="!competenceOptions.length" value="">
                  Nenhuma competência cadastrada
                </option>
                <option
                  v-for="item in competenceOptions"
                  :key="item.competencia"
                  :value="item.competencia"
                >
                  {{ item.competencia }} — {{ item.label }} ({{ item.totalVendas }} vendas)
                </option>
              </select>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-xs text-sage-muted">
            <span class="inline-block h-2 w-2 rounded-full bg-success"></span>
            <span class="truncate">Origem auditada: Vendas, RH e Base Contratual</span>
          </div>
        </div>

        <!-- Card 2: Recorte do Público Auditado (4 colunas) -->
        <article class="rounded-2xl border border-sage-border-light bg-white p-5 shadow-sm lg:col-span-4 flex flex-col justify-between">
          <div class="flex items-center justify-between gap-2">
            <span class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
              <Users class="h-4 w-4 text-brand-dark" aria-hidden="true" />
              Público Recortado
            </span>
            <span
              v-if="referenceValidation"
              class="rounded-full bg-success-surface px-2.5 py-0.5 text-xs font-bold text-success-dark"
            >
              Auditado
            </span>
          </div>

          <div class="my-2">
            <div v-if="referenceValidation" class="flex items-baseline gap-2">
              <span class="text-3xl font-black tracking-[-0.03em] text-brand-dark">
                {{ referenceValidation.totalVendasRecortadas }}
              </span>
              <span class="text-xs text-sage-muted">
                de {{ referenceValidation.totalVendasCompetencia }} vendas na base
              </span>
            </div>
            <p v-else class="text-sm font-bold text-sage-muted">
              Aguardando seleção de competência…
            </p>
          </div>

          <p class="text-xs text-sage-muted">
            Vendas que atendem à marca, ao cargo e à loja selecionados, contadas uma única vez.
          </p>
        </article>

        <!-- Card 3: Vigência e Projeção (3 colunas) -->
        <article class="rounded-2xl border border-sage-border-light bg-white p-5 shadow-sm lg:col-span-3 flex flex-col justify-between">
          <div class="flex items-center justify-between gap-2">
            <span class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
              <Calendar class="h-4 w-4 text-brand-dark" aria-hidden="true" />
              Vigência da Campanha
            </span>
          </div>

          <div class="my-2">
            <p class="text-base font-extrabold text-brand-dark">
              {{ periodSummary }}
            </p>
            <p class="mt-0.5 text-xs text-sage-muted">
              <strong class="font-bold text-brand-dark">{{ durationDays }} dias</strong> · Fator {{ durationFactorText }}
            </p>
          </div>

          <p class="text-[11px] text-sage-muted">
            Projetado proporcionalmente pelo mês comercial de 30 dias.
          </p>
        </article>
      </div>
    </section>

    <!-- 2. Banner de Invalidação de Aceite ([FRONT-6]) -->
    <section
      v-if="hasInvalidation"
      class="rounded-[22px] border border-warning-border bg-warning-bg p-5 sm:p-6"
      role="alert"
      aria-labelledby="simulation-invalidated-heading"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3">
          <AlertTriangle class="mt-0.5 h-5 w-5 shrink-0 text-warning-dark" aria-hidden="true" />
          <div>
            <h3 id="simulation-invalidated-heading" class="text-base font-extrabold text-brand-dark">
              O aceite anterior foi retirado porque a proposta ou a base de referência mudou
            </h3>
            <ul class="mt-1.5 list-disc space-y-1 pl-5 text-xs leading-5 text-warning-dark">
              <li v-for="(reason, idx) in simulation.invalidationReasons" :key="idx">
                {{ userFacingText(reason) }}
              </li>
            </ul>
            <p class="mt-2 text-xs font-semibold text-brand-dark">
              Execute uma nova simulação para atualizar os resultados e liberar um novo aceite.
            </p>
          </div>
        </div>
        <button
          type="button"
          class="focus-ring shrink-0 self-start rounded-full bg-brand px-4 py-2 text-xs font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="!canRunSimulation || simulation.isRunning"
          @click="handleRunSimulation"
        >
          Executar nova simulação
        </button>
      </div>
    </section>

    <!-- 3. Impedimento: Base Contratual Ausente (tabela de comissões) ([FRONT-4]) -->
    <section
      v-if="isMissingBaseBlocked"
      class="rounded-[22px] border border-warning-border bg-white p-6 shadow-sm sm:p-7"
      aria-labelledby="simulation-blocked-heading"
      role="alert"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-warning-dark">
            <ShieldAlert class="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="simulation-blocked-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">
                Simulação Bloqueada: Base Contratual Ausente
              </h2>
              <StatusBadge label="Bloqueio Financeiro" tone="warning" />
            </div>
            <p class="mt-2 text-sm leading-6 text-sage-muted">
              {{ userFacingText(missingBaseMessage) }}
            </p>

            <div v-if="missingBasesList.length" class="mt-4 rounded-xl border border-sage-border-light bg-sage-light p-3.5">
              <p class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">
                Combinação sem cobertura contratual nas taxas contratuais cadastradas:
              </p>
              <ul class="mt-1.5 space-y-1 text-sm font-semibold text-brand-dark">
                <li v-for="(base, idx) in missingBasesList" :key="idx">
                  Marca: <span class="font-bold">{{ base.marca }}</span> · Cargo: <span class="font-bold">{{ base.cargo }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <RouterLink
          to="/dados"
          class="focus-ring inline-flex items-center gap-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover"
        >
          <UploadCloud class="h-4 w-4" aria-hidden="true" />
          <span>Ir para Gestão de Dados (Importar COMISS)</span>
        </RouterLink>
      </div>

      <div class="mt-6 flex items-start gap-3 rounded-2xl border border-sage-border-light bg-sage-light p-4 text-xs leading-5 text-sage-muted">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-warning-dark" aria-hidden="true" />
        <div>
          <strong class="font-bold text-brand-dark">Proteção contra taxas fictícias:</strong>
          Projeções numéricas e simulações foram bloqueadas para manter a governança orçamentária e a conformidade contábil. Nenhuma taxa simulada ou fictícia pode ser utilizada para contornar a ausência da tabela contratual oficial.
        </div>
      </div>
    </section>

    <!-- 4. Impedimento: Referência Insuficiente (0 vendas para o público) ([FRONT-4]) -->
    <section
      v-else-if="isInsufficientReference"
      class="rounded-[22px] border border-warning-border bg-white p-6 shadow-sm sm:p-7"
      aria-labelledby="simulation-insufficient-heading"
      role="alert"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-start gap-3.5">
          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-warning-bg text-warning-dark">
            <AlertTriangle class="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 id="simulation-insufficient-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">
                Referência insuficiente para o público da campanha
              </h2>
              <StatusBadge label="Referência insuficiente" tone="warning" />
            </div>
            <p class="mt-2 text-sm leading-6 text-sage-muted">
              {{ insufficientReferenceMessage }}
            </p>
            <div class="mt-4 rounded-xl border border-sage-border-light bg-sage-light p-3.5 text-xs leading-5 text-sage-muted">
              <strong class="font-bold text-brand-dark">Por que não exibimos R$ 0,00?</strong>
              A ausência de vendas para o público na competência selecionada indica falta de base histórica para estimar a campanha, e não um impacto financeiro nulo. Selecione outra competência cadastrada ou ajuste os filtros do público na etapa de Interpretação.
            </div>
          </div>
        </div>

        <button
          type="button"
          class="focus-ring shrink-0 self-start rounded-full border border-sage-border-dark px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-sage-light"
          @click="$emit('back-to-rules')"
        >
          ← Ajustar regras do público
        </button>
      </div>
    </section>

    <!-- 5. Outros Impedimentos de Validação (Vínculos RH / Empate de Especificidade) ([FRONT-4]) -->
    <section
      v-else-if="otherImpediments.length"
      class="rounded-[22px] border border-danger/30 bg-danger-bg p-6 sm:p-7"
      role="alert"
      aria-labelledby="simulation-impediments-heading"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 id="simulation-impediments-heading" class="text-xl font-extrabold text-danger-dark">
              Impedimentos identificados antes da execução
            </h2>
            <StatusBadge label="Ação necessária" tone="danger" />
          </div>
          <ul class="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-danger-dark">
            <li v-for="(imp, idx) in otherImpediments" :key="idx">
              {{ userFacingText(imp.message) }}
            </li>
          </ul>
        </div>
        <button
          type="button"
          class="focus-ring shrink-0 self-start rounded-full border border-danger/30 bg-white px-4 py-2 text-xs font-bold text-danger-dark"
          @click="$emit('back-to-rules')"
        >
          ← Voltar e revisar regras
        </button>
      </div>
    </section>

    <!-- 6. Painel de Validação Pronta + Solicitação e Acompanhamento Assíncrono ([FRONT-4]) -->
    <section
      v-if="!isMissingBaseBlocked && !isInsufficientReference && !otherImpediments.length"
      class="rounded-[22px] bg-white p-6 sm:p-7"
      aria-labelledby="simulation-execution-heading"
    >
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <h3 id="simulation-execution-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
              Conferência do público e simulação
            </h3>
            <StatusBadge
              v-if="simulation.isValidatingReference"
              label="Validando recorte…"
              tone="neutral"
            />
            <StatusBadge
              v-else-if="referenceValidation?.canExecute"
              label="Recorte validado"
              tone="success"
            />
          </div>
          <p class="mt-1 text-sm text-sage-muted">
            <template v-if="referenceValidation?.canExecute">
              <strong class="font-bold text-brand-dark">{{ referenceValidation.totalVendasRecortadas }}</strong> vendas conferidas, com vínculos de RH e taxas contratuais disponíveis.
            </template>
            <template v-else>
              Verificando vendas da competência, vínculos cadastrais e cobertura das bases de comissão…
            </template>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="run-simulation-btn"
            class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!canRunSimulation || simulation.isRunning || simulation.isValidatingReference"
            @click="handleRunSimulation"
          >
            <Play class="h-4 w-4" aria-hidden="true" />
            <span>
              {{
                simulation.isRunning
                  ? 'Processando simulação…'
                  : hasValidSimulationResult
                    ? 'Executar simulação novamente'
                    : 'Executar simulação'
              }}
            </span>
          </button>
        </div>
      </div>

      <!-- Aviso de sobreposição resolvida por especificidade -->
      <div
        v-if="referenceValidation?.overlapWarnings?.length"
        class="mt-4 rounded-2xl border border-sage-border-light bg-sage-light p-4 text-xs leading-5 text-sage-muted"
      >
        <p class="font-bold text-brand-dark">Sobreposição de regras resolvida automaticamente por especificidade:</p>
        <ul class="mt-1 list-disc space-y-1 pl-5">
          <li v-for="(warning, idx) in referenceValidation.overlapWarnings" :key="idx">
            {{ userFacingText(warning) }}
          </li>
        </ul>
      </div>

      <!-- Barra de Acompanhamento Assíncrono (ID, Estado, Progresso e Falhas) -->
      <div
        v-if="simulation.status || simulation.executionId || simulation.error"
        class="mt-5 rounded-2xl border border-sage-border-light bg-sage-light p-4"
        role="status"
        aria-live="polite"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-wrap items-center gap-2.5">
            <span class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">
              Acompanhamento da execução
            </span>

            <StatusBadge :label="executionStatusLabel" :tone="executionStatusTone" />
          </div>
          <span class="text-xs font-extrabold text-brand-dark">{{ simulation.progress || 0 }}%</span>
        </div>

        <div class="mt-3 h-2 overflow-hidden rounded-full bg-sage-pill">
          <div
            class="h-full rounded-full transition-all duration-200"
            :class="simulation.status === 'FALHOU' ? 'bg-danger' : 'bg-brand'"
            :style="{ width: `${Math.min(100, Math.max(0, simulation.progress || 0))}%` }"
          ></div>
        </div>

        <p v-if="simulation.stageMessage" class="mt-2 text-xs text-sage-muted">
          {{ userFacingText(simulation.stageMessage) }}
        </p>

        <div
          v-if="simulation.error"
          class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-xs text-danger-dark"
          role="alert"
        >
          <span>{{ userFacingText(simulation.error) }}</span>
          <button
            type="button"
            class="focus-ring rounded-full bg-danger px-3.5 py-1.5 text-xs font-bold text-white"
            @click="handleRunSimulation"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    </section>

    <!-- 7. Resultados da Simulação ([FRONT-5]): Totais, Cenários (80%, 120%, 150%), Tabela Paginada e Memória do Cálculo -->
    <template v-if="hasValidSimulationResult && !isMissingBaseBlocked && !isInsufficientReference">
      <!-- 7.1 HERO CARD EXECUTIVO: IMPACTO ORÇAMENTÁRIO DA PROPOSTA -->
      <section
        class="relative overflow-hidden rounded-[26px] bg-brand-dark text-white p-6 sm:p-8 shadow-xl"
        aria-labelledby="simulation-totals-heading"
      >
        <!-- Acentos de luz sutil no fundo (Glow Wise) -->
        <div class="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/15 blur-3xl" aria-hidden="true"></div>
        <div class="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-brand/10 blur-3xl" aria-hidden="true"></div>

        <div class="relative z-10">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <span class="grid h-8 w-8 place-items-center rounded-xl bg-brand text-brand-dark shadow-sm">
                <TrendingUp class="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
              </span>
              <div>
                <span class="text-xs font-bold uppercase tracking-[0.14em] text-sage-border">
                  Projeção Orçamentária da Campanha
                </span>
                <p class="text-[11px] text-sage-muted">Impacto total sobre o público recortado</p>
              </div>
            </div>

            <div class="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-sage-border backdrop-blur-sm">
              <Calendar class="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              <span>Vigência: <strong class="text-white">{{ simulationTotals.duracaoCampanhaDias }} dias</strong> (Fator {{ simulationTotals.fatorDuracaoTexto }})</span>
            </div>
          </div>

          <!-- Métrica Principal em Destaque: Diferença / Impacto Financeiro da Proposta -->
          <div class="mt-7 flex flex-wrap items-baseline gap-4 sm:gap-6">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.08em] text-sage-muted">
                Investimento Adicional Estimado (Impacto da Proposta)
              </p>
              <h3 id="simulation-totals-heading" class="mt-1 text-4xl sm:text-5xl font-black tracking-[-0.04em] text-white">
                {{ signedCurrency(simulationTotals.projetado.diferenca) }}
              </h3>
            </div>
            <div class="flex items-center gap-2 rounded-full bg-brand px-4 py-1.5 text-sm font-black text-brand-dark shadow-md">
              <span>{{ simulationTotals.projetado.diferenca >= 0 ? '▲ +' : '▼ ' }}{{ percent(simulationTotals.projetado.impactoPct) }}</span>
              <span class="text-xs font-bold opacity-80">vs. Base Contratual</span>
            </div>
          </div>

          <!-- 3 Sub-Cards Translúcidos de Indicadores Chave -->
          <div class="mt-8 grid gap-4 sm:grid-cols-3">
            <!-- Sub-Card 1: Volume de Vendas -->
            <div class="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5 backdrop-blur-sm transition hover:bg-white/[0.08]">
              <p class="text-xs font-medium uppercase tracking-[0.06em] text-sage-muted">Volume de Vendas Projetado</p>
              <p class="mt-2 text-2xl font-black text-white">
                {{ currency(simulationTotals.projetado.totalVendas) }}
              </p>
              <p class="mt-1 text-xs text-sage-border">
                {{ simulationTotals.totalVendasConsideradas }} vendas únicas consideradas
              </p>
            </div>

            <!-- Sub-Card 2: Comissão Base -->
            <div class="rounded-2xl border border-white/10 bg-white/[0.06] p-4 sm:p-5 backdrop-blur-sm transition hover:bg-white/[0.08]">
              <p class="text-xs font-medium uppercase tracking-[0.06em] text-sage-muted">Comissão Base (Sem Campanha)</p>
              <p class="mt-2 text-2xl font-black text-white">
                {{ currency(simulationTotals.projetado.comissaoBase) }}
              </p>
              <p class="mt-1 text-xs text-sage-border">
                Taxa contratual de referência
              </p>
            </div>

            <!-- Sub-Card 3: Comissão com a Campanha -->
            <div class="rounded-2xl border border-brand/40 bg-brand/[0.08] p-4 sm:p-5 backdrop-blur-sm transition hover:bg-brand/[0.12]">
              <p class="text-xs font-medium uppercase tracking-[0.06em] text-brand">Comissão Total com a Campanha</p>
              <p class="mt-2 text-2xl font-black text-brand">
                {{ currency(simulationTotals.projetado.comissaoProposta) }}
              </p>
              <p class="mt-1 text-xs text-brand/80">
                Aplicação das regras propostas
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 7.2 CENÁRIOS PROJETADOS DE SENSIBILIDADE (80%, 120%, 150%) -->
      <section class="rounded-[24px] border border-sage-border-light bg-white p-6 shadow-sm sm:p-7">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-block h-2 w-2 rounded-full bg-brand"></span>
              <h4 class="text-xl font-black tracking-[-0.03em] text-brand-dark">
                Análise de Sensibilidade Orçamentária
              </h4>
            </div>
            <p class="mt-1 text-sm text-sage-muted">
              Cenários de variação de vendas recalculados venda a venda antes da projeção temporal.
            </p>
          </div>
        </div>

        <div class="mt-6 grid gap-5 xl:grid-cols-3">
          <article
            v-for="scenario in projectedVariationCards"
            :key="scenario.key"
            class="flex flex-col justify-between rounded-2xl p-5 sm:p-6 transition hover:shadow-md"
            :class="[
              scenario.key === '80'
                ? 'border border-amber-200/80 bg-gradient-to-b from-amber-50/40 via-white to-white'
                : scenario.key === '120'
                  ? 'border-2 border-brand bg-gradient-to-b from-brand/[0.08] via-white to-white shadow-sm ring-1 ring-brand/30'
                  : 'border border-emerald-200 bg-gradient-to-b from-emerald-50/40 via-white to-white'
            ]"
          >
            <div>
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold"
                    :class="[
                      scenario.key === '80'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300/60'
                        : scenario.key === '120'
                          ? 'bg-brand text-brand-dark font-black'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300/60'
                    ]"
                  >
                    {{ scenario.key === '120' ? '★ ' : '' }}{{ scenario.percentage }} do volume
                  </span>
                  <h5 class="mt-2 text-lg font-black text-brand-dark">
                    {{
                      scenario.key === '80'
                        ? 'Cenário Conservador'
                        : scenario.key === '120'
                          ? 'Cenário Meta Esperada'
                          : 'Cenário Superação de Meta'
                    }}
                  </h5>
                  <p class="text-xs text-sage-muted">
                    {{
                      scenario.key === '80'
                        ? 'Desaceleração (-20% nas vendas)'
                        : scenario.key === '120'
                          ? 'Aceleração (+20% com o incentivo)'
                          : 'Crescimento máximo (+50%)'
                    }}
                  </p>
                </div>
              </div>

              <dl class="mt-5 space-y-2.5 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-xs text-sage-muted">Vendas Projetadas:</dt>
                  <dd class="font-extrabold text-brand-dark">{{ currency(scenario.sales) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-xs text-sage-muted">Comissão Base:</dt>
                  <dd class="font-medium text-brand-dark">{{ currency(scenario.withoutProposal) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-xs text-sage-muted">Comissão Proposta:</dt>
                  <dd class="font-bold text-brand-dark">{{ currency(scenario.withProposal) }}</dd>
                </div>
                <div class="flex justify-between gap-3 border-t border-sage-border-light pt-2.5">
                  <dt class="text-xs font-bold text-brand-dark">Impacto Financeiro (Δ):</dt>
                  <dd
                    class="font-black"
                    :class="scenario.impact >= 0 ? 'text-brand-dark' : 'text-danger-dark'"
                  >
                    {{ signedCurrency(scenario.impact) }}
                    <span class="ml-1 text-xs font-semibold text-sage-muted">
                      ({{ percent(scenario.impactPct) }})
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div class="mt-4 rounded-xl bg-sage-light/80 px-3.5 py-2 text-xs text-sage-muted">
              <span v-if="scenario.vendasQueMudaramDeFaixa > 0" class="font-bold text-brand-dark">
                {{ scenario.vendasQueMudaramDeFaixa }} venda(s) migraram de faixa monetária neste cenário.
              </span>
              <span v-else>
                Recálculo proporcional concluído sem alteração de faixa.
              </span>
            </div>
          </article>
        </div>

        <!-- Botão Retrátil para Premissas Técnicas e Totais Históricos (Accordion) -->
        <div class="mt-6 border-t border-sage-border-light pt-4">
          <button
            type="button"
            class="focus-ring inline-flex items-center gap-2 text-xs font-bold text-sage-muted transition hover:text-brand-dark"
            @click="showPremises = !showPremises"
          >
            <Info class="h-4 w-4 text-brand-dark" aria-hidden="true" />
            <span>{{ showPremises ? 'Ocultar premissas e comparação histórica' : 'Ver premissas de cálculo e comparação histórica da competência (100%)' }}</span>
            <ChevronUp v-if="showPremises" class="h-3.5 w-3.5" aria-hidden="true" />
            <ChevronDown v-else class="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <!-- Conteúdo expandido das premissas e comparativo histórico -->
          <div v-if="showPremises" class="mt-4 rounded-2xl border border-sage-border-light bg-sage-light/50 p-5 space-y-4">
            <div class="grid gap-4 lg:grid-cols-2">
              <article class="rounded-xl border border-sage-border-light bg-white p-4">
                <p class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">
                  Totais históricos na competência {{ simulationResult.competencia }} (30 dias)
                </p>
                <dl class="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs">
                  <div>
                    <dt class="text-sage-muted">Vendas históricas:</dt>
                    <dd class="font-bold text-brand-dark">{{ currency(simulationTotals.historico.totalVendas) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sage-muted">Comissão base histórica:</dt>
                    <dd class="font-bold text-brand-dark">{{ currency(simulationTotals.historico.comissaoBase) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sage-muted">Comissão proposta histórica:</dt>
                    <dd class="font-bold text-brand-dark">{{ currency(simulationTotals.historico.comissaoProposta) }}</dd>
                  </div>
                  <div>
                    <dt class="text-sage-muted">Diferença histórica:</dt>
                    <dd class="font-bold text-brand-dark">{{ signedCurrency(simulationTotals.historico.diferenca) }} ({{ percent(simulationTotals.historico.impactoPct) }})</dd>
                  </div>
                </dl>
              </article>

              <article class="rounded-xl border border-sage-border-light bg-white p-4 text-xs leading-5 text-sage-muted">
                <p class="font-bold uppercase tracking-[0.1em] text-brand-dark">Critérios e Premissas Auditáveis</p>
                <ul class="mt-2 list-disc space-y-1 pl-4">
                  <li><strong>Mês comercial:</strong> Projeção padronizada em 30 dias corridos (dias inclusivos ÷ 30).</li>
                  <li><strong>Arredondamento:</strong> Padrão bancário <code>HALF_UP</code> para duas casas decimais em cada comissão individual.</li>
                  <li><strong>Sobreposições:</strong> Resolvidas deterministricamente pela maior especificidade de filtros (matrícula &gt; loja &gt; cargo &gt; canal &gt; marca).</li>
                </ul>
              </article>
            </div>
          </div>
        </div>
      </section>

      <!-- 7.3 TABELA PAGINADA DE VENDAS DO PÚBLICO -->
      <section class="rounded-[24px] border border-sage-border-light bg-white p-6 shadow-sm sm:p-7" aria-labelledby="simulation-table-heading">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 id="simulation-table-heading" class="text-xl font-black tracking-[-0.03em] text-brand-dark">
              Vendas do Público Consideradas na Simulação
            </h3>
            <p class="mt-1 text-sm text-sage-muted">
              Exibindo {{ paginationInfo.startIndex }}–{{ paginationInfo.endIndex }} de
              <strong class="font-bold text-brand-dark">{{ paginationInfo.totalItems }}</strong> venda(s) únicas do recorte.
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <label for="simulation-page-size" class="font-bold text-sage-muted">Linhas por página:</label>
            <select
              id="simulation-page-size"
              :value="simulation.pageSize"
              class="focus-ring rounded-xl border border-sage-border-dark bg-white px-3 py-1.5 font-bold text-brand-dark shadow-sm"
              @change="$emit('change-page-size', Number($event.target.value))"
            >
              <option :value="5">5</option>
              <option :value="10">10</option>
              <option :value="20">20</option>
            </select>
          </div>
        </div>

        <div class="mt-5 overflow-x-auto rounded-2xl border border-sage-border-light">
          <table class="min-w-full divide-y divide-sage-border-light text-left text-sm">
            <thead class="bg-sage-light text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">
              <tr>
                <th scope="col" class="px-4 py-3.5">Matrícula / Colaborador</th>
                <th scope="col" class="px-4 py-3.5">Loja / Marca / Cargo</th>
                <th scope="col" class="px-4 py-3.5 text-right">Valor da Venda</th>
                <th scope="col" class="px-4 py-3.5 text-right">Comissão Base</th>
                <th scope="col" class="px-4 py-3.5 text-right">Comissão com a Campanha</th>
                <th scope="col" class="px-4 py-3.5 text-center">Memória</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sage-border-light bg-white">
              <tr
                v-for="row in paginatedRows"
                :key="row.saleId"
                class="transition hover:bg-sage-light/50"
              >
                <td class="whitespace-nowrap px-4 py-3.5 font-bold text-brand-dark">
                  {{ row.matricula }}
                  <span v-if="row.colaborador" class="block text-xs font-normal text-sage-muted">
                    {{ row.colaborador }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-brand-dark">
                  <div class="flex items-center gap-1.5">
                    <span class="rounded bg-sage-pill px-1.5 py-0.5 text-xs font-bold">Loja {{ row.loja }}</span>
                    <span class="rounded bg-sage-pill px-1.5 py-0.5 text-xs font-semibold text-sage-subtle">{{ row.marca }}</span>
                  </div>
                  <span class="block mt-1 text-xs text-sage-muted">
                    {{ row.cargo }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-right font-bold text-brand-dark">
                  {{ currency(row.valorVenda) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-right text-brand-dark">
                  <span class="font-medium">{{ currency(row.comissaoBase) }}</span>
                  <span class="block text-[11px] text-sage-muted">
                    Taxa {{ percent(row.taxaBasePct) }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-right font-black text-brand-dark">
                  <span>{{ currency(row.comissaoProposta) }}</span>
                  <div class="mt-0.5">
                    <span
                      class="inline-block rounded-md px-1.5 py-0.5 text-[11px] font-black"
                      :class="row.diferenca >= 0 ? 'bg-success-surface text-success-dark' : 'bg-danger-bg text-danger-dark'"
                    >
                      {{ signedCurrency(row.diferenca) }} (Taxa {{ percent(row.taxaPropostaPct) }})
                    </span>
                  </div>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-center">
                  <button
                    type="button"
                    class="focus-ring inline-flex items-center gap-1.5 rounded-full border border-sage-border-dark px-3 py-1.5 text-xs font-bold text-brand-dark shadow-sm transition hover:border-brand-dark hover:bg-sage-light"
                    @click="openMemoryModal(row)"
                  >
                    <FileText class="h-3.5 w-3.5 text-sage-subtle" aria-hidden="true" />
                    <span>Ver Memória</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginação da Tabela -->
        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-sage-muted">
          <span>
            Página <strong class="font-bold text-brand-dark">{{ paginationInfo.page }}</strong> de
            <strong class="font-bold text-brand-dark">{{ paginationInfo.totalPages }}</strong>
            · Totais refletem todo o recorte de {{ paginationInfo.totalItems }} vendas.
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="focus-ring rounded-full border border-sage-border-dark px-3.5 py-1.5 font-bold text-brand-dark shadow-sm transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!paginationInfo.hasPrev"
              @click="$emit('change-page', paginationInfo.page - 1)"
            >
              ← Anterior
            </button>
            <button
              type="button"
              class="focus-ring rounded-full border border-sage-border-dark px-3.5 py-1.5 font-bold text-brand-dark shadow-sm transition hover:bg-sage-light disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="!paginationInfo.hasNext"
              @click="$emit('change-page', paginationInfo.page + 1)"
            >
              Próxima →
            </button>
          </div>
        </div>

        <!-- 7.4 RODAPÉ DE DECISÃO DA SIMULAÇÃO ([FRONT-6]) -->
        <div class="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sage-border-light bg-sage-light/70 p-5">
          <div>
            <p class="text-sm font-black text-brand-dark">
              {{
                simulation.accepted && !hasInvalidation
                  ? 'Simulação aceita e vinculada à proposta atual.'
                  : 'Conferiu a memória de cálculo e os cenários projetados?'
              }}
            </p>
            <p class="mt-0.5 text-xs text-sage-muted">
              O aceite registra a competência {{ simulationResult.competencia }} e avança para a etapa final de Revisão.
            </p>
          </div>

          <div v-if="showDecisionActions" class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="focus-ring rounded-full border border-sage-border-dark bg-white px-4 py-2.5 text-xs font-bold text-brand-dark shadow-sm transition hover:bg-sage-light"
              @click="$emit('back-to-rules')"
            >
              ← Voltar e ajustar regras
            </button>
            <p v-if="simulation.accepted && !hasInvalidation" class="inline-flex items-center gap-2 text-sm font-bold text-success-dark" role="status"><CheckCircle2 class="h-4 w-4" aria-hidden="true" />Simulação aceita</p>
            <button v-else
              type="button"
              data-testid="accept-simulation-btn"
              class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-black text-brand-dark shadow-md transition hover:bg-brand-hover hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="simulation.isRunning || hasInvalidation"
              @click="$emit('accept-simulation')"
            >
              <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
              <span>
                Aceitar simulação e continuar →
              </span>
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- 8. Modal de Memória do Cálculo da Venda ([FRONT-5]) -->
    <div
      v-if="selectedRow"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calculation-memory-title"
      @click.self="closeMemoryModal"
      @keydown.esc.prevent.stop="closeMemoryModal" @keydown.tab="trapMemoryFocus"
    >
      <div ref="memoryPanel" class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-xl sm:p-7">
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-sage-border-light bg-white pb-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
              Memória do Cálculo Individual
            </p>
            <h3 id="calculation-memory-title" class="mt-1 text-xl font-extrabold text-brand-dark">
              Matrícula {{ selectedRow.matricula }}
            </h3>
          </div>
          <button
            type="button"
            class="focus-ring rounded-full border border-sage-border-dark px-3 py-1 text-xs font-bold text-brand-dark"
            ref="memoryClose" @click="closeMemoryModal"
          >
            Fechar
          </button>
        </div>

        <CampaignSimulationMemory :row="selectedRow" :simulation="simulationResult" class="mt-5" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { userFacingText } from '@/services/userFacingText'
import { computed, ref, nextTick } from 'vue'
import CampaignSimulationMemory from '@/components/campaigns/CampaignSimulationMemory.vue'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Info,
  Play,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
  UploadCloud,
  Users
} from 'lucide-vue-next'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatPeriodArrow } from '@/services/campaignMappers'
import { formatSimulationCurrency, formatSimulationPercent } from '@/services/campaignSimulation'
import { calculateCampaignDuration, paginateSimulationItems } from '@/services/campaignSimulationService'
import { checkProposalCoverage } from '@/services/coverageService'

const showPremises = ref(false)

const props = defineProps({
  showDecisionActions: { type: Boolean, default: true },
  demo: { type: Object, default: () => ({}) },
  serverPagination: { type: Object, default: null },
  form: { type: Object, default: () => ({}) },
  interpretation: { type: Object, default: () => ({}) },
  simulation: {
    type: Object,
    default: () => ({
      competences: [],
      selectedCompetencia: '',
      referenceValidation: null,
      status: '',
      progress: 0,
      stageMessage: '',
      isRunning: false,
      error: '',
      result: null,
      page: 1,
      pageSize: 10,
      accepted: false,
      invalidationReasons: []
    })
  }
})

const emit = defineEmits([
  'update-demo',
  'select-competence',
  'refresh-competences',
  'run-simulation',
  'accept-simulation',
  'change-page',
  'change-page-size',
  'back-to-rules'
])

const selectedRow = ref(null)

const coverageCheck = computed(() =>
  checkProposalCoverage({
    form: props.form,
    interpretation: props.interpretation
  })
)

const competenceOptions = computed(() =>
  Array.isArray(props.simulation?.competences) ? props.simulation.competences : []
)

const referenceValidation = computed(() => props.simulation?.referenceValidation || null)

const durationInfo = computed(() =>
  calculateCampaignDuration(props.form?.dataInicio, props.form?.dataFim)
)

const durationDays = computed(() => props.simulation.result?.diasInclusivos ?? durationInfo.value.dias)
const durationFactorText = computed(() => props.simulation.result?.fatorProjecao ?? durationInfo.value.fatorTexto)

const periodSummary = computed(() =>
  formatPeriodArrow(props.form?.dataInicio, props.form?.dataFim)
)

const dataOriginLabel = computed(() => {
  if (referenceValidation.value?.origemDados) {
    return referenceValidation.value.origemDados
  }
  const selected = competenceOptions.value.find(
    (item) => item.competencia === props.simulation?.selectedCompetencia
  )
  return selected?.origemDados || 'Base oficial cadastrada em Dados (Vendas + RH + Base Contratual)'
})

const missingBaseImpediment = computed(() =>
  (referenceValidation.value?.impediments || []).find((imp) => imp.code === 'MISSING_BASE_COVERAGE')
)

const isMissingBaseBlocked = computed(() =>
  Boolean(coverageCheck.value.isBlocked || missingBaseImpediment.value)
)

const missingBaseMessage = computed(() =>
  missingBaseImpediment.value?.message ||
  coverageCheck.value.mensagem ||
  'Esta proposta atinge um público sem base de comissão aplicável cadastrada em tb_basecomiss.'
)

const missingBasesList = computed(() => {
  if (referenceValidation.value?.missingBases?.length) {
    return referenceValidation.value.missingBases
  }
  return coverageCheck.value.missingBases || []
})

const insufficientReferenceImpediment = computed(() =>
  (referenceValidation.value?.impediments || []).find((imp) => imp.code === 'INSUFFICIENT_REFERENCE')
)

const isInsufficientReference = computed(() =>
  Boolean(!isMissingBaseBlocked.value && insufficientReferenceImpediment.value)
)

const insufficientReferenceMessage = computed(() =>
  insufficientReferenceImpediment.value?.message ||
  'Nenhuma venda na competência selecionada atende às regras do público desta campanha.'
)

const otherImpediments = computed(() =>
  (referenceValidation.value?.impediments || []).filter(
    (imp) => imp.code !== 'MISSING_BASE_COVERAGE' && imp.code !== 'INSUFFICIENT_REFERENCE'
  )
)

const canRunSimulation = computed(() =>
  Boolean(
    props.simulation?.selectedCompetencia &&
      !isMissingBaseBlocked.value &&
      !isInsufficientReference.value &&
      otherImpediments.value.length === 0 &&
      (referenceValidation.value ? referenceValidation.value.canExecute : true)
  )
)

const simulationResult = computed(() => props.simulation?.result || null)
const hasValidSimulationResult = computed(() =>
  Boolean(
    simulationResult.value &&
      Array.isArray(simulationResult.value.rows) &&
      simulationResult.value.rows.length > 0 &&
      simulationResult.value.competencia === props.simulation?.selectedCompetencia
  )
)

const simulationTotals = computed(() => simulationResult.value?.totals || {
  totalVendasConsideradas: 0,
  duracaoCampanhaDias: durationDays.value,
  fatorDuracaoTexto: durationFactorText.value,
  historico: { totalVendas: 0, comissaoBase: 0, comissaoProposta: 0, diferenca: 0, impactoPct: 0 },
  projetado: { totalVendas: 0, comissaoBase: 0, comissaoProposta: 0, diferenca: 0, impactoPct: 0 }
})

const projectedVariationCards = computed(() => {
  const scenarios = simulationResult.value?.scenarios || []
  const filtered = scenarios.filter((item) => ['80', '120', '150'].includes(String(item.key)))
  return filtered.length ? filtered : scenarios
})

const paginationInfo = computed(() =>
  props.serverPagination || paginateSimulationItems(
    simulationResult.value?.rows || [],
    props.simulation?.page || 1,
    props.simulation?.pageSize || 10
  )
)

const paginatedRows = computed(() => paginationInfo.value.items)

const hasInvalidation = computed(() =>
  Array.isArray(props.simulation?.invalidationReasons) &&
  props.simulation.invalidationReasons.length > 0
)

const executionStatusLabel = computed(() => {
  const status = props.simulation?.status
  if (status === 'AGUARDANDO') return 'Aguardando'
  if (status === 'PROCESSANDO') return 'Processando'
  if (status === 'CONCLUIDA') return 'Concluída'
  if (status === 'FALHOU') return 'Falhou'
  return 'Pronta'
})

const executionStatusTone = computed(() => {
  const status = props.simulation?.status
  if (status === 'CONCLUIDA') return 'success'
  if (status === 'FALHOU') return 'danger'
  if (status === 'AGUARDANDO' || status === 'PROCESSANDO') return 'warning'
  return 'neutral'
})

function handleRunSimulation() {
  if (!canRunSimulation.value) return
  emit('update-demo', 'simulationHasRun', true)
  emit('run-simulation')
}

const memoryPanel = ref(null), memoryClose = ref(null)
let previousMemoryFocus = null
async function openMemoryModal(row) {
  previousMemoryFocus = document.activeElement
  selectedRow.value = row
  await nextTick()
  memoryClose.value?.focus()
}

function closeMemoryModal() {
  selectedRow.value = null
  if (previousMemoryFocus?.isConnected) previousMemoryFocus.focus()
}
function trapMemoryFocus(event) {
  const controls = [...(memoryPanel.value?.querySelectorAll('button, summary, [href], [tabindex="0"]') || [])]
  if (!controls.length) return
  if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus() }
  else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
}

function currency(value) {
  return value == null ? 'Não informado' : formatSimulationCurrency(value)
}

function signedCurrency(value) {
  if (value == null) return 'Não informado'
  const numeric = Number(value)
  const formatted = formatSimulationCurrency(Math.abs(numeric))
  return numeric >= 0 ? `+${formatted}` : `-${formatted}`
}

function percent(value) {
  return value == null ? 'Não informado' : formatSimulationPercent(value)
}
</script>
