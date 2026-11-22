# FRONT-12 — Auditoria e histórico permanente de cargas

## Entrega e dependência

Implementação somente no frontend, na branch `feat/logs-historico-cargas`, criada da `dev` que contém a Home real. Nenhum arquivo do backend ou da IA foi modificado.

**Requer o backend do PR #39** (`feat/logs-usuario`, referência inspecionada `697ed369`). Na execução desta tarefa, esse PR ainda não estava na `dev` do backend. Depois do merge, atualizar e reconstruir o serviço para aplicar a migração V44. Não é necessário apagar o banco nem os volumes. A IA não participa destas consultas.

A configuração utiliza a instância HTTP autenticada e `VITE_API_URL` já existentes. Não há provedores demonstrativos, histórico alternativo local ou respostas simuladas na aplicação.

## Onde aparece

- Nova opção **Auditoria** na sidebar e na navegação móvel, para administrador, gerente e auditor.
- `/auditoria`: aba **Atividades**, com usuário, perfil da época, ação, período, campanha, competência, resultado e busca textual.
- `/auditoria?aba=cargas`: aba **Cargas e validações**, com arquivo, autor, competência, tipo, situação, origem, período e presença de apontamentos.
- Em **Dados → Histórico de Envios & Validação**, a lista em memória foi substituída pelo mesmo histórico consultado no servidor. O contador local foi removido. O relatório imediato do upload e os controles de exclusão já existentes nas outras áreas foram preservados.

A interface consulta e pagina no servidor; não carrega uma página para filtrá-la como se representasse todo o histórico. Consultar novamente e Tentar novamente refazem a consulta sem mostrar sucesso ou vazio em uma falha.

## Operações utilizadas

| Finalidade | Operação |
| --- | --- |
| Atividades paginadas e filtros | `GET /api/v1/auditoria` |
| Detalhes de uma atividade | `GET /api/v1/auditoria/{uuid}` |
| Histórico permanente de envios | `GET /api/v1/imports` |
| Detalhes do envio, inclusive excluído | `GET /api/v1/imports/lotes/{reportId}` |
| Validações paginadas e filtro por campo/severidade | `GET /api/v1/imports/lotes/{reportId}/validacoes` |
| Arquivo original preservado | `GET /api/v1/imports/lotes/{reportId}/arquivo` |

Os pedidos têm timeout de 30 segundos e cancelamento. A integração não faz chamadas de escrita, aceite, exclusão ou publicação. A exportação CSV de auditoria e a listagem específica de usuários disponíveis no PR não são necessárias ao escopo desta tarefa e não foram adicionadas.

Exceção de compatibilidade na área **Dados**: foi preservada a ação já existente de remover dados de um envio, somente para gerente/administrador e cargas não excluídas. Ela continua utilizando `DELETE /api/v1/imports/{reportId}` pelo serviço existente e exige confirmação. A mensagem agora esclarece que o histórico permanece. Somente após a confirmação real são renovados a lista e o detalhe; rejeições mantêm o registro e apresentam o motivo. Essa ação não aparece na tela Auditoria nem para o auditor.

## Autorização e histórico

- Administrador: todas as atividades.
- Gerente: atividades dos dois tipos de analistas.
- Auditor: atividades dos analistas e do gerente.
- Analistas de negócios/código: menu oculto e rota bloqueada.
- Permissões vêm da sessão confirmada pelo servidor. A política visual não substitui a restrição aplicada pela API.
- Cargas usam o acesso já concedido à área Dados para administrador, gerente e auditor. A restrição de autores acima refere-se às atividades auditadas; não é uma filtragem local do histórico de cargas.

O autor e o perfil exibidos são os registrados no evento/envio, sem substituição pelo perfil atual da conta. Campos legados ausentes aparecem como não informados; não são reconstruídos ou inventados. Histórico apagado antes da implementação no backend não pode ser recuperado pelo frontend.

## Detalhes e navegação

Atividades apresentam descrição, resultado, protocolo e relações com campanha/versão, arquivo/carga e cálculo/competência. Dados anteriores e posteriores ficam em uma seção expansível somente para leitura. Campos de credenciais e metadados técnicos sensíveis não são apresentados; textos de erro passam pela tradução já usada no projeto.

Cargas apresentam processamento, autor, origem, linhas válidas/processadas, rejeição integral, exclusão e seu motivo, lotes anteriores/substitutos e validações preservadas. Impeditivas, advertências e avisos permanecem distintos. A tabela de validações possui paginação própria. O download só aparece quando há arquivo original identificado e não informa sucesso antes de obter o arquivo.

Os detalhes são painéis na própria página, sem modais editáveis. Abrir leva o foco ao painel; fechar tenta restaurar o foco ao botão de origem.

