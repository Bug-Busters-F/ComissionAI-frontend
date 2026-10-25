# Guia rápido — etapas e revalidação de concorrência

Alteração somente no frontend, na branch `feat/revisao-rastreabilidade-campanhas`.

## Comportamento

- Etapa atual com fundo claro e sombra, sem o verde escuro anterior.
- Removidos os textos de etapa atual, concluída, visitada e não iniciada. Número/check e nome continuam visíveis; `aria-current="step"` identifica a atual para acessibilidade.
- Etapas que ainda não foram visitadas ficam apagadas e desabilitadas com `disabled`, sem clique de mouse ou ativação pelo teclado. O avanço continua pelos botões do formulário e mantém as validações existentes.
- Etapas já visitadas permanecem acessíveis, respeitando as verificações de navegação do fluxo.

## Correção após remover uma campanha concorrente

A proposta podia conservar o impedimento `CONFLITO_REGRA` recebido antes da exclusão. O botão de avanço ficava desabilitado, impossibilitando consultar novamente o backend.

Agora “Verificar correções” permite uma nova verificação desse impedimento. A atualização de artefatos e a validação existentes continuam sendo utilizadas. A pendência só é retirada após `/interpretador/validar-proposta` confirmar explicitamente:

- `valida: true`;
- `analiseConcorrencia.totalConcorrentes: 0`;
- `temEmpate: false`, `temIdentica: false`;
- `regrasConcorrentes: []`.

`valida: true` isoladamente não basta: a API pode informar concorrência como aviso. Respostas ausentes/incompletas, falhas e concorrência ainda existente mantêm o bloqueio. Outras pendências semânticas não são descartadas.

## Como testar

1. Manter aberta uma proposta com `CONFLITO_REGRA`, remover a campanha antiga em outra tela e retornar.
2. Clicar em “Verificar correções”. Se o backend confirmar ausência de concorrência e não houver outro impedimento, o fluxo deve salvar e abrir a simulação.
3. Repetir sem remover a concorrente: o avanço deve continuar bloqueado.
4. Conferir a navegação: etapas futuras apagadas não respondem ao clique; etapas já visitadas continuam acessíveis; a atual tem fundo claro sem textos auxiliares.

## Integração e validação

Não exige novo endpoint ou migração. Reutiliza `analiseConcorrencia` já retornada pelo backend atual. Não executa uma nova interpretação completa da campanha.

281 testes do frontend aprovados, incluindo recuperação do bloqueio, preservação da pendência sem confirmação do backend e navegação das etapas. Build de produção verificado; mantém-se o aviso já existente de tamanho do pacote.

## Bloqueio sem impedimentos — contrato do backend em execução

Na verificação da campanha #7, o backend antigo devolvia as regras completas, mas omitia `versaoProposta` e `regras[].rastreabilidade`. O frontend atualizava os artefatos e, após salvar, tratava a resposta novamente como legada. Isso impedia o avanço mesmo com zero pendências impeditivas.

O serviço local foi reconstruído e reiniciado com a branch de integração, mantendo o banco e os dados existentes. Foi gerada uma cópia de segurança local antes da atualização. As três regras foram verificadas nas operações reais de atualização de artefatos e validação: todas completas, com Python, validação válida e zero concorrentes. Não foi salva nem ativada a campanha durante essa conferência.

O frontend agora interrompe uma resposta de salvamento incompatível com uma mensagem específica para atualizar o backend, em vez de repetir a orientação genérica de validar os campos. Uma resposta incompatível também não é tratada como confirmação de sucesso.

Após atualizar o serviço, recarregar a página da interpretação e clicar em “Ir para simulação”. O aviso de trecho não interpretado continua visível e não se torna um impedimento. A navegação inicial também registra a etapa válida presente na URL, inclusive quando o rascunho legado não tinha histórico de progresso.

Verificação desta correção: 282 testes do frontend aprovados e build de produção aprovado.
