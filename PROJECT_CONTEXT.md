# Visão do Produto & Desafio Dom Rock

- Objetivo: Sistema inteligente para gestão, versionamento e simulação de regras de negócio dinâmicas (comissões de vendas, campanhas por canal/loja/região).
- Problema Central: Evitar inconsistências operacionais, conflito entre regras e perda de rastreabilidade, trazendo explicabilidade (XAI) para as decisões.

# Arquitetura Integrada & Pipeline

- Frontend: Vue.js 3 SPA (Vite + Tailwind CSS + Pinia).
- Backend Orquestrador: Spring Boot (Java), único ponto de contato do frontend para autenticação, persistência relacional e regras transacionais.
- Serviço de IA/NLP: FastAPI (Python) com LangChain/LLM para tradução de linguagem natural em regras estruturadas e workers de simulação.
- Pipeline do Fluxo:
  1. Frontend envia prompt em linguagem natural ou payload estruturado para o Spring Boot.
  2. Spring Boot persiste o rascunho (draft) e delega o processamento ao FastAPI/LLM.
  3. FastAPI processa o prompt e retorna a regra estruturada (JSON) para o Spring Boot, que responde ao frontend.
  4. Usuário requisita simulação sandbox de impacto financeiro (contra histórico real).
  5. Sistema apresenta comparativo de métricas e sugestões orçamentárias (XAI).
  6. Human-in-the-Loop (HITL): ativação definitiva da regra somente após aceite explícito do usuário.

# Escopo das Sprints e Requisitos Funcionais

- Sprint 1:
  - CRUD manual de regras de negócio (canal, taxa, validade).
  - Validação mandatória de vigência: campo 'data_fim' obrigatório para evitar regras com vigência indeterminada.
  - Criação de regras via NLP: tradução de texto livre (ex: "pagar 5% no ecommerce em dezembro") em JSON estruturado.
  - Carga em lote (XLSX) [Implementado no Frontend]:
    - Upload multipart/form-data com suporte a **Fechamento de Ciclo Mensal Conjunto** (envio obrigatório e atômico de RH + Vendas) e **Taxas de Comissão** (vigência com data de término obrigatória).
    - Validação cruzada (cross-check) relacional: consistência entre vendedores da base de Vendas e colaboradores ativos na base de RH da competência.
    - Relatório de validação com apontamentos estruturados por Origem (RH, Vendas, Cruzamento), Linha, Campo, Motivo e Severidade (IMPEDITIVO vs AVISO).
    - Regra estrita de integridade atômica: em caso de erro impeditivo, bloqueio relacional ou sobreposição, mensagem mandatória *"Planilha com pendências: corrija e envie novamente"* com bloqueio total (sem importação parcial ou forçada de meio ciclo).
    - Carga com avisos não impeditivos permitindo conclusão e reenvio após correções externas.
  - Logs imutáveis para cálculos de comissão.
