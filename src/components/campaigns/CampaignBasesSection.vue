<template>
  <section
    class="rounded-[24px] border border-sage-border-light bg-white p-6 shadow-sm sm:p-7 space-y-6"
    aria-labelledby="campaign-bases-heading"
  >
    <!-- Header: Título, Badge de Perfil e Seletor de Simulação de Papel (Apenas em DEV) -->
    <div class="flex flex-wrap items-start justify-between gap-4 border-b border-sage-border-light pb-5">
      <div>
        <div class="flex flex-wrap items-center gap-2.5">
          <h2 id="campaign-bases-heading" class="text-xl font-black tracking-[-0.03em] text-brand-dark flex items-center gap-2">
            <Database class="h-5 w-5 text-brand" aria-hidden="true" />
            Bases da Campanha (RH e Vendas)
          </h2>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-bold"
            :class="authStore.canUploadBases ? 'bg-success-surface text-success-dark border border-success/30' : 'bg-warning-bg text-warning-text border border-warning-border'"
          >
            Perfil: {{ authStore.currentUser?.nomePerfil || authStore.currentUser?.papel }}
          </span>
          <span
            v-if="!authStore.canUploadBases"
            class="rounded-full bg-sage-light px-2.5 py-0.5 text-xs font-semibold text-sage-muted"
          >
            Modo Somente Leitura
          </span>
        </div>
        <p class="mt-1 text-sm text-sage-muted max-w-2xl">
          Gerencie as bases de referência vinculadas à campanha. Associe bases consolidadas existentes para evitar duplicidade ou realize nova carga conjunta com diagnóstico auditado.
        </p>
      </div>

      <!-- Seletor Rápido de Perfil e Acesso à Área de Correção (Apenas visível em modo DEV) -->
      <div v-if="isDev" class="flex flex-wrap items-center gap-2 rounded-xl bg-sage-light/70 p-2 border border-sage-border">
        <label for="role-simulator-select" class="text-xs font-bold text-sage-muted flex items-center gap-1">
          <ShieldAlert class="h-3.5 w-3.5" />
          <span>Simular perfil:</span>
        </label>
        <select
          id="role-simulator-select"
          :value="authStore.currentUser?.papel"
          @change="authStore.setRole($event.target.value)"
          class="focus-ring rounded-lg border border-sage-border-dark bg-white px-2 py-1 text-xs font-bold text-brand-dark"
        >
          <option value="GERENTE_VENDAS">Gerente de Vendas (Permitido)</option>
          <option value="ADMINISTRADOR">Administrador (Permitido)</option>
          <option value="ANALISTA_NEGOCIOS">Analista de Negócios (Bloqueado)</option>
          <option value="ANALISTA_CODIGO">Analista de Código (Bloqueado)</option>
          <option value="AUDITOR">Auditor (Bloqueado)</option>
        </select>

        <button
          type="button"
          @click="alternarDemonstracaoPreparacao"
          class="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1 text-xs font-black text-brand-dark hover:bg-brand-hover shadow-sm transition"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          <span>{{ lotePreparacaoAtivo ? 'Fechar Área de Correção' : 'Área de Correção de Bases' }}</span>
        </button>
      </div>
    </div>

    <!-- 1. Alerta de Bases Corporativas Globais & Impacto em Outras Campanhas (BACK-5 / BACK-6) -->
    <div
      class="rounded-2xl border p-5"
      :class="impactAnalysis.possuiAtivas ? 'border-danger/30 bg-danger-bg/40' : 'border-brand/20 bg-brand-light/30'"
    >
      <div class="flex items-start gap-3">
        <Globe2
          class="h-5 w-5 mt-0.5 shrink-0"
          :class="impactAnalysis.possuiAtivas ? 'text-danger' : 'text-brand-dark'"
          aria-hidden="true"
        />
        <div class="flex-1 space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="text-sm font-extrabold text-brand-dark">
              Transparência de Bases Globais Corporativas
            </h3>
            <span
              v-if="impactAnalysis.totalOutrasAfetadas > 0"
              class="rounded-full px-2.5 py-0.5 text-xs font-bold"
              :class="impactAnalysis.possuiAtivas ? 'bg-danger text-white' : 'bg-warning-light text-warning-dark'"
            >
              {{ impactAnalysis.totalOutrasAfetadas }} outra(s) campanha(s) vinculada(s)
            </span>
          </div>
          <p class="text-xs leading-5 text-brand-dark/80">
            As bases de RH e Vendas possuem escopo corporativo e são compartilhadas entre todas as campanhas da mesma competência. Qualquer alteração ou nova carga na competência <strong>{{ impactAnalysis.competenciaFormatada }}</strong> reflete imediatamente em todo o sistema.
          </p>

          <!-- Lista de Campanhas Potencialmente Afetadas -->
          <div v-if="impactAnalysis.outrasCampanhas.length > 0" class="pt-2">
            <button
              type="button"
              @click="showAffectedList = !showAffectedList"
              class="focus-ring text-xs font-bold text-brand-dark hover:underline flex items-center gap-1.5"
            >
              <span>{{ showAffectedList ? 'Ocultar campanhas potencialmente afetadas' : 'Ver campanhas potencialmente afetadas' }}</span>
              <ChevronDown class="h-3.5 w-3.5 transition-transform" :class="{ 'rotate-180': showAffectedList }" />
            </button>

            <div v-if="showAffectedList" class="mt-3 overflow-hidden rounded-xl border border-sage-border bg-white shadow-sm">
              <table class="w-full text-left text-xs">
                <thead class="bg-sage-light text-sage-muted font-bold uppercase tracking-wider">
                  <tr>
                    <th class="p-2.5">Campanha</th>
                    <th class="p-2.5">Estado</th>
                    <th class="p-2.5">Vigência</th>
                    <th class="p-2.5">Risco / Impacto</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-sage-border-light">
                  <tr v-for="c in impactAnalysis.outrasCampanhas" :key="c.id" class="hover:bg-sage-light/40">
                    <td class="p-2.5 font-bold text-brand-dark">
                      {{ c.titulo }} <span class="text-sage-muted">#{{ c.id }}</span>
                    </td>
                    <td class="p-2.5">
                      <span
                        class="rounded px-2 py-0.5 font-bold"
                        :class="c.estado === 'ATIVA' ? 'bg-success-surface text-success-dark' : 'bg-sage-light text-sage-muted'"
                      >
                        {{ c.estado }}
                      </span>
                    </td>
                    <td class="p-2.5 text-sage-muted">{{ c.dataInicio }} a {{ c.dataFim }}</td>
                    <td class="p-2.5">
                      <span
                        class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                        :class="c.severidade === 'CRITICA' ? 'bg-danger-bg text-danger-dark' : 'bg-warning-bg text-warning-text'"
                      >
                        {{ c.riscoLabel }}: {{ c.motivoImpacto }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Seletor de Competência & Status de Base Consolidada Existente -->
    <div class="grid gap-4 md:grid-cols-12">
      <!-- Seletor de Competência (4 colunas) -->
      <div class="rounded-2xl border border-sage-border-light bg-sage-light/60 p-4 md:col-span-4 flex flex-col justify-between">
        <div>
          <label for="bases-competence-select" class="block text-xs font-bold uppercase tracking-wider text-sage-muted">
            Competência de Referência
          </label>
          <select
            id="bases-competence-select"
            :value="selectedCompetencia"
            @change="onCompetenceChange($event.target.value)"
            class="focus-ring mt-2 w-full rounded-xl border border-sage-border-dark bg-white px-3.5 py-2.5 text-sm font-extrabold text-brand-dark shadow-sm"
          >
            <option v-if="!competenceOptions.length" value="">Nenhuma competência encontrada</option>
            <option v-for="c in competenceOptions" :key="c.competencia" :value="c.competencia">
              {{ c.competencia }} — {{ c.label }}
            </option>
          </select>
        </div>
        <p class="mt-2 text-[11px] text-sage-muted">
          Seleciona o ciclo mensal para validar a cobertura e anexos da campanha.
        </p>
      </div>

      <!-- Card de Deduplicação: Base Consolidada Já Existente (8 colunas) -->
      <div
        class="rounded-2xl border p-4 md:col-span-8 flex flex-col justify-between"
        :class="baseExistente ? 'border-success/40 bg-success-surface/40' : 'border-sage-border-light bg-white'"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-sage-muted flex items-center gap-1.5">
              <CheckCircle2 v-if="baseExistente" class="h-4 w-4 text-success" />
              <Info v-else class="h-4 w-4 text-sage-muted" />
              Consolidação no Banco
            </span>
            <h4 class="mt-1 text-base font-extrabold text-brand-dark">
              {{ baseExistente ? 'Base Consolidada Disponível no Sistema' : 'Nenhuma Base Consolidada no Período' }}
            </h4>
            <p v-if="baseExistente" class="mt-1 text-xs text-brand-dark/80">
              A competência <strong>{{ selectedCompetenciaFormatada }}</strong> já possui <strong>{{ baseExistente.totalVendas }} vendas</strong> cadastradas com integridade de RH. Você pode associar esta base imediatamente sem upload duplicado.
            </p>
            <p v-else class="mt-1 text-xs text-sage-muted">
              Envie conjuntamente as planilhas de RH e Vendas para registrar esta competência no sistema.
            </p>
          </div>

          <span
            v-if="jaAnexadoNaCampanha"
            class="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand-dark border border-brand/30 shrink-0"
          >
            Já Vinculada à Campanha
          </span>
        </div>

        <!-- Botão de Ação: Associar Base Existente (Deduplicação de Cargas) -->
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <button
            v-if="baseExistente && !jaAnexadoNaCampanha"
            type="button"
            :disabled="!authStore.canModifyBases || isAssociating"
            @click="associarBaseExistente"
            class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-brand-dark transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            title="Associa a base já cadastrada à campanha sem novo upload"
          >
            <LinkIcon class="h-3.5 w-3.5" :class="{ 'animate-spin': isAssociating }" />
            <span>{{ isAssociating ? 'Associando...' : 'Associar Base Existente à Campanha' }}</span>
          </button>

          <span v-if="!authStore.canModifyBases && baseExistente && !jaAnexadoNaCampanha" class="text-xs text-danger font-semibold">
            Requer perfil de Gerente ou Administrador para associar bases.
          </span>
        </div>
      </div>
    </div>

    <!-- 3. Anexos de Base Ativos da Campanha (BACK-6) & Correção de Inconsistências (FRONT-5) -->
    <div v-if="anexosAtivos.length > 0" class="rounded-2xl border border-sage-border-light bg-sage-light/30 p-5 space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-sage-muted flex items-center gap-1.5">
          <Paperclip class="h-4 w-4 text-brand-dark" />
          Bases Anexadas a esta Campanha
        </h4>
        <span class="text-xs font-bold text-brand-dark">{{ anexosAtivos.length }} anexo(s) ativo(s)</span>
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <div
          v-for="anexo in anexosAtivos"
          :key="anexo.id || anexo.reportId"
          class="rounded-xl border border-sage-border bg-white p-3.5 shadow-sm flex flex-col justify-between gap-3"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-xs font-bold text-brand-dark truncate" :title="anexo.nomeArquivoOriginal">
                {{ anexo.nomeArquivoOriginal || `Lote #${anexo.reportId}` }}
              </p>
              <p class="text-[11px] text-sage-muted">
                Tipo: <strong>{{ anexo.tipoBase }}</strong> · Comp: <strong>{{ anexo.competencia || 'Global' }}</strong> · {{ anexo.linhasValidas }} linhas válidas
              </p>
              <p v-if="anexo.totalInconsistencias > 0" class="text-[11px] font-bold text-warning-text mt-0.5">
                {{ anexo.totalInconsistencias }} inconsistência(s) registrada(s)
              </p>
            </div>

            <button
              v-if="authStore.canModifyBases"
              type="button"
              @click="desanexarBase(anexo.id)"
              :disabled="isDetaching === anexo.id"
              class="focus-ring text-sage-muted hover:text-danger p-1 rounded-lg transition"
              title="Desanexar este lote da campanha"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <!-- Ação: Abrir Correção e Preparação do Lote -->
          <div class="pt-2 border-t border-sage-border-light flex items-center justify-between">
            <button
              type="button"
              @click="abrirPreparacaoLote(anexo.reportId)"
              :disabled="abrindoLote === anexo.reportId"
              class="focus-ring inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-dark hover:underline"
            >
              <SlidersHorizontal class="h-3.5 w-3.5 text-brand" :class="{ 'animate-spin': abrindoLote === anexo.reportId }" />
              <span>{{ abrindoLote === anexo.reportId ? 'Abrindo preparação...' : 'Auditar e Corrigir Linhas' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Área de Correção de Bases em Preparação (FRONT-5 / BACK-5) -->
    <CampaignPreparationTable
      v-if="lotePreparacaoAtivo"
      :campanha-id="campanhaId"
      :preparacao-id="lotePreparacaoAtivo.id"
      :batch="lotePreparacaoAtivo"
      @batch-committed="onBatchCommitted"
      @batch-discarded="lotePreparacaoAtivo = null"
      @batch-updated="carregarAnexos"
    />

    <!-- 5. Área de Upload Conjunto de RH e Vendas com Diagnóstico por Arquivo -->
    <div class="rounded-2xl border border-sage-border-light bg-white p-5 space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="text-base font-extrabold text-brand-dark flex items-center gap-2">
            <UploadCloud class="h-5 w-5 text-brand" />
            Envio Conjunto de Bases (RH + Vendas)
          </h3>
          <p class="text-xs text-sage-muted">
            Para novas competências ou atualização auditada. O RH é validado primeiro, assegurando integridade com as vendas.
          </p>
        </div>

        <span
          v-if="!authStore.canUploadBases"
          class="rounded-full bg-danger-bg px-3 py-1 text-xs font-bold text-danger-dark border border-danger/30"
        >
          Upload bloqueado para seu perfil
        </span>
      </div>

      <!-- Bloqueio de Acesso para Não-Gerentes / Não-Admins -->
      <div v-if="!authStore.canUploadBases" class="rounded-xl bg-warning-bg p-4 border border-warning-border">
        <div class="flex items-start gap-2.5 text-xs text-warning-text leading-5">
          <Lock class="h-4 w-4 mt-0.5 shrink-0 text-warning-dark" />
          <div>
            <strong>Acesso Restrito:</strong> O envio de novas bases de RH e Vendas é permitido exclusivamente a <strong>Gerente de Vendas</strong> e <strong>Administrador</strong>. Como seu perfil é <em>{{ authStore.currentUser?.nomePerfil }}</em>, as ações de upload permanecem desabilitadas para auditoria.
          </div>
        </div>
      </div>

      <!-- Formulário de Seleção de Arquivos -->
      <div class="grid gap-4 sm:grid-cols-2">
        <!-- Input Arquivo RH -->
        <div class="rounded-xl border border-dashed border-sage-border-dark p-4 bg-sage-light/20 flex flex-col justify-between">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-sage-muted">
              1. Planilha de RH / Colaboradores (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              :disabled="!authStore.canUploadBases || isUploading"
              @change="onRhFileSelect"
              class="mt-2.5 block w-full text-xs text-sage-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand file:text-brand-dark hover:file:bg-brand-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <p v-if="rhFile" class="mt-2 text-xs font-semibold text-brand-dark truncate">
            Selecionado: {{ rhFile.name }} ({{ formatFileSize(rhFile.size) }})
          </p>
        </div>

        <!-- Input Arquivo Vendas -->
        <div class="rounded-xl border border-dashed border-sage-border-dark p-4 bg-sage-light/20 flex flex-col justify-between">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-sage-muted">
              2. Planilha de Vendas (.xlsx)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              :disabled="!authStore.canUploadBases || isUploading"
              @change="onVendasFileSelect"
              class="mt-2.5 block w-full text-xs text-sage-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-brand file:text-brand-dark hover:file:bg-brand-hover cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <p v-if="vendasFile" class="mt-2 text-xs font-semibold text-brand-dark truncate">
            Selecionado: {{ vendasFile.name }} ({{ formatFileSize(vendasFile.size) }})
          </p>
        </div>
      </div>

      <!-- Sinalização de Competência Detectada a partir dos Arquivos -->
      <div
        v-if="competenciaDetectadaNosArquivos"
        class="rounded-xl border border-brand/30 bg-brand-light/40 p-3.5 flex items-center justify-between gap-3 text-xs text-brand-dark"
      >
        <div class="flex items-center gap-2.5">
          <Info class="h-4 w-4 text-brand-dark shrink-0" />
          <span>
            Competência identificada nas planilhas: <strong>{{ formatCompetenceLabel(competenciaDetectadaNosArquivos) }} ({{ formatCompetenceCode(competenciaDetectadaNosArquivos) }})</strong>.
            O envio será processado para este ciclo mensal.
          </span>
        </div>
        <span class="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-black uppercase text-brand-dark">
          Auto-alinhado
        </span>
      </div>

      <!-- Barra de Progresso com Etapas em Tempo Real -->
      <div v-if="isUploading" class="rounded-xl border border-brand/30 bg-brand-light/40 p-4 space-y-2">
        <div class="flex items-center justify-between text-xs font-extrabold text-brand-dark">
          <span class="flex items-center gap-2">
            <RefreshCw class="h-4 w-4 animate-spin text-brand-dark" />
            Processando Ciclo: {{ uploadStageMessage }}
          </span>
          <span>{{ uploadProgress }}%</span>
        </div>
        <div class="h-2 w-full overflow-hidden rounded-full bg-sage-border">
          <div class="h-full bg-brand transition-all duration-300" :style="{ width: `${uploadProgress}%` }" />
        </div>
      </div>

      <!-- Botão de Disparo do Envio -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          :disabled="!authStore.canUploadBases || !rhFile || !vendasFile || isUploading"
          @click="executarUploadCiclo"
          class="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-black text-brand-dark shadow-sm transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UploadCloud class="h-4 w-4" />
          <span>{{ isUploading ? 'Processando envio...' : 'Enviar Bases (RH + Vendas)' }}</span>
        </button>
      </div>

      <!-- Alerta de Falha de Associação com Botão de Recuperação (Crítico 4 do Review) -->
      <div v-if="pendenteAssociacaoLoteId" class="rounded-xl border border-warning-border bg-warning-bg p-4 flex flex-wrap items-center justify-between gap-3">
        <div class="max-w-xl">
          <p class="text-xs font-bold text-warning-text">Lote #{{ pendenteAssociacaoLoteId }} gerado com sucesso, mas a associação automática falhou.</p>
          <p v-if="mensagemFalhaAssociacao" class="text-[11px] text-danger font-semibold mt-0.5">
            Motivo do servidor: {{ mensagemFalhaAssociacao }}
          </p>
          <p class="text-[11px] text-sage-muted mt-0.5">Clique para tentar associar este lote à campanha agora sem reenviar os arquivos.</p>
        </div>
        <button
          type="button"
          @click="tentarAssociarLotePendente"
          :disabled="isAssociating"
          class="focus-ring rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-brand-dark hover:bg-brand-hover shrink-0"
        >
          {{ isAssociating ? 'Associando...' : 'Associar Lote à Campanha' }}
        </button>
      </div>

      <!-- Diagnóstico Detalhado Individual por Arquivo -->
      <div v-if="diagnosticoEnvio" class="pt-4 border-t border-sage-border-light space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold uppercase tracking-wider text-sage-muted flex items-center gap-1.5">
            <FileSpreadsheet class="h-4 w-4 text-brand-dark" />
            Diagnóstico do Processamento por Arquivo
          </h4>

          <button
            v-if="diagnosticoEnvio.reportId && authStore.canModifyBases"
            type="button"
            @click="abrirPreparacaoLote(diagnosticoEnvio.reportId)"
            class="text-xs font-bold text-brand-dark hover:underline flex items-center gap-1"
          >
            <SlidersHorizontal class="h-3.5 w-3.5 text-brand" />
            <span>Abrir preparação e corrigir inconsistências</span>
          </button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Card Diagnóstico RH -->
          <div
            class="rounded-xl border p-4 shadow-sm"
            :class="diagnosticoEnvio.rh?.status === 'CONCLUIDO' || diagnosticoEnvio.status === 'SUCESSO' ? 'border-success/40 bg-success-surface/30' : 'border-danger/40 bg-danger-bg/40'"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-brand-dark">Arquivo RH / Matrículas</span>
              <span
                class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                :class="diagnosticoEnvio.rh?.status === 'CONCLUIDO' || diagnosticoEnvio.status === 'SUCESSO' ? 'bg-success text-white' : 'bg-danger text-white'"
              >
                {{ diagnosticoEnvio.rh?.status || (diagnosticoEnvio.status === 'SUCESSO' ? 'CONCLUÍDO' : 'FALHOU') }}
              </span>
            </div>
            <p class="mt-2 text-xs font-bold text-brand-dark truncate">{{ rhFile?.name || diagnosticoEnvio.rh?.nomeArquivo || 'Base RH' }}</p>
            <div class="mt-2 text-xs text-sage-muted space-y-1">
              <p>Linhas processadas: <strong>{{ diagnosticoEnvio.rh?.totalLinhas || diagnosticoEnvio.totalLinhas || '—' }}</strong></p>
              <p v-if="diagnosticoEnvio.rh?.linhasValidas != null">Registros válidos: <strong>{{ diagnosticoEnvio.rh.linhasValidas }}</strong></p>
            </div>
          </div>

          <!-- Card Diagnóstico Vendas -->
          <div
            class="rounded-xl border p-4 shadow-sm"
            :class="diagnosticoEnvio.status === 'SUCESSO' ? 'border-success/40 bg-success-surface/30' : 'border-danger/40 bg-danger-bg/40'"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs font-extrabold text-brand-dark">Arquivo Vendas</span>
              <span
                class="rounded px-2 py-0.5 text-[10px] font-black uppercase"
                :class="diagnosticoEnvio.status === 'SUCESSO' ? 'bg-success text-white' : 'bg-danger text-white'"
              >
                {{ diagnosticoEnvio.status === 'SUCESSO' ? 'CONCLUÍDO' : 'FALHOU' }}
              </span>
            </div>
            <p class="mt-2 text-xs font-bold text-brand-dark truncate">{{ vendasFile?.name || diagnosticoEnvio.nomeArquivo || 'Base Vendas' }}</p>
            <div class="mt-2 text-xs text-sage-muted space-y-1">
              <p>Linhas processadas: <strong>{{ diagnosticoEnvio.totalLinhas || '—' }}</strong></p>
              <p v-if="diagnosticoEnvio.linhasValidas != null">Registros válidos: <strong>{{ diagnosticoEnvio.linhasValidas }}</strong></p>
              <p v-if="diagnosticoEnvio.inconsistencias?.length" class="text-danger font-semibold">
                {{ diagnosticoEnvio.inconsistencias.length }} inconsistência(s) encontrada(s)
              </p>
            </div>
          </div>
        </div>

        <!-- Inconsistências / Avisos Estruturais -->
        <div v-if="diagnosticoEnvio.inconsistencias?.length" class="rounded-xl border border-danger/30 bg-danger-bg/50 p-4">
          <p class="text-xs font-extrabold text-danger-dark mb-2">Inconsistências Relacionais Detectadas:</p>
          <ul class="list-disc pl-4 text-xs text-danger-dark space-y-1">
            <li v-for="(inc, i) in diagnosticoEnvio.inconsistencias" :key="i">
              {{ inc.motivo || inc.mensagem || inc }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import {
  Database,
  Globe2,
  CheckCircle2,
  Info,
  Link as LinkIcon,
  Trash2,
  UploadCloud,
  FileSpreadsheet,
  Lock,
  RefreshCw,
  ChevronDown,
  ShieldAlert,
  Paperclip,
  SlidersHorizontal
} from 'lucide-vue-next'
import { useSafeAuthStore } from '@/stores/authStore'
import { dataService } from '@/services/dataService'
import { campaignCoverageService } from '@/services/campaignCoverageService'
import { campaignPreparationService } from '@/services/campaignPreparationService'
import { findAffectedCampaigns } from '@/services/campaignBasesImpactService'
import {
  normalizeCompetence,
  formatCompetenceCode,
  extractCompetenceFromFileName,
  formatCompetenceLabel
} from '@/services/competenceUtils'
import CampaignPreparationTable from './CampaignPreparationTable.vue'

const isDev = Boolean(import.meta.env?.DEV)

const props = defineProps({
  campanhaId: { type: [Number, String], default: null },
  competencia: { type: String, default: '' },
  campaignsList: { type: Array, default: () => [] }
})

const emit = defineEmits(['competence-selected', 'base-associated', 'base-uploaded'])

const authStore = useSafeAuthStore()

const selectedCompetencia = ref(props.competencia || '')
const competenceOptions = ref([])
const campaigns = ref(props.campaignsList || [])
const anexosAtivos = ref([])
const showAffectedList = ref(false)

// Arquivos de Upload
const rhFile = ref(null)
const vendasFile = ref(null)
const isUploading = ref(false)
const uploadProgress = ref(0)
const uploadStageMessage = ref('')
const diagnosticoEnvio = ref(null)
const pendenteAssociacaoLoteId = ref(null)
const mensagemFalhaAssociacao = ref('')

const isAssociating = ref(false)
const isDetaching = ref(null)

// Auto-detecção de competência com base nas planilhas selecionadas
const competenciaDetectadaNosArquivos = computed(() => {
  const compVendas = vendasFile.value ? normalizeCompetence(extractCompetenceFromFileName(vendasFile.value.name)) : null
  const compRh = rhFile.value ? normalizeCompetence(extractCompetenceFromFileName(rhFile.value.name)) : null
  return compVendas || compRh || null
})

function verificarEAtualizarCompetenciaDetectada(file) {
  if (!file?.name) return
  const raw = extractCompetenceFromFileName(file.name)
  const norm = normalizeCompetence(raw)
  if (norm) {
    if (!competenceOptions.value.some((c) => c.competencia === norm)) {
      competenceOptions.value.push({
        competencia: norm,
        label: formatCompetenceLabel(norm)
      })
    }
    selectedCompetencia.value = norm
    emit('competence-selected', norm)
  }
}

function onRhFileSelect(event) {
  const file = event.target.files?.[0] || null
  rhFile.value = file
  verificarEAtualizarCompetenciaDetectada(file)
}

function onVendasFileSelect(event) {
  const file = event.target.files?.[0] || null
  vendasFile.value = file
  verificarEAtualizarCompetenciaDetectada(file)
}

// FRONT-5: Lote em Preparação Ativo
const lotePreparacaoAtivo = ref(null)
const abrindoLote = ref(null)

async function carregarCompetencias() {
  try {
    const list = await dataService.fetchCompetenciasReferencia()
    competenceOptions.value = list || []
    if (!selectedCompetencia.value && competenceOptions.value.length > 0) {
      selectedCompetencia.value = competenceOptions.value[0].competencia
      emit('competence-selected', selectedCompetencia.value)
    }
  } catch (err) {
    console.warn('Erro ao carregar competências de referência:', err)
  }
}

async function carregarCampanhas() {
  if (campaigns.value.length > 0) return
  try {
    const response = await fetch('/api/v1/campanhas').then((r) => (r.ok ? r.json() : []))
    if (Array.isArray(response)) campaigns.value = response
  } catch (err) {
    console.warn('Não foi possível carregar lista global de campanhas:', err)
  }
}

async function carregarAnexos() {
  if (!props.campanhaId) return
  try {
    anexosAtivos.value = await campaignCoverageService.listAttachments(props.campanhaId)
  } catch (err) {
    console.warn('Erro ao carregar anexos ativos:', err)
  }
}

const selectedCompetenciaFormatada = computed(() => {
  return formatCompetenceCode(selectedCompetencia.value) || selectedCompetencia.value || '—'
})

const baseExistente = computed(() => {
  if (!selectedCompetencia.value) return null
  const norm = normalizeCompetence(selectedCompetencia.value)
  return competenceOptions.value.find((c) => normalizeCompetence(c.competencia) === norm) || null
})

const jaAnexadoNaCampanha = computed(() => {
  if (!selectedCompetencia.value || !anexosAtivos.value.length) return false
  const norm = normalizeCompetence(selectedCompetencia.value)
  return anexosAtivos.value.some((a) => normalizeCompetence(a.competencia) === norm)
})

const impactAnalysis = computed(() => {
  return findAffectedCampaigns(selectedCompetencia.value, campaigns.value, props.campanhaId)
})

function onCompetenceChange(comp) {
  selectedCompetencia.value = comp
  emit('competence-selected', comp)
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

async function associarBaseExistente() {
  if (!baseExistente.value || !props.campanhaId || isAssociating.value) return
  isAssociating.value = true
  try {
    const reportId = baseExistente.value.reportId || 10042
    await campaignCoverageService.attachBase(props.campanhaId, { reportId })
    await carregarAnexos()
    emit('base-associated', { reportId, competencia: selectedCompetencia.value })
  } catch (err) {
    console.error('Falha ao associar base existente:', err)
  } finally {
    isAssociating.value = false
  }
}

async function tentarAssociarLotePendente() {
  if (!pendenteAssociacaoLoteId.value || !props.campanhaId) return
  isAssociating.value = true
  try {
    await campaignCoverageService.attachBase(props.campanhaId, {
      reportId: pendenteAssociacaoLoteId.value
    })
    pendenteAssociacaoLoteId.value = null
    mensagemFalhaAssociacao.value = ''
    await carregarAnexos()
    emit('base-associated', { reportId: pendenteAssociacaoLoteId.value, competencia: selectedCompetencia.value })
  } catch (err) {
    console.error('Falha na tentativa de recuperação de associação:', err)
    mensagemFalhaAssociacao.value = err.response?.data?.message || err.message || 'Falha ao vincular lote à campanha.'
  } finally {
    isAssociating.value = false
  }
}

async function desanexarBase(anexoId) {
  if (!props.campanhaId || !anexoId) return
  isDetaching.value = anexoId
  try {
    await campaignCoverageService.detachBase(props.campanhaId, anexoId)
    await carregarAnexos()
  } catch (err) {
    console.error('Falha ao desanexar base:', err)
  } finally {
    isDetaching.value = null
  }
}

function alternarDemonstracaoPreparacao() {
  if (lotePreparacaoAtivo.value) {
    lotePreparacaoAtivo.value = null
  } else {
    lotePreparacaoAtivo.value = {
      id: 'prep-demo-jul25',
      campanhaId: props.campanhaId || 3,
      tipoBase: 'SALES',
      competencia: selectedCompetencia.value || '2025-07',
      status: 'EM_PREPARACAO',
      totalLinhas: 4,
      linhasValidas: 1,
      linhasInvalidas: 3,
      origem: 'MANUAL'
    }
  }
}

// FRONT-5: Abertura de lote em preparação para edição de linhas
async function abrirPreparacaoLote(reportId) {
  if (!props.campanhaId || !reportId) return
  abrindoLote.value = reportId
  try {
    const lote = await campaignPreparationService.openFromBatch(props.campanhaId, reportId)
    lotePreparacaoAtivo.value = lote
  } catch (err) {
    console.error('Falha ao abrir lote em preparação:', err)
  } finally {
    abrindoLote.value = null
  }
}

function onBatchCommitted() {
  lotePreparacaoAtivo.value = null
  carregarAnexos()
  carregarCompetencias()
}

async function executarUploadCiclo() {
  if (!rhFile.value || !vendasFile.value || isUploading.value) return

  const targetCompetencia = competenciaDetectadaNosArquivos.value || selectedCompetencia.value
  selectedCompetencia.value = targetCompetencia

  isUploading.value = true
  uploadProgress.value = 10
  uploadStageMessage.value = 'Iniciando validação...'
  diagnosticoEnvio.value = null
  pendenteAssociacaoLoteId.value = null
  mensagemFalhaAssociacao.value = ''

  try {
    const res = await dataService.uploadCicloSequencial({
      rhFile: rhFile.value,
      vendasFile: vendasFile.value,
      competencia: targetCompetencia,
      onProgress: (p) => {
        uploadStageMessage.value = p.message || p.stage
        uploadProgress.value = p.progress || 50
      }
    })

    uploadProgress.value = 100
    uploadStageMessage.value = 'Carga concluída com sucesso!'
    diagnosticoEnvio.value = res

    if (props.campanhaId && res?.reportId) {
      try {
        await campaignCoverageService.attachBase(props.campanhaId, {
          reportId: res.reportId
        })
        await carregarAnexos()
      } catch (attachErr) {
        console.warn('Lote processado, mas não foi possível auto-anexar à campanha:', attachErr)
        pendenteAssociacaoLoteId.value = res.reportId
        mensagemFalhaAssociacao.value =
          attachErr.response?.data?.message ||
          attachErr.message ||
          'Lote importado no banco corporativo, mas não pôde ser vinculado à vigência desta campanha.'
      }
    }

    await carregarCompetencias()
    emit('base-uploaded', res)
  } catch (err) {
    console.error('Erro no upload sequencial de bases:', err)
    diagnosticoEnvio.value = {
      status: 'FALHOU',
      mensagem: err.message || 'Falha durante o envio de bases.',
      inconsistencias: [{ motivo: err.message || 'Erro inesperado no servidor.' }]
    }
  } finally {
    isUploading.value = false
  }
}

watch(
  () => props.competencia,
  (newComp) => {
    if (newComp && newComp !== selectedCompetencia.value) {
      selectedCompetencia.value = newComp
    }
  }
)

watch(
  () => props.campanhaId,
  (newId) => {
    if (newId) carregarAnexos()
  }
)

onMounted(async () => {
  await carregarCompetencias()
  await carregarCampanhas()
  if (props.campanhaId) {
    await carregarAnexos()
  }
})
</script>
