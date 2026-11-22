# FRONT-8 — Orçamento, simulação Python e calibrações

Mesma branch da FRONT-7. Configurar `VITE_CAMPAIGN_PROPOSALS_MODE=api` e `VITE_API_URL=/api/v1`, com o proxy apontando para o backend. A IA é acessada exclusivamente pelo servidor. O backend precisa da implementação BACK-11 e da migração V45; preserve os volumes ao reconstruir.

## Fluxo disponível

1. Informe orçamento no texto da campanha. Quando retornado, `orcamentoExtraido.valor` ou `orcamentoSugerido` preenche a sugestão; o frontend não extrai nem inventa o valor. Sem sugestão, informe o teto na etapa 3.
2. Após aprovação técnica na etapa 2, confirme explicitamente o orçamento na etapa 3.
3. Escolha uma competência com bases válidas e execute. A tela indica processamento sem simular progresso percentual por item.
4. Confira os cenários 80%, 100%, 120% e 150%, custos projetados, teto, excedente, explicações e limitações recebidas.
5. Cada alternativa é independente. Confira taxas/bônus antes e depois e custo recalculado. **Revisar e aplicar alternativa** abre confirmação; cancelar não envia operação.
6. Confirmar altera somente a proposta. A tela retorna à etapa 2, com novo programa pendente, aprovação e simulação anteriores invalidadas.
7. O cenário 100% acima do teto bloqueia o encaminhamento ao gerente. Uma indisponibilidade de alternativas mantém a simulação principal, sem ser apresentada como ausência de solução.

## Contratos

`PATCH /campanhas/{id}/orcamento`:

```json
{"orcamento":"50000.00","justificativa":null,"versaoEsperada":1}
```

Retorna `OrcamentoCampanhaResponse` (`campanhaId`, orçamento confirmado). Em seguida a campanha é consultada novamente para obter revisão e estado atuais.

`POST /campanhas/{id}/simulacao-python`:

```json
{"competencia":"2025-07","versaoPrograma":1,"limite":10,"pagina":0,"calibrar":true,"solicitacaoId":"UUID por execução"}
```

Timeout de cinco minutos. A mesma intenção após falha reutiliza a chave; uma nova execução após sucesso usa outra chave. Resposta deve confirmar `executadoViaPython`, `versaoProgramaPython` e `checksumPython` iguais ao programa aprovado. Não há fallback para a simulação antiga.

`GET /simulacoes/{id}` fornece a análise persistida. O enquadramento fica em `cenario100.enquadramento`, e não diretamente no cenário. A análise contém `calibracoes`, `explicacoes`, orçamento e assinatura.

`POST /simulacoes/{id}/calibracoes/aplicar`:

```json
{"cenario":"150%","revisaoEsperada":7,"assinaturaProgramaEsperada":"sha256"}
```

A aplicação envia a identidade da alternativa, sem reenviar parâmetros editáveis. Apenas administrador e analista de negócios aplicam. O servidor verifica concorrência, fechamento e fontes.

## Limitações dos serviços atuais

Calibração automática atende o programa gerado com definição direta de taxa. Código personalizado e operações sobre a base continuam executáveis, mas podem exigir ajuste manual para enquadramento; a tela apresenta o motivo recebido. `SEM_SOLUCAO_VIAVEL` e `FALHA` são situações diferentes.

Resultados legados permanecem consultáveis, identificados como anteriores ao fluxo Python quando necessário. Não se fabricam alternativas históricas. O fluxo continua exigindo aceite real e conferência gerencial antes da publicação.

## Teste sugerido

Use uma competência já carregada. Para julho/2025, uma campanha de 01/07 a 31/07, marca PRETO (10), cargo VENDEDOR LOJA (100), lojas 16/13/9 e taxas 3,5%/4%/4,5% permite comparar públicos distintos. Defina um teto inferior ao custo simulado para exercitar as alternativas. Não publique a campanha de teste se o período estiver fechado ou houver concorrência legítima.

## Evidências da integração local (20/11/2026)

Backend reconstruído com V45 e PostgreSQL existente iniciado, preservando o volume. IA dev iniciada na porta 8000. Frontend de conferência na porta 5175.

No navegador, sem interceptação/mock das chamadas: rascunho de teste #3; programa 1 aprovado; orçamento R$ 50.000 confirmado; 589 vendas de julho/2025; execução Python HTTP 201; análise OK com quatro alternativas enquadradas (custos verificados R$ 49.940,13 / R$ 49.977,31 / R$ 49.987,36 / R$ 49.835,26). Cancelamento do modal não aplicou mudanças. Confirmação retornou HTTP 200 e novo programa pendente na etapa 2.

Após preparar as validações e aprovar o programa 2, nova execução HTTP 201. A alternativa aplicada era a de 80%, portanto o custo no cenário 100% ficou R$ 62.425,09: cada alternativa resolve seu próprio cenário, sem prometer enquadrar os demais.

Uma edição técnica adicional foi salva/aprovada como programa 3. Sua execução real também retornou HTTP 201, com simulação principal preservada e análise de calibração `FALHA` explicitando a limitação para código personalizado. Nenhuma campanha foi ativada/publicada nesses testes. O rascunho está identificado como **Validação FRONT-7 e FRONT-8 (teste)**. Navegador sem erros de execução ou respostas HTTP de falha nas operações verificadas.

A aprovação funcional pelo usuário continua sendo uma etapa separada. Os testes automatizados usam respostas controladas e não consomem chamadas ao modelo.