- Sprint 2:
  - Sandbox de Simulação: cálculo de impacto financeiro de regras em 'draft' contra massa histórica sem comitar comissões reais no banco.
  - Human-in-the-loop (HITL): interface de revisão comparativa antes de alterar o status da regra para 'Ativa'.
  - **Gestão de Bases Ausentes e Bloqueio de Cobertura (FRONT-10)**:
    - Apresentação de combinações de Marca, Cargo e Competência sem taxa base cadastrada em `tb_basecomiss`.
    - Componente `MissingBasesCard.vue` com bloqueio financeiro e proteção contra taxas fictícias, totalizando volume de vendas impactadas e montante financeiro protegido.
    - Orientação acionável e atalho direto para ingestão de taxas (`importType=COMISSIONS`) com competência e vigência pré-carregadas.
    - Recálculo reativo da competência pós-upload ou via ação direta do usuário.
    - Bloqueio na simulação e proposta de campanhas quando o público-alvo não possuir base contratual, ocultando estimativas fictícias e preservando a integridade contábil.
  - **Simulação de Campanha por Competência, Memória do Cálculo, Cenários e Aceite (FRONT-4, FRONT-5, FRONT-6)**:
    - **Seleção de Competência Única e Origem dos Dados (FRONT-4)**: Seleção de exatamente uma competência já cadastrada em Dados (`GET /api/v1/referencias/competencias` + fallback determinístico), sem upload exclusivo na simulação e sem exigir apuração prévia. Exibição clara da origem dos dados e do período inclusivo da campanha.
    - **Recorte do Público e Validações Pré-Execução (FRONT-4)**: Consumo de `POST /api/v1/referencias/recortar-publico` e validação local determinística (`campaignSimulationService.js`), realizando a união das regras (`OU` entre regras, `E` dentro da regra, sem duplicar vendas por ID), validação de vínculos de RH, cobertura de `tb_basecomiss` e desempate por especificidade (`Marca + Loja + Cargo + Matrícula`).
    - **Referência Insuficiente (FRONT-4)**: Quando a competência selecionada não possui vendas ou quando 0 vendas atendem ao público da campanha (`totalVendasRecortadas === 0`), o sistema bloqueia a execução como **"Referência insuficiente"** e jamais apresenta `R$ 0,00` como estimativa válida.
    - **Acompanhamento Assíncrono (FRONT-4 / base para FRONT-11)**: Serviço compartilhado `asyncExecutionService.js` com persistência em `sessionStorage`, rastreando `executionId`, estados (`AGUARDANDO`, `PROCESSANDO`, `CONCLUIDA`, `FALHOU`), percentual de progresso e recuperação após atualização de página.
    - **Tabela Paginada, Memória do Cálculo e Totais (FRONT-5)**: Tabela paginada do público (`Matrícula | Loja | Valor da venda | Comissão base | Comissão com campanha proposta | Detalhes`), modal de memória individual do cálculo (identificador/data, origem dos dados, taxa e documento base, regra aplicada ou manutenção da base, faixa satisfeita, arredondamento `HALF_UP` e diferença) e totais de todo o recorte (histórico 100% vs projetado pela duração no mês comercial de **30 dias**, fator `dias / 30` sem arredondamento antecipado).
    - **Cenários de Variação Uniforme 80%, 120% e 150% (FRONT-5)**: Recálculo venda a venda do valor, faixa atingida e comissão base vs proposta, contabilizando quantas vendas mudaram de faixa de valor em cada cenário.
    - **Aceite, Invalidação Reativa e Confirmação Explícita para Ativação (FRONT-6)**: Separação entre aceitar a simulação (`Aceitar simulação e continuar`) e ativar a campanha (`Aprovar e ativar campanha`). Qualquer alteração posterior em regras, taxas, competência, vigência ou base contratual (`tb_basecomiss`) retira o aceite automaticamente (`evaluateSimulationValidity`) e exige nova simulação. Na Revisão, exige confirmação humana explícita via checkbox antes de ativar.
  - **Acompanhamento Assíncrono da Apuração e Resiliência pós-Reload (FRONT-11)**:
    - **Contrato real do BACK-10 / PR #26**: envio por `POST /execucoes/calculo`, consulta por `GET /execucoes/calculo/{uuid}` e nova tentativa explícita por `POST /execucoes/calculo/{uuid}/retomar`.
    - **Identidade e progresso confirmados**: UUID, estado e percentual recebidos do backend, sem IDs de execução inventados nem progresso por temporizador.
    - **Recuperação idempotente**: chave armazenada antes do envio e reutilizada se a resposta inicial for perdida; depois de receber o UUID, recuperação consulta somente essa execução. Escopo `calculation-v2` no sessionStorage.
    - **Consulta pausada**: perda de comunicação preserva o acompanhamento e oferece retomada, sem declarar falha ou sucesso do cálculo. Resultados só entram no cache após CONCLUIDA com resumo válido.
    - **Competências isoladas**: navegar para outra competência não altera a identidade da execução em curso; respostas antigas não substituem o acompanhamento atual.
    - **Limite do resultado disponível**: o backend atual devolve contagens no campo `resultado`, não totais financeiros ou listas completas. O resumo mostra apenas dados confirmados e mantém o histórico acessível, sem fabricar R$ 0,00.
    - **Recuperação global**: Topbar e tela de apuração compartilham um monitor; navegação e F5 na mesma aba preservam a consulta. SessionStorage não garante recuperação depois de encerrar a sessão/aba.
