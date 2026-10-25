# Guia rápido — correções do PR #15 / FRONT-11

## Escopo

Branch `feat/apuracao-assincrona`, atualizada com a dev. Corrige a integração com o PR #26 do backend sem alterar backend/IA. As alterações de edição/histórico de campanhas permanecem em outra branch.

O commit adicional do colega `2bb59a8` foi incluído na revisão. Foram removidos tanto o progresso estimado por temporizador quanto a inferência de conclusão baseada em logs e o reenvio do cálculo síncrono após F5.

## Operações integradas

| Ação | Operação |
|---|---|
| Solicitar apuração | `POST /api/v1/execucoes/calculo` |
| Consultar estado/conclusão | `GET /api/v1/execucoes/calculo/{id}` |
| Nova tentativa explícita após FALHOU | `POST /api/v1/execucoes/calculo/{id}/retomar` |

Exemplo de solicitação:

```http
POST /api/v1/execucoes/calculo
Idempotency-Key: <chave salva antes do envio>
Content-Type: application/json

{"competencia":"2025-07","recalcular":false,"chaveIdempotencia":"<mesma chave>"}
```

Utiliza a instância HTTP existente e `VITE_API_URL`. A dev do backend com o #26 precisa estar em execução. Não chamar `/comissoes/status/{id}` nem calcular novamente para descobrir se a operação anterior terminou.

## Comportamento

- Preservar UUID, competência, modo e chave de idempotência; mostrar somente o percentual informado pelo backend.
- SOLICITADA corresponde a “Na fila”; PROCESSANDO acompanha a execução; CONCLUIDA libera o resumo confirmado; FALHOU mostra o motivo real.
- Falha de rede, cancelamento do acompanhamento, timeout ou resposta incompatível pausam a consulta. O último percentual real é preservado e “Retomar acompanhamento” consulta o mesmo UUID.
- Se a resposta inicial foi perdida antes de obter um UUID, reenviar somente a solicitação original com a mesma chave. A idempotência do backend evita outra execução.
- Retomar uma execução efetivamente falha é uma nova tentativa explícita, pela operação `/retomar`. Se sua resposta for perdida, consultar o UUID; não repetir a tentativa automaticamente.
- A Topbar recupera o acompanhamento global no carregamento. A view reutiliza esse monitor. F5 e navegação na mesma aba não criam monitores concorrentes nem substituem julho por dados de agosto.
- Enquanto uma execução estiver em processamento ou sem confirmação, novos cálculos permanecem bloqueados. Falha de consulta não é marcada como falha da execução.
- Cache e toast de conclusão somente após resposta CONCLUIDA e resumo válido da mesma execução/competência.

## Resultado disponível e integração futura

O backend atual persiste `resultado` como texto compacto, por exemplo:

```text
vendas=10,sucessos=8,impedimentos=2
```

Não é JSON e não contém totais monetários nem as listas de vendas/impedimentos. O cliente valida as contagens e exibe “—” para valores financeiros ausentes, mantendo o histórico paginado disponível para consulta. Logs anteriores não são usados para afirmar que a execução atual terminou.

Para apresentar novamente o retorno detalhado completo de uma execução assíncrona, uma evolução do backend deverá expor seu snapshot tipado ou uma operação de leitura vinculada ao UUID, incluindo totais, vendas e impedimentos. Não é necessário nem seguro enviar outro cálculo para obter esse resultado.

Os registros antigos `APUR-...` do fluxo anterior não correspondem a execuções persistidas do #26 e não são convertidos em UUID. A nova recuperação usa o escopo `calculation-v2`. SessionStorage só preserva a sessão da aba: encerrar a aba/sessão ou limpar o armazenamento pode perder o vínculo local. Recuperação entre sessões exigiria uma consulta de execuções no backend.

A fila do backend mantém sua limitação já documentada de recuperação após parada abrupta; o frontend não reinicia nem declara concluída uma execução presa no backend.

## Roteiro manual

1. Com uma competência válida e bases carregadas, iniciar uma apuração. Conferir o UUID retornado e o progresso real.
2. Navegar para outra competência com resultado já consultado. Conferir que a Topbar continua identificando a execução original e que resultados de meses distintos não se misturam.
3. Atualizar a página durante a execução. Conferir no painel de rede consultas GET ao mesmo UUID, sem outro POST de cálculo.
4. Interromper a conexão: conferir “Consulta pausada”, ausência de sucesso/falha fictícios e bloqueio de novo cálculo. Restaurar a conexão e retomar o acompanhamento.
5. Conferir conclusão com impedimentos e sem impedimentos. Verificar que contagens refletem a execução e valores financeiros não recebidos não aparecem como zero.
6. Em uma falha real, conferir o motivo; nova tentativa explícita deve usar `/retomar` e respeitar os bloqueios do período.
7. Consultar o histórico: somente leitura, sem disparar cálculo para preencher a tela.

## Evidências

- Suíte frontend: **339 testes aprovados**, um teste de contrato optativo não executado na suíte comum.
- Build de produção aprovado, com o aviso existente de tamanho do pacote.
- O teste de regressão de navegação julho/agosto antes reprovado agora passa.
- Teste optativo executado contra backend da dev e PostgreSQL reais **descartáveis**: envio, pausa após receber UUID e recuperação da conclusão por GET, com apenas um POST. Campanha/IA não foram acionadas. A competência sintética tinha zero vendas; o teste verifica o contrato, não totais financeiros reais.
- Nenhum cálculo ou migração foi executado no banco do usuário.

Para repetir o teste optativo, subir um ambiente descartável com a dev do backend e banco vazio e definir `CALCULATION_CONTRACT_URL` para sua URL `/api/v1` antes de executar `calculationExecution.contract.test.js`. Nunca apontar esse teste para uma competência/banco operacional.
