# CRUD de campanhas

Este guia reproduz o fluxo de campanhas no frontend usando o CRUD do backend Spring Boot e a interpretação de texto disponibilizada pelo Spring. A interpretação gera apenas uma proposta em memória; salvar e aprovar continuam dependendo de ações explícitas na revisão.

## Requisitos validados

- Node.js `v24.20.0` e npm `12.0.2` foram usados nesta validação.
- Docker e Docker Compose.
- Backend e PostgreSQL disponíveis nas portas `8080` e `5432`.

## Backend e PostgreSQL

No repositório do backend:

```bash
cd /home/renantg21/Pastas/Semestre-6/api/repos/ComissionAI-backend/backend
docker compose up --build -d
docker compose logs -f backend
```

Espere a inicialização do Spring Boot e confira a consulta:

```bash
curl http://localhost:8080/api/v1/campanhas
```

Para encerrar os serviços sem remover o volume do PostgreSQL:

```bash
docker compose stop
```

Não use `docker compose down -v` se precisar preservar os dados.

## Frontend em modo real

No repositório do frontend:

```bash
cd /home/renantg21/Pastas/Semestre-6/api/repos/ComissionAI-frontend
npm ci
npm run dev -- --host 0.0.0.0
```

Abra o endereço informado pelo Vite e acesse `/campanhas`. O frontend usa `/api/v1` por padrão e o proxy existente encaminha `/api` ao backend local. Se o frontend e o backend estiverem em hosts diferentes, defina explicitamente `VITE_API_URL=http://HOST_DO_BACKEND:8080/api/v1`.

O fluxo usa as rotas `/campanhas`, `/campanhas/nova`, `/campanhas/:id` e `/campanhas/:id/editar`. As quatro etapas usam o parâmetro `?etapa=proposta|interpretacao|simulacao|revisao`.

O botão `Interpretar proposta` envia somente `POST /api/v1/interpretador/extrair-regra` ao Spring, com o texto original e contexto mínimo. A chamada usa timeout próprio de 45 segundos e pode ser cancelada; o frontend não acessa diretamente a porta da IA.

Para a integração real, a IA precisa estar acessível pelo Spring no endereço configurado pelo backend. Quando a instância Python for iniciada localmente, use `--host 0.0.0.0` para permitir a comunicação do contêiner Spring:

```bash
cd /home/renantg21/Pastas/Semestre-6/api/repos/ComissionAI-ai
source venv/bin/activate
python -m uvicorn app.main:app --app-dir src --host 0.0.0.0 --port 8000 --reload
```

## Modo demonstrativo

Para comparar o fluxo com o protótipo sem chamar o CRUD real, inicie o frontend com:

```bash
VITE_CAMPAIGN_DEMO=true npm run dev -- --host 0.0.0.0
```

O modo normal é `VITE_CAMPAIGN_DEMO=false` (ou variável ausente). Ele não usa fallback demonstrativo quando o serviço está indisponível. O modo demonstrativo usa exemplos determinísticos, identifica a tela como demonstração e não envia operações reais.

A interpretação real chama o Spring e exibe os campos retornados, confiança quando disponível, pendências e ambiguidades. O Canal pode ser revisado manualmente na etapa de interpretação; a proposta inicial não possui input de Canal. A simulação usa exclusivamente fixtures locais para apresentar cenários, premissas, totais e indicadores, mas a interface não expõe essa limitação técnica. A apuração e a memória continuam sendo painéis demonstrativos em suas telas próprias.

No fluxo real, uma campanha nova começa como `DRAFT`. A persistência ocorre na revisão: `Salvar como rascunho` grava o rascunho e `Aprovar campanha` grava o rascunho e depois solicita `PATCH /api/v1/campanhas/{id}/estado` com `{"estado":"ATIVA"}`. Se a ativação falhar depois da gravação, o identificador é preservado e a tela permanece na revisão para permitir uma nova tentativa sem duplicar o `POST`.

Não há salvamento automático, recuperação por `localStorage` ou gravação ao trocar de etapa. Com alterações pendentes, sair pela navegação ou fechar a aba exibe confirmação; o navegador também recebe o aviso nativo de saída quando aplicável.

Comandos sugeridos para sua validação:

```bash
npm run test
npm run build
```

## Roteiro manual

1. Abra `/campanhas` em modo real e confirme carregamento, lista vazia, busca sem resultado e erro de indisponibilidade.
2. Crie uma campanha com texto, sem título, e confirme que `Interpretar proposta` ainda pode ser executado; título continua obrigatório apenas para salvar.
3. Use um texto completo, confirme a única chamada ao interpretador, revise a taxa convertida, datas, dimensões, confiança e pendências, e confira que nenhuma campanha foi criada.
4. Edite o Canal na etapa de interpretação, interprete novamente e confirme que a seleção explícita aparece apenas no contexto da nova solicitação.
5. Altere o texto durante uma solicitação, cancele uma solicitação e simule uma resposta atrasada; confirme que respostas antigas não substituem o formulário.
6. Teste texto sem taxa, cargo ambíguo, bônus não suportado e data final ausente; confirme pendências visíveis e preenchimento manual preservado.
7. Na simulação, use `Simular`, alterne os cenários, aplique a sugestão e confirme a navegação padrão `Voltar` e `Ir para revisão`.
8. Na revisão, confira o resumo real da campanha, as premissas, os cenários e as ações de salvar, cancelar e aprovar.
9. Salve como rascunho e confirme `DRAFT`; edite, interprete novamente e confirme que nada é persistido antes do salvamento explícito.
10. Aprove uma campanha, confirme `ATIVA`, teste falha de ativação/retry e valide cancelamento, descarte, remoção e layout responsivo.

## Escopo desta entrega

- O CRUD real usa exclusivamente os endpoints de campanhas existentes.
- A taxa é convertida somente nas fronteiras entre formulário e API.
- O fluxo de aprovação usa a atualização de estado disponibilizada pelo backend; cálculo e apuração reais ainda não fazem parte desta entrega.
- A simulação permanece mockada internamente, sem cálculo real, e não interfere na interpretação; essa informação não é exibida na tela.
- O formulário de proposta é exclusivamente por texto livre; não há modo de criação nem campo de Canal nessa etapa. O Canal é revisável na interpretação.
- A interpretação não envia `confianca`, `pendencias`, contexto de interpretação, identificadores de solicitação, dados de simulação ou matrícula inferida ao cadastro.
- A execução dos testes automatizados e a validação visual final ficam para o roteiro manual acima.