- Sprint 3:
  - **Alertas Estatísticos e Anomalias de Vendas (Sprint 3 · FRONT-6)** — detalhes técnicos na seção *Alertas Estatísticos (Sprint 3 · FRONT-6)* em Padrões Técnicos:
    - `OUTLIER_VENDA`: Z-score Leave-One-Out com **|Z| ≥ 3** nos dois sentidos (vendas muito acima ou estornos/valores muito abaixo) contra o grupo comparável `competencia|loja|cargo|marca`.
    - `SEM_VENDAS_PARA_RH`: colaborador do lote de RH sem vendas associadas (inconsistência de carga).
    - `AMOSTRA_INSUFICIENTE`: grupo comparável com menos de 4 vendas (contando a própria), sem distribuição confiável.
    - Reprocessamento por lote de preparação com Segregação de Funções (auditor apenas consulta) e card executivo na Home com indicador de novos casos em 48h.
  - Explainable AI (XAI): sugestões automáticas de redução de percentuais para adequação orçamentária em caso de estouro de teto.
  - Relatório de fechamento de ciclo financeiro consolidado por canal.
  - Histórico de auditoria e versionamento das regras.

# Estrutura do Projeto (Frontend)

A organização do diretório `src/` segue uma arquitetura modular baseada em responsabilidades e domínios do produto:

```text
src/
├── assets/                  # Arquivos estáticos e estilos globais (Tailwind CSS, ícones, imagens)
├── components/              # Componentes Vue reutilizáveis organizados por domínio
│   ├── anomalies/           # Alertas estatísticos e anomalias de vendas (CampaignAnomaliesSection.vue — Sprint 3 · FRONT-6)
│   ├── audit/               # Componentes de auditoria, rastreabilidade e logs imutáveis de comissões
│   ├── common/              # Componentes de UI e etapas do fluxo de campanha (CampaignSimulationStep.vue, CampaignReviewStep.vue, StatusBadge.vue, ToastContainer.vue)
│   ├── data/                # Ingestão de dados (UploadBaseModal.vue, ValidationReport.vue, MissingBasesCard.vue)
│   ├── layout/              # Cascas de layout compartilhadas (AppShell, SidebarNav, Topbar)
│   ├── rules/               # Componentes de gestão de regras (formulário de CRUD e input de regras via NLP)
│   └── simulation/          # Componentes da sandbox de simulação de impacto financeiro e métricas de XAI
├── layouts/                 # Estruturas de layout complementares
├── router/                  # Definição e configuração de rotas via Vue Router (index.js)
├── services/                # Camada de serviços HTTP e domínio (api.js, dataService.js, coverageService.js, campaignSimulationService.js, asyncExecutionService.js, useCampaignFlow.js, statisticalAlertsApi.js, statisticalAlertsLogic.js, statisticalAlertsDemo.js)
├── stores/                  # Gerenciamento de estado global com Pinia (dataStore.js, notificationStore.js, calculationStore.js)
├── views/                   # Telas/páginas principais conectadas às rotas (HomeView, DataView, CampaignsView, CampaignFlowView.vue, CompetenceCalculationView.vue)
├── App.vue                  # Componente raiz da aplicação
└── main.js                  # Ponto de entrada da aplicação (instanciação do Vue, Pinia e plugins)
```

# Padrões Técnicos do Frontend

- **Serviços HTTP**: Camada em `src/services/` encapsulando Axios e centralizando endpoints do Spring Boot.
- **Proxy Reverso no Vite**: Configurado no `vite.config.js` (`/api` -> `http://localhost:8080`), eliminando barreiras de CORS no ambiente local.
- **Gerenciamento de Estado**: Pinia stores (`dataStore.js`, regras e simulações) gerenciando o ciclo de vida reativo dos uploads, competências, regras e diagnósticos de integridade.
- **Fechamento Atômico de Ciclo & Orquestração Sequencial**:
  - Ingestão conjunta das bases de RH e Vendas para cada competência mensal.
  - Orquestração sequencial no frontend: primeiro a base de RH é enviada (`importType=HR`) para garantir que todos os colaboradores e filiais sejam persistidos no banco relacional; em seguida, a base de Vendas (`importType=SALES`) é processada, garantindo integridade referencial nas transações.
  - Suporte a importação de taxas comissionadas avulsas (`importType=COMISSIONS`) com validação de vigência obrigatória.
