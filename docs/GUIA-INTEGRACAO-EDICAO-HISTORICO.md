# Guia rápido — edição e histórico de campanhas

## O que está integrado

- Campanhas publicadas abrem no mesmo fluxo de quatro etapas, em uma proposta separada. Rascunhos reutilizam sua proposta.
- A edição mostra a versão vigente, o número da proposta e a versão que originou a edição.
- Alteração de campos, reinterpretação completa/individual, divisão e inclusão/remoção de regras usam o fluxo existente. Toda mudança exige salvar e realizar nova simulação/aceite.
- A revisão compara título, descrição, período, filtros, limites e operadores, taxas, operações e bônus. Regras são relacionadas por identidade, nunca pela posição.
- A publicação exige confirmação e informa que a nova versão vale para todo o período.
- “Descartar proposta” remove somente a proposta de alteração; sair sem publicar preserva a versão vigente. Alterações locais não salvas continuam com confirmação de saída.
- Histórico somente para leitura, com os dados, explicações e Python registrados na versão selecionada. Consultar uma versão não altera o formulário.
- Detalhes e listagem apresentam o conteúdo vigente de campanhas publicadas; a edição apresenta a proposta.
- Fechamento e conflitos de edição retornados pelo serviço bloqueiam os controles. O preenchimento local é preservado; recarregar a proposta exige confirmação de substituição.

## Configuração

Usar `VITE_CAMPAIGN_PROPOSALS_MODE=api` e a configuração existente `VITE_API_URL`. O frontend chama somente o backend. É necessário implantar também a branch homônima do backend e sua migração V27; o ambiente antigo não tem todos os contratos desta tarefa.

Operações:

| Ação | Operação |
|---|---|
| Consultar campanha/proposta | `GET /campanhas/{id}` |
| Preparar edição publicada | `POST /campanhas/{id}/proposta` |
| Salvar proposta | `PUT /campanhas/{id}` |
| Descartar proposta | `DELETE /campanhas/{id}/proposta` |
| Histórico / conteúdo publicado | `GET /campanhas/{id}/versoes` e `GET /campanhas/{id}/versoes/{numero}` |
| Publicar | `POST /campanhas/{id}/ativar`, corpo `{ "versaoEsperada": 1 }` |

A resposta da campanha inclui `revisaoControle`, `versaoOrigem` e `motivoBloqueioEdicao`. Enviar a revisão recebida em `X-Campanha-Revisao` nas mutações. A revisão pode ser zero: não testar sua presença por valor booleano. A aceitação da simulação pode alterar a revisão; o cliente a consulta novamente antes da publicação.

Nas interpretações de uma campanha existente, enviar `contexto.campanhaId` como texto e `contexto.origem = "VERSAO_EXISTENTE"`. Isso permite desconsiderar as próprias regras vigentes na consulta de concorrência. A interpretação individual continua enviando somente o texto daquele bloco e sua vigência herdada.

## Roteiro manual

1. Abra uma campanha publicada e registre o título, as regras e a versão vigente.
2. Escolha Editar: confira a proposta baseada na versão vigente. Volte aos detalhes: os valores vigentes devem continuar iguais.
3. Altere uma taxa, salve a proposta, saia e reabra. A proposta deve manter a alteração, sem alterar a versão vigente.
4. Reinterprete um bloco; cancele a comparação. Repita e confirme. Confira a preservação das outras regras.
5. Simule, aceite e confira as diferenças da revisão. Publique e verifique o novo número da versão e o histórico anterior.
6. Inicie outra edição e descarte a proposta. Confira a preservação da versão publicada e de sua simulação.
7. Em duas abas, abra a mesma proposta. Salve uma alteração na primeira e tente salvar/publicar/descartar na segunda. Deve ocorrer conflito sem sobrescrever dados. Recarregue somente após conferir o aviso.
8. Consulte uma campanha de competência fechada: histórico disponível, edição/publicação bloqueadas.
9. No histórico, alterne versões e confira as explicações e os códigos; copie o Python. A consulta não deve alterar a proposta.

## Verificações e limites

Testes automatizados usam respostas controladas e testes HTTP do backend, sem chamar o modelo. Houve verificação no navegador com backend e PostgreSQL reais **descartáveis**, campanha sintética e simulação sem vendas, incluindo retomada da revisão e publicação de nova versão. Isso verifica o ciclo de versões, não os valores financeiros de uma base real.

Não foram reiniciados nem migrados os serviços/banco usados normalmente. Ainda é necessário reconstruir o backend da nova branch e testar o fluxo com as bases reais e a IA configurada. Nenhuma alteração na IA é necessária nesta tarefa; seus limites de disponibilidade continuam aplicáveis.

## Resultado das verificações desta entrega

- Frontend: 312 testes passaram; build de produção gerado (permanece o aviso já existente de tamanho do pacote).
- Backend: suíte geral com 393 testes, 385 aprovados e 8 condicionais não executados; sem falhas. Testes dirigidos das últimas correções também aprovados.
- PostgreSQL 16: cinco testes de migração aprovados, incluindo V26→V27, em banco descartável.
- Navegador: revisão retomada, comparação vigente/proposta, publicação confirmada e consulta/cópia do Python da versão anterior verificadas com backend real e dados sintéticos.
- A nova proposta de uma campanha publicada abre nas regras existentes (etapa 2), permitindo editar campos sem uma chamada obrigatória à IA. As etapas anteriores continuam acessíveis.
- As alterações estão na branch `feat/edicao-historico-campanhas` nos dois repositórios. Sem commit ou push nesta entrega.

### Identificação da versão atual

A listagem e o cabeçalho dos detalhes exibem “Versão atual: N”, usando `versaoVigente`. Uma proposta pendente aparece separada, usando `versaoProposta`; não é apresentada como vigente. Campanhas sem versão publicada mostram “Ainda não publicada”. Não é necessária outra operação ou alteração no backend.

### Seleção inicial do histórico e saltos de numeração

Nos detalhes, o histórico recebe `versaoVigente`, seleciona essa versão automaticamente e a identifica como “Atual”. Não presume que uma proposta seja publicada. A campanha conferida tinha versões 1 PUBLICADA, 2 CANCELADA e 3 PUBLICADA. Abrir a edição prepara uma proposta persistida e reserva um número antes do salvamento explícito; descartar mantém esse número como cancelado. Portanto, o histórico de publicações pode ter intervalos. Nenhum registro foi renumerado ou alterado nesta conferência.

### Destaque da Home

O indicador principal da Home utiliza fundo verde claro e textos escuros do tema. Mudança somente visual; não requer integração nem alteração no backend.