Filtros, página, tamanho e detalhe ficam na URL:

- Atividades: prefixo `a_` (por exemplo `a_usuario`, `a_page`, `a_detalhe`).
- Cargas em Auditoria: prefixo `c_`.
- Cargas em Dados: `abaDados=envios` e prefixo `envios_`.

Recarregar e usar Voltar/Avançar retoma a consulta. Aplicar filtros novos volta à primeira página. Datas finais incluem o fim do dia no horário local do navegador. Intervalos invertidos, datas inválidas, IDs inválidos e opções desconhecidas são rejeitados antes da consulta.

Respostas antigas são descartadas após mudanças de filtros, troca de conta/perfil/permissões e desmontagem. Não há cache compartilhado entre usuários.

## Roteiro rápido de teste com serviços reais

1. Integrar o PR #39, atualizar o backend e confirmar a migração V44 sem reiniciar o banco do zero.
2. Entrar com administrador e abrir Auditoria. Conferir os totais/páginas e detalhes com as respostas da API.
3. Filtrar por usuário, período, ação, campanha e sucesso/falha. Navegar páginas, recarregar e usar Voltar.
4. Com gerente, verificar que somente atividades de analistas aparecem. Com auditor, verificar analistas e gerente. Testar URL direta com os dois perfis de analista e conferir o bloqueio.
5. Abrir Cargas e validações, localizar um envio com falha e consultar seus apontamentos. Filtrar campo e severidade.
6. Excluir um lote por um fluxo autorizado já existente, quando não houver dependências. Confirmar que ele permanece no histórico com autoria/motivo e validações. Recarregar a página.
7. Baixar o original de uma carga que tenha arquivo preservado. Conferir a mensagem quando não houver arquivo.
8. Entrar em Dados → Histórico de Envios & Validação, recarregar e confirmar que a lista e os filtros continuam disponíveis.
9. Interromper uma consulta e verificar erro com nova tentativa, sem exemplos ou vazio fictício. Sair durante uma consulta e entrar com outra conta: registros anteriores não podem reaparecer.

## Evidências automatizadas

Os testes cobrem contrato HTTP, filtros/datas, paginação, retomada pela URL, erros, consultas concorrentes, cancelamento, sessão/permissões, navegação direta, apresentação histórica, lotes excluídos, validações e leitura dos detalhes. Usam respostas controladas, sem alterar banco ou depender da IA.

Os resultados da suíte, build e teste de navegador são registrados ao encerrar a implementação. A validação funcional manual foi aprovada pelo usuário após a atualização do backend com o PR #39 e a migração V44.

### Resultado em 20/11/2026

- **587 testes aprovados, 1 ignorado**, com Node 24. A entrega acrescenta 49 testes de contrato, navegação, apresentação, permissões e compatibilidade com a remoção já existente.
- Build de produção aprovado; permanece o aviso de tamanho do pacote principal já existente no projeto.
- `git diff --check` sem erros.
- **19 verificações no navegador isolado**, com respostas controladas do contrato: filtros e retomada, atividades/detalhes, cargas excluídas, download, validações, histórico em Dados, erros/nova tentativa, vazio legítimo, cinco perfis, navegação restrita, remoção já existente e visualização móvel a 390 px.
- A consulta da Auditoria não realizou operações de escrita. O teste separado da remoção em Dados utilizou somente respostas controladas, sem apagar dados reais.
- Capturas de tela e registros temporários de verificação em `/tmp/comissionai-front12-*` (não fazem parte do código de produção).

| Parte do fluxo | Evidência | Situação |
| --- | --- | --- |
| Tela, filtros e navegação | Renderização e interação no navegador | Validada com respostas controladas |
| Métodos, URLs, filtros e paginação | Testes HTTP e requisições capturadas | Validados contra o contrato do PR #39 |
| Sessão e restrições visuais | Testes dos cinco perfis, rota e cancelamento | Validados no frontend |
| Consulta e persistência no banco real | Backend atualizado com PR #39, migração V44 aplicada e teste manual informado pelo usuário | Validação manual aprovada pelo usuário |

Nenhum fallback demonstrativo foi adicionado à aplicação. As respostas controladas foram usadas exclusivamente nos testes.

### Aprovação funcional

Em 20/11/2026, o backend foi atualizado para `a8ffb6c` (merge do PR #39), reconstruído e iniciado com sucesso, preservando o banco e os volumes. A migração V44 foi aplicada e o serviço respondeu HTTP 200. Na sequência, o usuário informou que realizou a validação manual e aprovou a entrega. Essa aprovação não constitui um registro detalhado de execução de cada cenário do roteiro acima.