- **Processamento Assíncrono em Segundo Plano & UX Desacoplada**:
  - **Desacoplamento do Modal**: O ciclo de vida da requisição HTTP é gerenciado pela Pinia store (`dataStore.activeJob`), permitindo que o usuário minimize ou feche o modal e continue navegando livremente pela aplicação (SPA) sem interromper a carga.
  - **Feedback Visual Multicanal**:
    - **Topbar**: Widget animado no topo com badge de status, etapa atual e percentual de progresso em tempo real, permitindo reabrir o modal a qualquer momento.
    - **Cards Reativos no DataView**: Exibição dinâmica de barra de progresso no card da respectiva competência mensal.
    - **Sistema Global de Notificações (Toasts)**: Componente `ToastContainer` e `notificationStore` emitindo alertas contextuais de início, sucesso e erro com botões de ação direta ("Ver Relatório" / "Ver Detalhes").
  - **Resiliência e Timeout**: Timeout de requisição estendido no Axios (5 minutos) para garantir a ingestão completa de planilhas pesadas (ex: 8.000+ linhas de RH e 5.000+ linhas de Vendas).
- **Criação Dinâmica de Competências no Frontend**:
  - Funções `obterOuCriarCompetencia` e `formatarNomeCompetencia` em `src/stores/dataStore.js`.
  - Ao enviar uma competência inexistente (ex: `08/2025`, `01/2026`), o sistema cria dinamicamente o card correspondente com o nome do mês em português, badge do ano/código e status reativo, sem sobrescrever ciclos existentes como `12/2025`.
  - Badge reativo no cabeçalho do `UploadBaseModal.vue` exibindo o mês identificado em tempo real enquanto o usuário digita a competência.
- **Mapeamento de Persistência no Backend (Spring Boot & PostgreSQL)**:
  - Ingestão real ativa via `POST /api/v1/imports/upload?importType={HR|SALES|COMISSIONS}` salvando diretamente em `tb_registration`, `tb_sales` e `tb_basecomiss`.
  - Comportamento de reenvio de ciclo:
    - Base de RH (`tb_registration`): comportamento de *upsert* via `findByRegistration` (atualiza dados do colaborador se a matrícula já existir).
    - Base de Vendas (`tb_sales`): comportamento cumulativo via `UUID.randomUUID()` (cada upload adiciona novos registros, sem expurgo prévio).
  - Status das Competências: mantidas no estado reativo do Pinia (`dataStore.js`), pois o backend ainda não possui endpoint `GET /api/v1/imports/competencias` para listagem de lotes históricos nem `DELETE` para expurgo de períodos.
- **Design System & Arquitetura de Cores**:
  - Tokens de cores centralizados como **Variáveis CSS Dinâmicas** (`:root` em `src/assets/main.css`), consumidas semanticamente no `tailwind.config.js` (`brand`, `sage`, `success`, `warning`, `danger`).
  - **Zero Cores Hardcoded**: Eliminação total de valores hexadecimais soltos nos componentes Vue, garantindo manutenibilidade em ponto único.
  - **HMR Instantâneo**: Atualização em tempo real de estilos e cores pelo Vite sem necessidade de reinício do servidor de desenvolvimento.
  - **Pronto para Modo Noturno**: Suporte a Dark Mode com chaveamento de variáveis via classe `.dark` no `main.css`, sem necessidade de alterar templates Vue.
- **Aderência Estrita à Identidade Wise**: Paleta Sage para fundos e superfícies, acento verde CTA, cards arredondados (`rounded-2xl`) e feedback visual de alta legibilidade.
- **Consulta de Dados Efetivados & Histórico de Envios (S1-B18)**:
  - **Dados Efetivados**: Visualização paginada dos registros persistidos no banco de dados para RH (`GET /api/v1/matriculas`), Vendas (`GET /api/v1/vendas`) e Comissões Base (`COMISS`).
  - **Filtros e Paginação**: Seletor de base (RH, Vendas, Comissões), filtro por competência/vigência, busca textual e paginação dinâmica (tamanho de página e navegação de páginas).
  - **Histórico de Envios & Diagnósticos**: Consulta de cada lote enviado com volume de linhas, situação e modal detalhado de **Relatório de Validação** com separação clara de apontamentos `IMPEDITIVOS` vs `AVISOS`.
  - **Governança Estrita**: Orientação em destaque ao usuário de que qualquer inconsistência deve ser corrigida no arquivo de origem e reenviada pelo upload (sem edição manual direta de registros).
  - **Exclusão de Registros e Bases**:
    - Exclusão pontual de vendas (`DELETE /api/v1/vendas/{id}`) e matrículas (`DELETE /api/v1/matriculas/{id}`) com modal de confirmação e tratamento de erro de integridade (HTTP 409 quando matrícula tem vendas associadas).
    - Exclusão e reinício de base lançada por competência no card do `DataView.vue`.
