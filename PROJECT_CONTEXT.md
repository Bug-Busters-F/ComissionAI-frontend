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
- Sprint 3:
  - Detecção estatística de anomalias/outliers em vendas (3 desvios padrão acima da média).
  - Explainable AI (XAI): sugestões automáticas de redução de percentuais para adequação orçamentária em caso de estouro de teto.
  - Relatório de fechamento de ciclo financeiro consolidado por canal.
  - Histórico de auditoria e versionamento das regras.

# Estrutura do Projeto (Frontend)

A organização do diretório `src/` segue uma arquitetura modular baseada em responsabilidades e domínios do produto:

```text
src/
├── assets/                  # Arquivos estáticos e estilos globais (Tailwind CSS, ícones, imagens)
├── components/              # Componentes Vue reutilizáveis organizados por domínio
│   ├── audit/               # Componentes de auditoria, rastreabilidade e logs imutáveis de comissões
│   ├── common/              # Componentes de UI genéricos e utilitários (PageHeader, StatusBadge, ToastContainer.vue)
│   ├── data/                # Ingestão de dados (UploadBaseModal.vue, ValidationReport.vue)
│   ├── layout/              # Cascas de layout compartilhadas (AppShell, SidebarNav, Topbar)
│   ├── rules/               # Componentes de gestão de regras (formulário de CRUD e input de regras via NLP)
│   └── simulation/          # Componentes da sandbox de simulação de impacto financeiro e métricas de XAI
├── layouts/                 # Estruturas de layout complementares
├── router/                  # Definição e configuração de rotas via Vue Router (index.js)
├── services/                # Camada de integração HTTP com Axios centralizando chamadas ao Spring Boot (api.js, dataService.js)
├── stores/                  # Gerenciamento de estado global com Pinia (dataStore.js, notificationStore.js, regras, simulações)
├── views/                   # Telas/páginas principais conectadas às rotas (HomeView, DataView, CampaignsView)
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
