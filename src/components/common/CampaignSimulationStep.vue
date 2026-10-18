<template>
  <div class="space-y-5">
    <!-- 1. Seleção da Competência, Origem dos Dados e Período da Campanha ([FRONT-4]) -->
    <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="simulation-heading">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="flex flex-wrap items-center gap-2.5">
            <h2 id="simulation-heading" class="text-2xl font-extrabold tracking-[-0.04em] text-brand-dark">
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
          <p class="mt-2 max-w-3xl text-sm leading-6 text-sage-muted">
            Selecione exatamente uma competência já cadastrada em Dados para recortar o público da campanha, validar a cobertura contratual e simular o impacto real e projetado. Não é necessário realizar apuração prévia.
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

      <!-- Seletor de Competência + Cards de Origem e Período -->
      <div class="mt-6 grid gap-4 lg:grid-cols-3">
        <!-- Card 1: Seleção de Competência -->
        <div class="rounded-2xl border border-sage-border-light bg-sage-light p-4">
          <label
            for="simulation-competence-select"
            class="block text-xs font-bold uppercase tracking-[0.12em] text-sage-muted"
          >
            Competência de referência (única)
          </label>
          <div class="mt-2">
            <select
              id="simulation-competence-select"
              :value="simulation.selectedCompetencia"
              :disabled="simulation.isLoadingCompetences || simulation.isRunning || !competenceOptions.length"
              class="focus-ring w-full rounded-xl border border-sage-border-dark bg-white px-3.5 py-2.5 text-sm font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
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
          <p class="mt-2 text-xs leading-5 text-sage-muted">
            Sem upload exclusivo na simulação. Os dados vêm diretamente das importações cadastradas.
          </p>
        </div>

        <!-- Card 2: Origem dos Dados -->
        <article class="rounded-2xl border border-sage-border-light bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
            Origem dos dados utilizados
          </p>
          <p class="mt-2 text-sm font-extrabold text-brand-dark">
            {{ dataOriginLabel }}
          </p>
          <p class="mt-1.5 text-xs leading-5 text-sage-muted">
            <template v-if="referenceValidation">
              Competência <strong class="font-bold text-brand-dark">{{ referenceValidation.competencia }}</strong>:
              {{ referenceValidation.totalVendasCompetencia }} venda(s) na base ·
              <strong class="font-bold text-brand-dark">{{ referenceValidation.totalVendasRecortadas }}</strong> no recorte do público.
            </template>
            <template v-else>
              Selecione uma competência para inspecionar o volume de vendas e a cobertura contratual.
            </template>
          </p>
        </article>

        <!-- Card 3: Período e Duração da Campanha -->
        <article class="rounded-2xl border border-sage-border-light bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
            Período e duração da campanha
          </p>
          <p class="mt-2 text-sm font-extrabold text-brand-dark">
            {{ periodSummary }}
          </p>
          <p class="mt-1.5 text-xs leading-5 text-sage-muted">
            Duração considerada: <strong class="font-bold text-brand-dark">{{ durationDays }} dia(s) corridos</strong> (datas inicial e final inclusivas) ·
            Mês comercial de <strong class="font-bold text-brand-dark">30 dias</strong> (fator <strong class="font-bold text-brand-dark">{{ durationFactorText }}</strong>).
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
                {{ reason }}
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

    <!-- 3. Impedimento: Base Contratual Ausente (tb_basecomiss) ([FRONT-4]) -->
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
              {{ missingBaseMessage }}
            </p>

            <div v-if="missingBasesList.length" class="mt-4 rounded-xl border border-sage-border-light bg-sage-light p-3.5">
              <p class="text-xs font-bold uppercase tracking-[0.1em] text-sage-muted">
                Combinação sem cobertura contratual em tb_basecomiss:
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
              {{ imp.message }}
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
              Validação do recorte e execução assíncrona
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
              Foram validadas <strong class="font-bold text-brand-dark">{{ referenceValidation.totalVendasRecortadas }}</strong> venda(s) do público com vínculos de RH e cobertura contratual completa em <code class="font-bold text-brand-dark">tb_basecomiss</code>.
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
            {{ warning }}
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
            <code
              v-if="simulation.executionId"
              class="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-brand-dark"
            >
              ID: {{ simulation.executionId }}
            </code>
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
          {{ simulation.stageMessage }}
        </p>

        <div
          v-if="simulation.error"
          class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-xs text-danger-dark"
          role="alert"
        >
          <span>{{ simulation.error }}</span>
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
      <!-- Premissas Explícitas e Totais de Todo o Recorte -->
      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="simulation-totals-heading">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 id="simulation-totals-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
              Totais do recorte e projeção pela duração da campanha
            </h3>
            <p class="mt-1 text-sm text-sage-muted">
              Os totais abaixo consideram <strong class="font-bold text-brand-dark">todas as {{ simulationTotals.totalVendasConsideradas }} vendas do público da campanha</strong> (independentemente da página atual da tabela). Vendas fora do público não entram nos totais.
            </p>
          </div>
          <span class="rounded-full bg-sage-light px-3.5 py-1.5 text-xs font-bold text-brand-dark">
            Mês comercial: 30 dias · Fator: {{ simulationTotals.fatorDuracaoTexto }}
          </span>
        </div>

        <!-- Comparativo: Histórico (100% no mês de referência) vs Projetado na Duração -->
        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <!-- Card Totais Históricos (100% da competência) -->
          <article class="rounded-2xl border border-sage-border-light bg-sage-light p-5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
                Totais históricos na competência {{ simulationResult.competencia }} (30 dias)
              </p>
              <span class="rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                Base 100%
              </span>
            </div>
            <dl class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Vendas do público</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ currency(simulationTotals.historico.totalVendas) }}
                </dd>
              </div>
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Comissão base (sem campanha)</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ currency(simulationTotals.historico.comissaoBase) }}
                </dd>
              </div>
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Comissão com campanha proposta</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ currency(simulationTotals.historico.comissaoProposta) }}
                </dd>
              </div>
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Diferença histórica</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ signedCurrency(simulationTotals.historico.diferenca) }}
                  <span class="ml-1 text-xs font-semibold text-sage-muted">
                    ({{ percent(simulationTotals.historico.impactoPct) }})
                  </span>
                </dd>
              </div>
            </dl>
          </article>

          <!-- Card Totais Projetados pela Duração (dias / 30) -->
          <article class="rounded-2xl border-2 border-brand/60 bg-sage-light p-5">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
                Projeção para a vigência da campanha ({{ simulationTotals.duracaoCampanhaDias }} dias)
              </p>
              <span class="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-dark">
                Fator {{ simulationTotals.fatorDuracaoTexto }}
              </span>
            </div>
            <dl class="mt-4 grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Vendas projetadas no período</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ currency(simulationTotals.projetado.totalVendas) }}
                </dd>
              </div>
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Comissão base projetada</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ currency(simulationTotals.projetado.comissaoBase) }}
                </dd>
              </div>
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Comissão proposta projetada</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ currency(simulationTotals.projetado.comissaoProposta) }}
                </dd>
              </div>
              <div class="rounded-xl bg-white p-3.5">
                <dt class="text-xs text-sage-muted">Diferença projetada na campanha</dt>
                <dd class="mt-1 text-base font-extrabold text-brand-dark">
                  {{ signedCurrency(simulationTotals.projetado.diferenca) }}
                  <span class="ml-1 text-xs font-semibold text-sage-muted">
                    ({{ percent(simulationTotals.projetado.impactoPct) }})
                  </span>
                </dd>
              </div>
            </dl>
          </article>
        </div>

        <!-- Cards de Cenários Projetados (80%, 120% e 150%) ([FRONT-5]) -->
        <div class="mt-7">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h4 class="text-lg font-extrabold tracking-[-0.02em] text-brand-dark">
                Cenários projetados de variação de vendas (80%, 120% e 150%)
              </h4>
              <p class="mt-1 text-xs leading-5 text-sage-muted">
                <strong class="font-bold text-brand-dark">Premissa de variação uniforme:</strong>
                Cada venda do público tem seu valor multiplicado pelo percentual do cenário (`0,80`, `1,20` ou `1,50`), reavaliando faixa de valor e recalculando a comissão venda a venda antes da projeção pela duração ({{ simulationTotals.fatorDuracaoTexto }}).
              </p>
            </div>
          </div>

          <div class="mt-4 grid gap-4 xl:grid-cols-3">
            <article
              v-for="scenario in projectedVariationCards"
              :key="scenario.key"
              class="rounded-2xl border border-sage-border-light p-5"
              :class="scenario.key === '120' ? 'ring-2 ring-brand/50' : ''"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
                    {{ scenario.percentage }} do valor das vendas
                  </p>
                  <h5 class="mt-1.5 text-xl font-extrabold text-brand-dark">
                    {{ scenario.classification }}
                  </h5>
                </div>
                <span class="rounded-full bg-sage-light px-3 py-1 text-xs font-bold text-brand-dark">
                  {{ scenario.percentage }}
                </span>
              </div>

              <dl class="mt-5 space-y-2.5 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="text-sage-muted">Vendas projetadas ({{ simulationTotals.duracaoCampanhaDias }}d)</dt>
                  <dd class="font-bold text-brand-dark">{{ currency(scenario.sales) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-sage-muted">Comissão base projetada</dt>
                  <dd class="font-bold text-brand-dark">{{ currency(scenario.withoutProposal) }}</dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="text-sage-muted">Comissão com campanha</dt>
                  <dd class="font-bold text-brand-dark">{{ currency(scenario.withProposal) }}</dd>
                </div>
                <div class="flex justify-between gap-3 border-t border-sage-border-light pt-2.5">
                  <dt class="font-semibold text-brand-dark">Diferença (impacto)</dt>
                  <dd class="font-extrabold text-brand-dark">
                    {{ signedCurrency(scenario.impact) }} ({{ percent(scenario.impactPct) }})
                  </dd>
                </div>
              </dl>

              <div class="mt-4 rounded-xl bg-sage-light px-3 py-2 text-xs text-sage-muted">
                <span v-if="scenario.vendasQueMudaramDeFaixa > 0" class="font-semibold text-brand-dark">
                  {{ scenario.vendasQueMudaramDeFaixa }} venda(s) mudaram de faixa de valor neste cenário.
                </span>
                <span v-else>
                  Recálculo venda a venda concluído (mesma faixa de valor).
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- Tabela Paginada do Público Considerado + Memória do Cálculo ([FRONT-5]) -->
      <section class="rounded-[22px] bg-white p-6 sm:p-7" aria-labelledby="simulation-table-heading">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 id="simulation-table-heading" class="text-xl font-extrabold tracking-[-0.03em] text-brand-dark">
              Vendas do público consideradas na simulação
            </h3>
            <p class="mt-1 text-sm text-sage-muted">
              Exibindo {{ paginationInfo.startIndex }}–{{ paginationInfo.endIndex }} de
              <strong class="font-bold text-brand-dark">{{ paginationInfo.totalItems }}</strong> venda(s) únicas do recorte.
              Clique em <strong class="font-bold text-brand-dark">Detalhes</strong> para inspecionar a memória do cálculo.
            </p>
          </div>

          <div class="flex items-center gap-2 text-xs">
            <label for="simulation-page-size" class="font-bold text-sage-muted">Linhas por página:</label>
            <select
              id="simulation-page-size"
              :value="simulation.pageSize"
              class="focus-ring rounded-xl border border-sage-border-dark bg-white px-2.5 py-1.5 font-bold text-brand-dark"
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
                <th scope="col" class="px-4 py-3.5">Matrícula</th>
                <th scope="col" class="px-4 py-3.5">Loja</th>
                <th scope="col" class="px-4 py-3.5 text-right">Valor da venda</th>
                <th scope="col" class="px-4 py-3.5 text-right">Comissão base</th>
                <th scope="col" class="px-4 py-3.5 text-right">Comissão com campanha proposta</th>
                <th scope="col" class="px-4 py-3.5 text-center">Detalhes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sage-border-light bg-white">
              <tr
                v-for="row in paginatedRows"
                :key="row.saleId"
                class="transition hover:bg-sage-light/60"
              >
                <td class=" whitespace-nowrap px-4 py-3.5 font-bold text-brand-dark">
                  {{ row.matricula }}
                  <span v-if="row.colaborador" class="block text-xs font-normal text-sage-muted">
                    {{ row.colaborador }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-brand-dark">
                  Loja {{ row.loja }}
                  <span class="block text-xs text-sage-muted">
                    {{ row.marca }} · {{ row.cargo }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-right font-semibold text-brand-dark">
                  {{ currency(row.valorVenda) }}
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-right text-brand-dark">
                  {{ currency(row.comissaoBase) }}
                  <span class="block text-xs text-sage-muted">
                    Taxa {{ percent(row.taxaBasePct) }}
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-right font-bold text-brand-dark">
                  {{ currency(row.comissaoProposta) }}
                  <span class="block text-xs font-normal text-sage-muted">
                    Taxa {{ percent(row.taxaPropostaPct) }} ({{ signedCurrency(row.diferenca) }})
                  </span>
                </td>
                <td class="whitespace-nowrap px-4 py-3.5 text-center">
                  <button
                    type="button"
                    class="focus-ring inline-flex items-center gap-1.5 rounded-full border border-sage-border-dark px-3.5 py-1.5 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
                    @click="openMemoryModal(row)"
                  >
                    <FileText class="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Detalhes</span>
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
            · Os totais exibidos acima refletem todo o recorte ({{ paginationInfo.totalItems }} vendas).
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="focus-ring rounded-full border border-sage-border-dark px-3.5 py-1.5 font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!paginationInfo.hasPrev"
              @click="$emit('change-page', paginationInfo.page - 1)"
            >
              ← Anterior
            </button>
            <button
              type="button"
              class="focus-ring rounded-full border border-sage-border-dark px-3.5 py-1.5 font-bold text-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!paginationInfo.hasNext"
              @click="$emit('change-page', paginationInfo.page + 1)"
            >
              Próxima →
            </button>
          </div>
        </div>

        <!-- Rodapé de Decisão da Simulação ([FRONT-6]): Aceitar Simulação ou Voltar para Regras -->
        <div class="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sage-border-light bg-sage-light p-4">
          <div>
            <p class="text-sm font-extrabold text-brand-dark">
              {{
                simulation.accepted && !hasInvalidation
                  ? 'Simulação aceita e vinculada à proposta atual.'
                  : 'Conferiu a memória do cálculo e os cenários projetados?'
              }}
            </p>
            <p class="mt-0.5 text-xs text-sage-muted">
              O aceite registra a competência {{ simulationResult.competencia }} e preserva o resultado para a etapa de Revisão (sem ativar a campanha automaticamente).
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="focus-ring rounded-full border border-sage-border-dark bg-white px-4 py-2.5 text-xs font-bold text-brand-dark transition hover:bg-sage-light"
              @click="$emit('back-to-rules')"
            >
              ← Voltar e ajustar regras
            </button>
            <button
              type="button"
              data-testid="accept-simulation-btn"
              class="focus-ring inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="simulation.isRunning || hasInvalidation"
              @click="$emit('accept-simulation')"
            >
              <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
              <span>
                {{ simulation.accepted && !hasInvalidation ? 'Simulação aceita — Ir para revisão →' : 'Aceitar simulação e continuar →' }}
              </span>
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- 8. Modal de Memória do Cálculo da Venda ([FRONT-5]) -->
    <div
      v-if="selectedRow"
      class="fixed inset-0 z-50 flex items-center justify-center bg-brand-dark/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calculation-memory-title"
      @click.self="closeMemoryModal"
    >
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[22px] bg-white p-6 shadow-xl sm:p-7">
        <div class="flex items-start justify-between gap-4 border-b border-sage-border-light pb-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.12em] text-sage-muted">
              Memória do Cálculo Individual
            </p>
            <h3 id="calculation-memory-title" class="mt-1 text-xl font-extrabold text-brand-dark">
              Venda {{ selectedRow.memoriaCalculo.identificadorVenda }} · Matrícula {{ selectedRow.matricula }}
            </h3>
          </div>
          <button
            type="button"
            class="focus-ring rounded-full border border-sage-border-dark px-3 py-1 text-xs font-bold text-brand-dark"
            @click="closeMemoryModal"
          >
            Fechar
          </button>
        </div>

        <dl class="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
          <div class="rounded-2xl bg-sage-light p-3.5">
            <dt class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">1. Identificador e Data da Venda</dt>
            <dd class="mt-1 font-bold text-brand-dark">
              ID {{ selectedRow.memoriaCalculo.identificadorVenda }} · Data: {{ selectedRow.memoriaCalculo.dataVenda }}
            </dd>
            <dd class="mt-0.5 text-xs text-sage-muted">
              Loja {{ selectedRow.loja }} · Marca {{ selectedRow.marca }} · Cargo {{ selectedRow.cargo }}
            </dd>
          </div>

          <div class="rounded-2xl bg-sage-light p-3.5">
            <dt class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">2. Origem dos Dados Utilizados</dt>
            <dd class="mt-1 font-bold text-brand-dark">
              {{ selectedRow.memoriaCalculo.origemDados }}
            </dd>
          </div>

          <div class="rounded-2xl bg-sage-light p-3.5">
            <dt class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">3. Taxa Base e Documento de Origem</dt>
            <dd class="mt-1 font-bold text-brand-dark">
              Taxa base: {{ percent(selectedRow.memoriaCalculo.taxaBasePct) }}
            </dd>
            <dd class="mt-0.5 text-xs text-sage-muted">
              Origem: {{ selectedRow.memoriaCalculo.documentoOrigemBase }} (Competência {{ selectedRow.memoriaCalculo.competenciaOrigemBase }})
            </dd>
          </div>

          <div class="rounded-2xl bg-sage-light p-3.5">
            <dt class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">4. Regra da Campanha Aplicada</dt>
            <dd class="mt-1 font-bold text-brand-dark">
              {{ selectedRow.memoriaCalculo.regraAplicada }}
            </dd>
            <dd class="mt-0.5 text-xs text-sage-muted">
              {{
                selectedRow.memoriaCalculo.manteveRegraBase
                  ? 'Condição de valor não atingida — manteve a comissão base contratual.'
                  : 'Substituiu a taxa base pela taxa da regra vencedora da campanha.'
              }}
            </dd>
          </div>

          <div class="rounded-2xl bg-sage-light p-3.5">
            <dt class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">5. Condição / Faixa Satisfeita</dt>
            <dd class="mt-1 font-bold text-brand-dark">
              {{ selectedRow.memoriaCalculo.condicaoOuFaixaSatisfeita }}
            </dd>
            <dd class="mt-0.5 text-xs text-sage-muted">
              Especificidade dos filtros: {{ selectedRow.memoriaCalculo.scoreEspecificidade }} filtro(s) preenchido(s)
            </dd>
          </div>

          <div class="rounded-2xl bg-sage-light p-3.5">
            <dt class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">6. Taxa Final e Arredondamento</dt>
            <dd class="mt-1 font-bold text-brand-dark">
              Taxa final aplicada: {{ percent(selectedRow.memoriaCalculo.taxaFinalPct) }}
            </dd>
            <dd class="mt-0.5 text-xs text-sage-muted">
              {{ selectedRow.memoriaCalculo.criterioArredondamento }}
            </dd>
          </div>
        </dl>

        <div class="mt-4 rounded-2xl border border-sage-border-light bg-sage-light p-4">
          <p class="text-xs font-bold uppercase tracking-[0.08em] text-sage-muted">
            7. Demonstração e Diferença Financeira
          </p>
          <p class="mt-1 text-xs text-sage-muted">
            {{ selectedRow.memoriaCalculo.formulaCalculo }}
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
            <div class="rounded-xl bg-white p-3">
              <span class="block text-xs text-sage-muted">Valor da venda</span>
              <strong class="font-extrabold text-brand-dark">{{ currency(selectedRow.valorVenda) }}</strong>
            </div>
            <div class="rounded-xl bg-white p-3">
              <span class="block text-xs text-sage-muted">Comissão base</span>
              <strong class="font-extrabold text-brand-dark">{{ currency(selectedRow.comissaoBase) }}</strong>
            </div>
            <div class="rounded-xl bg-white p-3">
              <span class="block text-xs text-sage-muted">Comissão proposta</span>
              <strong class="font-extrabold text-brand-dark">{{ currency(selectedRow.comissaoProposta) }}</strong>
            </div>
            <div class="rounded-xl bg-white p-3">
              <span class="block text-xs text-sage-muted">Diferença</span>
              <strong class="font-extrabold text-brand-dark">{{ signedCurrency(selectedRow.diferenca) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { AlertTriangle, CheckCircle2, Database, FileText, Play, RefreshCw, ShieldAlert, UploadCloud } from 'lucide-vue-next'
import StatusBadge from '@/components/common/StatusBadge.vue'
import { formatPeriodArrow } from '@/services/campaignMappers'
import { formatSimulationCurrency, formatSimulationPercent } from '@/services/campaignSimulation'
import { calculateCampaignDuration, paginateSimulationItems } from '@/services/campaignSimulationService'
import { checkProposalCoverage } from '@/services/coverageService'

const props = defineProps({
  demo: { type: Object, required: true },
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

const durationDays = computed(() => durationInfo.value.dias)
const durationFactorText = computed(() => durationInfo.value.fatorTexto)

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
  paginateSimulationItems(
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

function openMemoryModal(row) {
  selectedRow.value = row
}

function closeMemoryModal() {
  selectedRow.value = null
}

function currency(value) {
  return formatSimulationCurrency(value)
}

function signedCurrency(value) {
  const numeric = Number(value || 0)
  const formatted = formatSimulationCurrency(Math.abs(numeric))
  return numeric >= 0 ? `+${formatted}` : `-${formatted}`
}

function percent(value) {
  return formatSimulationPercent(value)
}
</script>