- **Tratamento de Bases Ausentes e Bloqueio Financeiro (FRONT-10)**:
  - **Identificação e Parsing Determinístico**: `coverageService.js` avalia os motivos de impedimento retornados pelo backend (`Taxa de comissão não encontrada: nenhuma regra ativa aplicável... nem taxa padrão cadastrada em tb_basecomiss`), isolando impedimentos de cobertura dos erros cadastrais (RH/vínculos).
  - **Agrupamento Executivo**: Agrupamento por chave única `competencia_marca_cargo`, totalizando número de transações impactadas e montante financeiro protegido.
  - **Ação e Automação Pós-Carga**: Card `MissingBasesCard.vue` com atalho direto para o modal de upload com competência e vigência pré-carregadas. Recálculo reativo engatilhado automaticamente após a conclusão com sucesso do job de upload de `COMISS`.
  - **Governança Estrita na Simulação**: Bloqueio total de estimativas ou taxas fictícias na etapa de Simulação (`CampaignSimulationStep.vue`) quando o público da campanha não tiver cobertura contratual em `tb_basecomiss` ou houver pendência na interpretação NLP.
- **Motor de Simulação, Memória do Cálculo e Governança de Aceite (FRONT-4, FRONT-5, FRONT-6)**:
  - **Compatibilidade com o Contrato Multi-Regras do Backend**: `campaignMappers.js` e `campaignService.js` enviam `regras: List<RegraItemRequest>` compatível com o `CampanhaController` atualizado na `dev` do backend, mantendo retrocompatibilidade na leitura de `regras` e `regra`.
  - **Fidelidade Matemática**: Cálculo monetário com arredondamento `HALF_UP` (2 casas decimais) por venda, projeção proporcional pelo mês comercial de **30 dias** (`(soma * dias) / 30` sem arredondamento precoce do fator) e recálculo individual de faixa de valor nos cenários de `80%`, `120%` e `150%`.
  - **Rastreabilidade de Aceite (Fingerprint)**: `createSimulationFingerprint` gera assinatura canônica cobrindo competência, vigência, regras/filtros/taxas e hash de `tb_basecomiss`. Qualquer divergência invalida imediatamente o aceite e bloqueia a ativação até nova simulação e confirmação explícita do usuário.
