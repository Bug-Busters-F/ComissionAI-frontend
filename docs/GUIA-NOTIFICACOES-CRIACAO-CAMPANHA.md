# Guia rápido — notificações na criação de campanha

## Comportamento

As ações explícitas usam a loja e o componente de notificações existentes, preservando cores, ícones, posição e fechamento padronizados:

- Salvar rascunho: confirma o salvamento ou informa o motivo da falha. Rascunho já atualizado informa que não há novidades; alterações feitas durante a solicitação continuam indicadas como não salvas.
- Interpretar ou reinterpretar a campanha: confirma a aplicação do resultado e orienta conferir os campos e pendências.
- Aplicar uma reinterpretação individual ou uma alteração de taxa confirmada: confirma a aplicação após a comparação, lembrando de salvar.
- Executar simulação: informa conclusão ou falha.
- Aceitar simulação e ativar campanha: confirma cada operação somente após sua confirmação pelo serviço.

Abertura de confirmação, cancelamento, navegação, edição de campos e validações automáticas não geram toasts. Salvamentos automáticos durante o avanço também não geram uma notificação extra. Só uma notificação deste fluxo permanece visível por vez; notificações de outras áreas são preservadas. Sucessos desaparecem após 5 segundos; erros, após 9 segundos. As mensagens detalhadas de erro e pendências continuam junto dos dados para consulta.

O cartão de sucesso de salvamento foi substituído pela notificação; o indicador de existência de alterações não salvas permanece na página.

## Integração

Alteração somente no frontend. Não exige endpoint nem mudança no backend ou na IA. `campaignActionFeedback.js` envolve as ações explícitas da tela e reutiliza `useNotificationStore` e `ToastContainer`. Resultados negativos nunca geram sucesso. Confirmações pendentes não são tratadas como falha. Cliques repetidos na mesma ação em andamento não repetem a operação.

## Como testar

1. Salvar um rascunho: conferir a notificação padronizada e o indicador de dados salvos. Repetir sem alterações: conferir a mensagem de rascunho já atualizado.
2. Sem vigência, solicitar salvamento: apenas a confirmação de vigência deve abrir. Confirmar e aguardar o resultado; cancelar não deve gerar notificação.
3. Concluir interpretação, aplicar reinterpretação individual, simular e aceitar: conferir um feedback por ação concluída.
4. Provocar falha de conexão durante um salvamento: conferir toast de erro, ausência de sucesso e preservação dos campos.
5. Editar campos e alternar etapas: não devem surgir notificações automáticas.

## Verificação

302 testes automatizados aprovados, incluindo 12 verificações de notificações: espera de confirmação, rejeição, duração, cliques repetidos, ausência de empilhamento, preservação de avisos de outras áreas e mensagem de alterações posteriores ainda não salvas. Build de produção aprovado, com o aviso de tamanho do pacote já existente. Nesta alteração não foram executadas operações reais de salvamento ou ativação para verificar os toasts.
