# CRUD de campanhas

Este guia reproduz o fluxo de campanhas no frontend usando o CRUD do backend Spring Boot. A integração real com a extração de regras por IA permanece preparada para uma etapa posterior.

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

## Modo demonstrativo

Para comparar o fluxo com o protótipo sem chamar o CRUD real, inicie o frontend com:

```bash
VITE_CAMPAIGN_DEMO=true npm run dev -- --host 0.0.0.0
```

O modo normal é `VITE_CAMPAIGN_DEMO=false` (ou variável ausente). Ele não usa fallback demonstrativo quando o serviço está indisponível. O modo demonstrativo usa exemplos determinísticos, identifica a tela como demonstração e não envia operações reais.

A interpretação automática ainda não chama o repositório de IA: a etapa mantém o contrato compatível com os campos esperados, exibe pendências/confiança e usa o preenchimento demonstrativo quando necessário. A simulação usa exclusivamente fixtures locais para apresentar cenários, premissas, totais e funcionários. A apuração e a memória continuam sendo painéis demonstrativos.

No fluxo real, uma campanha nova começa como `DRAFT`. A persistência ocorre na revisão: `Salvar como rascunho` grava o rascunho e `Aprovar campanha` grava o rascunho e depois solicita `PATCH /api/v1/campanhas/{id}/estado` com `{"estado":"ATIVA"}`. Se a ativação falhar depois da gravação, o identificador é preservado e a tela permanece na revisão para permitir uma nova tentativa sem duplicar o `POST`.

Não há salvamento automático, recuperação por `localStorage` ou gravação ao trocar de etapa. Com alterações pendentes, sair pela navegação ou fechar a aba exibe confirmação; o navegador também recebe o aviso nativo de saída quando aplicável.

Comandos sugeridos para sua validação:

```bash
npm run test
npm run build
```

## Roteiro manual

1. Abra `/campanhas` em modo real e confirme carregamento, lista vazia, busca sem resultado e erro de indisponibilidade.
2. Crie uma campanha, percorra `Proposta → Interpretação → Simulação → Revisão` e confirme que ela só é persistida ao salvar na revisão.
3. Na simulação, use `Simular`, alterne os cenários, aplique a sugestão e confirme os dados mockados e o botão `Manter e revisar`.
4. Na revisão, confira o resumo real da campanha, as premissas/cenários mockados, a tabela de funcionários e a memória demonstrativa.
5. Salve como rascunho e confirme `DRAFT` na listagem/detalhe; edite a campanha e confirme que a atualização mantém os dados.
6. Aprove uma campanha e confirme a transição para `ATIVA`. Simule falha na ativação e confirme que o rascunho permanece disponível para retry.
7. Teste `Cancelar`, a confirmação de descarte, `Esc`, foco do diálogo e aviso ao sair com alterações pendentes.
8. Teste validações de campos obrigatórios, datas, códigos numéricos, erro 400, erro 404 e falha de rede preservando os valores digitados.
9. Abra a confirmação de remoção, cancele, depois remova uma campanha de teste e confira a listagem e o detalhe antigo.
10. Repita os estados principais com `VITE_CAMPAIGN_DEMO=true` e faça a conferência visual em viewport desktop e estreito.

## Escopo desta entrega

- O CRUD real usa exclusivamente os endpoints de campanhas existentes.
- A taxa é convertida somente nas fronteiras entre formulário e API.
- O fluxo de aprovação usa a atualização de estado disponibilizada pelo backend; cálculo e apuração reais ainda não fazem parte desta entrega.
- A simulação é intencionalmente mockada e a IA não é chamada nesta etapa.
- O formulário de proposta é exclusivamente por texto livre; não há modo de criação nem campo de canal.
- A execução dos testes automatizados e a validação visual final ficam para o roteiro manual acima.