- **Alertas Estatísticos (Sprint 3 · FRONT-6)**:
  - **Origem dos alertas**: o backend (`AlertaEstatisticoService`) analisa automaticamente cada **lote de preparação efetivado** (`POST /campanhas/{id}/preparacao-bases/{preparacaoId}/efetivar`). Uploads diretos por `/imports/upload` **não** geram alertas. O frontend nunca calcula estatística: apenas apresenta e explica os alertas persistidos.
  - **Consulta**: `GET /api/v1/alertas-estatisticos` (todos os perfis) com filtros `competencia` (AAAA-MM, pela `dataReferencia`), `matricula` (igualdade exata), `tipo`, `lotePreparacaoId`, `incluirSubstituidos` (padrão `false`), paginação e ordenação restrita a `geradoEm`, `dataReferencia`, `tipo`, `matricula`, `tamanhoAmostra` e `score` (outros campos retornam 400). Contadores por tipo via 4 consultas `size=1` (`countAlertsByType`).
  - **Contrato de `AlertaEstatisticoResponse`**: `score` é sempre absoluto (|Z|); a direção (acima/abaixo) é derivada de `valorObservado` vs `mediaGrupo`. Com desvio zero no grupo o backend grava Z = 3 como sentinela — a UI exibe "Valor uniforme no grupo" sem citar o Z. `SEM_VENDAS_PARA_RH` vem com `dataReferencia` no dia 1 da competência, `grupoComparavel = SEM_VENDAS_ASSOCIADAS`, `tamanhoAmostra = 0` e `metodo = Z_SCORE_LEAVE_ONE_OUT_V2` (a UI mostra a competência, "Sem vendas associadas" e "Cruzamento RH × Vendas"). `tamanhoAmostra` inclui a própria venda (mínimo 4 → ao menos 3 referências). A faixa esperada `[μ − 3σ, μ + 3σ]` não é truncada em zero.
  - **Reprocessamento**: `POST /api/v1/alertas-estatisticos/reprocessar` com `{ lotePreparacaoId }`, apenas para lote `EFETIVADO`. Resposta `{ alertasGerados, alertasSubstituidos, semAmostra }`; `0/0` significa bases inalteradas (feedback neutro). Erros: 400 (lote não efetivado/competência inválida — mensagem do back exibida), 403 (SoD), 404 (lote inexistente).
  - **Lotes do seletor**: `GET /campanhas/{id}/preparacao-bases?status=EFETIVADO&competencia=` carregado pela tela da campanha e recarregado após nova efetivação (`base-effective`). A competência é sincronizada com a seção de bases (`competence-selected`) e com o seletor da própria seção (`v-model:competence`).
  - **Segregação de Funções**: reprocessar exige `GERENTE_VENDAS` com permissão `IMPORTAR_BASES` ou `ADMINISTRADOR` com `ACESSO_COMPLETO` (o backend exige apenas o papel; o front é mais restritivo, no mesmo padrão de `manageData`). A rota de lotes de preparação é restrita a `ADMINISTRADOR`, `GERENTE_VENDAS` e `ANALISTA_NEGOCIOS` (`viewPreparationLots`): para o `AUDITOR` a chamada nem é feita, o seletor de lotes fica oculto e a consulta de alertas segue disponível.
  - **Home**: componente `HomeAnomaliesCard.vue` (encaixado na Home de indicadores reais da FRONT-13), com contadores da competência (campanha ATIVA mais recente → competência do último alerta → mês atual) e selo pulsante quando o alerta mais recente foi gerado há até 48h.
  - **Robustez e acessibilidade**: respostas obsoletas são descartadas (`createLatestGuard`), erros são traduzidos por status (`describeAlertsError`) e o modal de reprocessamento recebe foco, fecha com ESC/clique externo e devolve o foco ao botão.
  - **Modo demonstração**: `VITE_ANOMALIES_DEMO=true` habilita o botão "Carregar Dados de Exemplo" no estado vazio. Os dados (`statisticalAlertsDemo.js`) seguem o contrato real, ficam na competência selecionada e nunca são enviados ao servidor nem emitidos para outros indicadores. Desligado por padrão.
  - **Limitação conhecida (backend)**: `SEM_VENDAS_PARA_RH` considera vendas da matrícula em qualquer competência (`findByRegistrationIdIn` sem filtro de período); colaborador sem vendas no mês, mas com vendas em outro mês, não gera alerta. Correção solicitada ao time de backend.


## FRONT-7 e FRONT-8 — revisão executável e orçamento (20/11/2026)

Branch conjunta `feat/revisao-python-simulacao-calibracoes`, a partir da dev `1d22f98`. A revisão técnica na etapa 2 usa `/programa-python` (código completo, versão, assinatura, histórico, edição, aprovação por checksum e devolução justificada). Identidade vem da sessão. Não usa a aprovação legada por regra para autorizar a execução. Alterações nos campos/artefatos devem ser preparadas e salvas antes da aprovação.

Na etapa 3, orçamento interpretado é preservado, mas exige confirmação explícita. A simulação usa somente `/campanhas/{id}/simulacao-python`, com versão aprovada e chave por intenção/repetição após timeout. Resultado precisa confirmar executor e assinatura. Quatro cenários consultam `enquadramento` aninhado. As alternativas persistidas só são aplicadas mediante confirmação e retornam à revisão, invalidando aprovação, simulação e aceite da proposta. Não há fallback local/Java. Calibração de código personalizado depende dos serviços; indisponibilidade e ausência de solução são distintas.

O painel de bases preserva suas funcionalidades; neste fluxo não escolhe automaticamente uma competência diferente da selecionada na simulação. Guias: `docs/GUIA-FRONT-7-REVISAO-PYTHON.md` e `docs/GUIA-FRONT-8-ORCAMENTO-CALIBRACOES.md`. Dependências: backend BACK-11 em `feat/simulacao-python-calibracoes`, V45, IA dev `7b1a182` (PR #18).
