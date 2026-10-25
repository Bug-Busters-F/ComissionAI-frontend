# Guia rápido — memória da simulação e linguagem da interface

Branch: `feat/revisao-rastreabilidade-campanhas`. Alterações somente no frontend.

## Entrega

- “Ver memória” passa a apresentar cartões de valores, fontes da venda/público/taxas, regra aplicada, formação da comissão, bônus, arredondamento e cenários individuais. A explicação extensa fica recolhida em “Explicação detalhada”.
- Valores por venda são históricos da competência; a projeção temporal é explicada separadamente, sem recalcular ou substituir os resultados recebidos.
- O diálogo tem fundo escurecido, cabeçalho fixo, rolagem própria, fechamento com Escape, foco inicial e retorno ao botão que o abriu.
- Cancelar/Voltar ficam no grupo secundário à esquerda e Salvar rascunho/avanço no grupo principal à direita, de maneira consistente nas quatro etapas. Em telas estreitas os grupos se organizam verticalmente.
- Na simulação ainda não aceita, o botão principal do rodapé abre o aceite. Após o aceite, a área de resultado informa apenas o estado; o acesso à revisão continua pelo avanço do rodapé ou pela etapa já visitada.
- Foram revisados textos da criação/revisão, Dados, envios, cálculo, notificações e erros. A apresentação traduz nomes internos, elimina detalhes de armazenamento/processamento e usa termos de negócio. O Python solicitado para conferência permanece íntegro.
- Avisos de trecho não mapeado são ocultados da apresentação e do contador de pendências. Impedimentos da mesma natureza permanecem visíveis. As mensagens originais continuam guardadas para validação/auditoria.

## Dados utilizados e integração

A memória usa o detalhamento já disponível em GET `/api/v1/simulacoes/{id}/vendas`: venda original, data, público, taxa contratual, regra/origem da taxa, comissão, bônus e cenários. O contexto de competência/vigência vem da simulação carregada.

`REGRA_PROPOSTA` identifica a aplicação da campanha; `BASE_COMISS` identifica a taxa contratual mantida quando a condição da campanha não é atendida. Não são inventados nomes de arquivo, documentos, consultas ou edições manuais que a resposta não comprove. Respostas antigas sem detalhamento mostram a ausência da evidência correspondente.

Nenhuma alteração de endpoint, banco ou IA é necessária. Para indicar futuramente o arquivo/lote exato da venda, do vínculo RH ou da taxa contratual, o contrato deverá fornecer essas referências. A interface atual apresenta somente as fontes efetivamente disponíveis.

## Conferência rápida

1. Simular uma campanha, abrir “Ver memória” em vendas de lojas diferentes e conferir taxa, regra, valores e cenários com a linha da tabela.
2. Conferir uma regra com bônus e outra cuja faixa não seja atendida: o total deve manter os valores recebidos e a origem deve distinguir campanha e taxa contratual.
3. Fechar com Escape e verificar o retorno do foco ao botão de origem.
4. Conferir uma proposta com aviso de trecho não mapeado: o aviso não aparece nem aumenta o contador; impedimentos continuam bloqueando.
5. Aceitar e retornar à simulação: a área do resultado mostra o texto de aceite, sem oferecer novamente o mesmo botão. Avançar para a revisão pelo rodapé.
6. Nas quatro etapas, conferir Cancelar/Voltar, Salvar rascunho e a ação principal sem botões duplicados na revisão.

## Verificação

289 testes automatizados aprovados e build de produção aprovado. Testes cobrem fontes presentes/ausentes, bônus, taxa contratual alternativa, cenários, limpeza de mensagens, preservação de impedimentos e ausência do botão de novo aceite.

Conferência visual realizada nas quatro etapas usando o frontend real com respostas controladas em um serviço temporário, alimentadas com uma simulação já existente. O diálogo, o aceite já registrado, a ausência do aviso e os botões foram conferidos no navegador. Essa conferência não salvou, aceitou nem ativou campanhas no serviço habitual e não chamou a IA.
