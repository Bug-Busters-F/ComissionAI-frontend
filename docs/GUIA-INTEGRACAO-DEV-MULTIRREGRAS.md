# Integração da dev ao formulário multirregras

## Estado da entrega

- Branch: `feat/formulario-multiregras`.
- Origem integrada: `origin/dev` em `00a38ac`.
- Commit de merge: `6c7947e`.
- Prioridade de resolução: implementação da dev; adaptações do multirregras por cima dela.
- Sem alterações em backend ou IA e sem push.
- As alterações locais anteriores e as adaptações posteriores ao merge continuam disponíveis sem novo commit.
- Backup externo: `/home/renan/Documents/Codex/2026-10-11/new-chat/outputs/antes-merge-dev-20261022-212353/frontend.zip`. O stash `backup-integracao-dev-20261022-multirregras` também foi preservado.

## O que veio da dev

- Upload assíncrono de RH, vendas e taxas e detecção da competência pelo nome/conteúdo do arquivo.
- Tratamento de linhas repetidas e escolha explícita para conflitos nas taxas, com `RateConflictModal` e `spreadsheetSanitizer`.
- Controles e rotas de exclusão de matrículas, vendas, competência e comissões base.
- Componentes e serviços de cobertura e bases ausentes.
- Nova apresentação da simulação, projeções, cenários, memória de cálculo e revisão.
- Serviços de acompanhamento e simulação, alterações de canal e dependência de leitura de planilhas `xlsx`.

## Como o multirregras foi adaptado

A tela de simulação do multirregras reutiliza `CampaignSimulationStep.vue` da dev. Um adaptador mantém a paginação já feita pelo backend e aceita a memória de cálculo textual recebida pela API, sem convertê-la em uma explicação inventada. Os cartões projetados usam os consolidados projetados do backend; os valores históricos permanecem separados.

O ciclo real de rascunho, simulação, aceite e ativação do multirregras continua vinculado aos IDs e confirmações do backend. As regras, comparações, origens, edições manuais e revisão Python permanecem preservadas. Impedimentos reais de cobertura alimentam o bloqueio visual da dev.

O upload conserva a detecção, a estrutura dos relatórios e a substituição de taxas da dev. O acompanhamento foi conciliado com a confirmação estrita do lote: resposta pendente, cancelamento, tempo esgotado ou erro HTTP não viram sucesso. A competência é enviada uma única vez, na query string; somente o arquivo vai no multipart.

As rotas de exclusão da dev propagam as rejeições reais. Se o backend negar uma operação, os dados e o histórico são mantidos e a mensagem é apresentada. A substituição de taxas também para quando a remoção do lote anterior é bloqueada.

Os cards de competência consultam as referências do backend. Uma resposta vazia não mantém cards fictícios da sessão; o agrupamento de vendas da dev permanece apenas como compatibilidade para um servidor sem a consulta de referência. As taxas são listadas pelo contrato real de `/bases-comissao`, sem preencher uma tabela fictícia quando a base está vazia.

## Como conferir

1. Atualize a página em **Dados** e anexe arquivos de RH e vendas; confira a competência detectada.
2. Aguarde o resultado final dos lotes. Recarregue e confirme a presença da competência e dos registros.
3. Em taxas, confira a remoção de linhas idênticas e a escolha para percentuais conflitantes. As datas devem corresponder ao mesmo mês: a API importa taxas mensais.
4. No multirregras, interprete, edite e salve um rascunho com várias regras. Escolha uma referência e confira o novo visual da simulação.
5. Navegue entre páginas de vendas, abra a memória e confira os totais históricos e projetados.
6. Confira os bloqueios de cobertura, o aceite explícito e a revisão antes da ativação.
7. Ao testar exclusões, uma rejeição do backend deve manter a tela e apresentar o motivo.

## Verificações e limites

- **265 testes aprovados em 29 arquivos**, com Node 24, incluindo os testes recebidos da dev e as regressões da conciliação. A versão atual do Vitest exige Node compatível; o Node 18 do sistema não atende aos requisitos publicados no pacote.
- Build de produção aprovado. Permanece o aviso de tamanho do bundle, agora incluindo o leitor de planilhas da dev.
- Navegador com dados controlados: visual da dev, páginas 2 e 3, desabilitação de próxima página no fim e memória textual conferidos; sem erros no console. Nenhum registro de teste foi importado no banco.
- Backend real: o cliente de upload passou pela validação de competência para SALES e COMISSIONS usando arquivos vazios; ambos foram rejeitados como vazios antes da criação do lote. Isso confirma o formato HTTP, sem afirmar que planilhas reais foram processadas.
- O backend em execução precisa disponibilizar as rotas usadas, especialmente as novas exclusões e o ciclo de simulação/aceite/ativação. Esta entrega não atualiza nem reinicia esse serviço.
- A substituição de taxas depende de exclusões e de um novo upload, em chamadas separadas; não há transação única entre essas operações.
- O histórico visual continua em memória. Envios compostos de RH + vendas não possuem um único ID de lote; sua remoção pelo histórico é bloqueada quando não há ID único, evitando exclusão apenas local. Os controles reais de base e de registros permanecem disponíveis.
