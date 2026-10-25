# Lote 1 — salvar e reabrir o rascunho

## Disponível

Em modo `api`, “Salvar rascunho” usa `POST /api/v1/campanhas` ou `PUT /api/v1/campanhas/{id}` com `regras[]`. A resposta inteira é hidratada e a URL passa a `/campanhas/{id}/editar`. F5 consulta o backend; não existe persistência simulada em localStorage.

O rascunho pode conter campos incompletos e pendências. Números malformados, códigos incompatíveis com o contrato e faixas invertidas precisam ser corrigidos antes de enviar. Os identificadores de banco de cada regra ficam separados das identidades locais. Matrícula permanece texto e taxa `3,5%` vira `0.035`.

Sem início ou fim, a confirmação explica os padrões do servidor: início ausente = hoje no servidor; fim ausente = início mais 30 dias. O período recebido no sucesso passa a ser exibido. Datas conflitantes entre regras não são consolidadas silenciosamente. Explicações dependentes das datas são invalidadas para nova verificação.

## Como conferir

1. Interprete três regras, deixe uma taxa pendente e salve.
2. Confira a URL com o ID persistido. Recarregue e confira as três regras, faixas e matrícula com zeros.
3. Corrija e salve novamente. Não deve criar outra campanha.
4. Sem alterações, salvar não deve emitir PUT. Em erro, os campos permanecem preenchidos.

## Integração e limitações

Configure `VITE_CAMPAIGN_PROPOSALS_MODE=api` e `VITE_API_URL=/api/v1`; reinicie o Vite. Banco e backend devem estar disponíveis. Não há chamadas ao modelo para salvar/reabrir.

O backend persiste pendências como texto e não guarda origens estruturadas, lista de edições manuais ou confirmação de público genérico. Durante a sessão, o frontend mantém esses metadados; depois de F5, não inventa sua recuperação. Pendências sem classificação recuperável exigem reinterpretação do bloco; a interface explica isso. Público sem filtros exige nova confirmação explícita. O histórico completo de rastreabilidade depende de ampliação futura do contrato.

Após falha de criação com resultado incerto, consulte a lista antes de repetir, evitando duplicação. Não há idempotency key no contrato atual.
