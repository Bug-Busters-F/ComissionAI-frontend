# Apuração específica da campanha

## Onde usar

Na branch `feat/ajustes-regras-revisao-campanhas`, abra **Campanhas → Detalhes → Resultados da campanha**, logo após Bases da campanha.

- Gerente e administrador executam e consultam.
- Auditor consulta e exporta, sem executar.
- Analistas não consultam esses resultados financeiros nem disparam suas requisições.

Escolha uma competência da vigência, confira as bases e confirme **Apurar competência**. A confirmação informa que os resultados são definitivos e podem substituir cálculos anteriores das mesmas vendas. Uma execução apura um mês; não há soma automática de execuções históricas ou de versões diferentes.

A vigência é intersectada com o mês escolhido. Exemplo: campanha de 15/07 a 10/08 gera recortes de 15–31/07 e 01–10/08, sem incluir vendas fora dessas datas. A versão vigente é enviada explicitamente; uma proposta separada não é apurada.

## Integrações utilizadas

Todas usam a instância HTTP autenticada existente e `VITE_API_URL`.

| Operação | Uso |
|---|---|
| `GET /campanhas/{id}/apuracoes` | Histórico da campanha |
| `GET /campanhas/{id}/apuracoes/{apuracaoId}` | Resultado selecionado |
| `POST /campanhas/{id}/calcular-definitivo?versaoNumero={numero}` | Execução síncrona, prazo de 15 minutos |
| `GET /campanhas/{id}/apuracoes/{apuracaoId}/exportar?tipo=COMPLETO` | Relatório CSV do resultado selecionado |
| `GET /campanhas/{id}` e `/versoes/{numero}` | Conferência da versão vigente e do período |
| `GET /campanhas/{id}/versoes/{numero}/programa-python` | Aprovação válida do código completo |
| `GET /campanhas/{id}/cobertura-fechamento` | Cobertura do mês escolhido e bases associadas |
| `GET /comissoes/fechamento/{competencia}/status` | Bloqueio por fechamento |

Exemplo do corpo da execução:

```json
{
  "competencia": "2025-07",
  "dataInicio": "2025-07-15",
  "dataFim": "2025-07-31",
  "observacoes": "Apuração de julho",
  "forcarRecalculo": false
}
```

A identidade do executor é resolvida pela sessão no serviço. Não se envia nome fictício. A aplicação não oferece a opção de forçar recálculo de competência fechada.

Os anexos continuam sendo enviados/associados na seção existente de Bases da campanha. Seus eventos de associação/efetivação atualizam a conferência. Uma nova conferência ocorre imediatamente antes da escrita. O backend continua sendo a autoridade final para rejeitar a operação.

## Resultado apresentado

Totais retornados de vendas calculadas, comissão e bônus; contagens de vendas, sucessos e impedimentos; versão, competência, datas, executor e protocolo. As vendas disponíveis têm paginação local de dez registros e memória com valores, taxa, origem, bônus e protocolo efetivamente recebidos. Motivos de impedimento são traduzidos para apresentação, sem alterar o resultado armazenado.

Não se calcula um “impacto incremental versus contrato”: esse delta não existe na resposta de apuração. A simulação continua sendo a área de projeções e comparações.

## Falhas e limites observados

- Nenhuma resposta de exemplo, sucesso fictício ou repetição automática de POST.
- Erro de conexão, timeout, resposta inválida após POST ou falha 5xx deixam a solicitação como inconclusiva. A aplicação guarda apenas seus metadados na sessão do navegador, separados por usuário e campanha. Recarregar não reenvia a operação.
- Para reconhecer uma solicitação inconclusiva, consulte o histórico e selecione um resultado novo do mesmo período e versão. O reconhecimento é explícito; a aplicação não atribui automaticamente uma execução concorrente à sua solicitação.
- Se não houver resultado, aguarde e consulte novamente. O contrato atual não oferece consulta de execução em andamento ou chave de idempotência que permita uma repetição automática segura.
- A leitura histórica atual devolve `impedimentos: []` mesmo quando o total é maior que zero. A tela informa que os motivos individuais não foram recuperados.
- Cálculos posteriores podem reassociar vendas e tornar incompleto o detalhamento de uma apuração antiga. A interface compara a quantidade recebida com o total registrado e exibe aviso, mantendo os totais retornados. O CSV vem do relatório disponibilizado pelo serviço e está sujeito à mesma disponibilidade dos dados históricos.
- O endpoint retorna a lista de itens completa; a paginação visual é local. Não há endpoint paginado de vendas da apuração neste contrato.
- As conferências anteriores ao POST reduzem enganos, mas não constituem uma trava transacional contra mudanças simultâneas. A execução definitiva usa as regras e validações disponíveis no backend.

## Verificação

1. Publique uma campanha com código aprovado e bases associadas a uma competência aberta.
2. Confira o período mensal e cancele a confirmação: nenhuma execução deve ser enviada.
3. Confirme e confira os totais, memória, impedimentos e exportação.
4. Recarregue: o histórico permite recuperar o resultado. Confira avisos de detalhes não recuperados.
5. Selecione outro mês ou resultado histórico: o detalhe anterior não deve aparecer como sendo o novo resultado.
6. Confira auditor (consulta/exportação), analistas (área ausente) e competência fechada (execução bloqueada).
7. Em ambiente de teste, interrompa a conexão durante a execução: não deve haver sucesso ou reenvio automático.

Verificação automatizada e navegador com respostas controladas cobrem execução, cancelamento, retomada, exportação e perfis. Consultas reais locais confirmaram os contratos de histórico, versão, cobertura e fechamento. Nenhuma apuração financeira real foi executada como parte da implementação. No ambiente inspecionado, a campanha 7 tem julho/2025 fechado e bases com cobertura pendente: esses bloqueios são preservados.

Somente o frontend foi alterado nesta entrega; nenhum novo endpoint ou ajuste na IA é necessário para as ações descritas. A preservação integral dos detalhes históricos e o acompanhamento seguro de execuções inconclusivas dependem de evolução futura dos contratos citados.

## Correção da preparação das bases

A lista **Usar bases já cadastradas** agora inclui os lotes `taxasBase.lotesDisponiveisNaoAnexados` retornados pelo diagnóstico, além de RH e Vendas. O vínculo usa a mesma operação `POST /campanhas/{id}/anexos-base` e o identificador real do relatório. Os rótulos distinguem RH, Vendas e Taxas de comissão.

Os detalhes iniciam as bases na competência da vigência. Alterações na competência da apuração atualizam a seção de bases e vice-versa, quando o mês pertence à campanha. Associar ou remover um anexo atualiza as verificações da apuração.

Quando a cobertura está pendente, o painel mostra as mensagens de RH, Vendas e Taxas e as referências marca/cargo faltantes recebidas. Não elimina pendências nem simula cobertura completa.

No diagnóstico local desta correção, a campanha Teste 2 (12) estava publicada e com código aprovado, mas apresentava duas pendências de vendas sem aceite, duas referências de matrícula pendentes e falta de associação do lote de taxas de novembro. Incentivo agosto 25 (11) apresentava falta de vínculos RH/Vendas e cobertura de uma taxa. Nenhum anexo ou resultado financeiro real foi modificado para contornar essas restrições.

Para corrigir falta de anexo: selecione a competência em **Bases da campanha → Usar bases já cadastradas → Associar Taxas de comissão** (ou RH/Vendas conforme diagnóstico). Para pendências dos lotes vinculados, utilize a ação existente de auditar/corrigir linhas. Taxas ausentes no cadastro devem ser carregadas/corrigidas em Dados. Reconsulte a apuração após concluir as correções.
