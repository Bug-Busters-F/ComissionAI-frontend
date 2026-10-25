# Guia rápido — ajustes de interface multirregras

## Alterado

- O título sugerido deixou de ser exibido. O valor recebido permanece nos metadados; o título do usuário é preservado.
- O bloco separado de pendências da campanha foi removido da interpretação e dos resumos de revisão/comparação.
- O card “Pendências totais” mostra a soma das pendências gerais e individuais, com separação entre impeditivas e avisos. Usa a coleção original de validação; não soma novamente as cópias visuais nas regras.
- Pendências gerais continuam visíveis dentro das regras com o prefixo “Campanha:”. Os bloqueios de avanço permanecem ativos.
- A primeira etapa oferece somente “Interpretar e continuar”; não apresenta mais a criação manual. Em modo sem capacidade de interpretação, a ação permanece desabilitada. Para o fluxo real, mantenha `VITE_CAMPAIGN_PROPOSALS_MODE=api`.
- O cancelamento usa um componente visual comum com indicador de processamento e botão com ícone, borda e hover. Na primeira etapa fica no rodapé das ações; na reinterpretação geral, junto ao texto; na individual, antes dos campos bloqueados.
- Os botões de remover regra, inclusive o de confirmação, receberam hover e transição de cor.

## Verificar

1. Na primeira etapa, conferir a ausência do botão de criação manual.
2. Iniciar uma interpretação e cancelar: título e texto permanecem preenchidos, a solicitação fica cancelada e respostas tardias não são aplicadas.
3. Interpretar várias regras com uma pendência geral e uma individual. O contador deve mostrar duas pendências; a geral aparece nas regras como informação compartilhada, sem aumentar novamente o total.
4. Conferir que o título sugerido e o bloco separado de pendências não aparecem.
5. Confirmar que o avanço permanece bloqueado por impedimentos e que os botões de remover regra têm hover.

## Integração

Esses ajustes não exigem mudanças de contrato, backend ou IA. As pendências recebidas continuam preservadas no estado e na validação, com a exceção dos avisos redundantes de vigência descrita abaixo.

O cancelamento utiliza o `AbortController` já integrado: interrompe a espera do frontend e invalida respostas antigas. Garantir o encerramento do processamento no servidor exigiria suporte específico de cancelamento no backend/IA, fora desta alteração.

## Evidências

- 133 testes existentes aprovados e build de produção concluído, com o aviso de tamanho do bundle já conhecido.
- Conferência no navegador com respostas controladas, sem consumir chamadas da Groq: ausência das opções removidas, contador geral sem duplicação, pendências compartilhadas nas regras, bloqueio de avanço e cancelamento da interpretação inicial/completa.
- Alterações restritas ao frontend, sem commit ou push.

## Aviso redundante sobre a vigência

O adaptador da resposta deixa de incluir o aviso geral `TRECHO_NAO_MAPEADO` quando o trecho contém somente a apresentação do período da campanha e as datas correspondem à vigência completa e igual de todas as regras. Isso remove o aviso das regras e do contador sem alterar os dados interpretados.

Exemplos cobertos: “Quero criar uma campanha válida de 1 a 31 de outubro de 2026” e “Vigência da campanha: de 01/10/2026 a 31/10/2026”. Avisos com outras condições, datas diferentes ou ambíguas, vigências ausentes/divergentes e todos os impedimentos continuam visíveis. Trechos não reconhecidos com segurança permanecem como avisos.

Para verificar, faça uma nova interpretação com esse aviso e uma vigência comum correspondente. Depois repita com uma condição adicional no mesmo trecho ou com períodos divergentes: a pendência deve continuar aparecendo.

Esta correção é restrita ao frontend. A IA ainda pode devolver o aviso redundante; uma melhoria futura pode separar os trechos que definem a vigência dos trechos realmente não interpretados na própria resposta. Nenhuma integração adicional é necessária para este filtro.

Verificação desta correção: 145 testes aprovados (incluindo 12 cenários novos) e build de produção concluído, mantendo o aviso conhecido de tamanho do bundle. Os testes usam respostas controladas, sem consumir chamadas da IA.

## Remoção do card de validação e explicação na interpretação

O card abaixo de cada regra, incluindo o aviso de atualização, o botão “Validar e atualizar explicação” e a explicação repetida, foi removido. A explicação continua disponível na conferência das regras.

As operações de atualização de artefatos e validação cadastral continuam sendo executadas automaticamente ao tentar avançar. A indicação de processamento, o cancelamento, os erros e a confirmação de uma eventual taxa recalculada permanecem disponíveis.

Após corrigir campos com uma pendência que essas operações conseguem reavaliar, o botão do rodapé apresenta “Verificar correções”. Ele executa uma nova verificação e só permite avançar quando os impedimentos forem resolvidos. As pendências permanecem visíveis até a confirmação; falhas semânticas e condições fora da cobertura continuam exigindo reinterpretação ou correção apropriada.

Para verificar: interprete uma campanha e confira a ausência do card; avance e confira a validação automática e a explicação na revisão. Provoque uma rejeição cadastral, corrija o campo e use “Verificar correções”; uma nova rejeição deve preservar os dados e impedir o avanço.

Integração: nenhuma operação nova nem mudança no backend ou na IA. Foram aprovados 147 testes e o build de produção, com o aviso de tamanho do bundle já conhecido. Não foram feitas chamadas ao modelo nesta verificação.

## Reinterpretação individual mais compacta

O bloco de texto no modo API passou a seguir a apresentação da demonstração: título discreto, texto e lápis para editar na lateral. O botão “Editar texto e reinterpretar” foi substituído pelo lápis, com nome acessível “Editar texto da regra N”.

Durante a edição, o campo de três linhas substitui o texto de leitura; ficam somente as ações “Reinterpretar” e “Cancelar”, sem repetir o texto anterior ou outro título de edição. Cancelar descarta a edição ainda não aplicada e devolve o foco ao lápis.

Integração: nenhuma adaptação adicional. A operação `extrair-propostas` recebe o texto individual como antes, e a comparação/confirmacão, divisão de regras, cancelamento da solicitação e tratamento de erros continuam sob o mesmo fluxo existente. O provedor continua sendo a Groq, acessada pelo backend/serviço de IA.

Verificação: build de produção concluído (aviso conhecido de tamanho do bundle); conferência no navegador com respostas controladas, sem chamadas à Groq. Conferidos lápis por regra, ausência do botão antigo, editor de três linhas, ação desabilitada para texto vazio, cancelamento preservando o texto e foco, abertura da comparação com três propostas e cancelamento sem substituição. Nenhum erro JavaScript capturado.

Evidência: `/home/renan/Documents/Codex/2026-10-11/new-chat/outputs/Reinterpretacao-Regra-Compacta.png`.
