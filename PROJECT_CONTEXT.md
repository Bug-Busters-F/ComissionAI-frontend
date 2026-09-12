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
  - Carga em lote (XLSX): importação e validação rígida de bases de RH, vendas e comissões com feedback de erros impeditivos por linha/coluna.
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
│   ├── common/              # Componentes de UI genéricos e utilitários (botões, inputs, modais, badges)
│   ├── rules/               # Componentes de gestão de regras (formulário de CRUD e input de regras via NLP)
│   └── simulation/          # Componentes da sandbox de simulação de impacto financeiro e métricas de XAI
├── layouts/                 # Cascas/estruturas de layout compartilhadas (Navbar, Sidebar, Container principal)
├── router/                  # Definição e configuração de rotas via Vue Router (index.js)
├── services/                # Camada de integração HTTP com Axios centralizando chamadas à API Spring Boot
├── stores/                  # Gerenciamento de estado global com Pinia (regras, simulações, rascunhos, uploads)
├── views/                   # Telas/páginas principais conectadas às rotas da aplicação
├── App.vue                  # Componente raiz da aplicação
└── main.js                  # Ponto de entrada da aplicação (instanciação do Vue, Pinia e plugins)
```

# Padrões Técnicos do Frontend

- Serviços HTTP em `src/services/` encapsulando Axios e centralizando endpoints do Spring Boot.
- Pinia stores gerenciando o estado de rascunhos, bases importadas e resultados de simulação.
- Interfaces limpas, scannable e focadas na explicabilidade visual das regras sugeridas pela IA.
