# Lote 2 — simulação real de todas as regras

## Disponível

O layout de simulação foi reaproveitado da `origin/dev` (`519ed06`), com adaptação ao contrato real. A entrada usa a campanha já salva: `{ campanhaId, competencia }`. Não converte apenas a primeira regra nem calcula resultados financeiros fictícios em caso de falha.

Operações:

- `GET /api/v1/referencias/competencias`: lista real; lista vazia permanece vazia.
- `POST /api/v1/referencias/recortar-publico`: valida o público da campanha salva.
- `POST /api/v1/simulacoes`: execução síncrona; usa ID, protocolo, totais e cenários do backend.
- `GET /api/v1/simulacoes/{id}/vendas?page=0&size=10&sort=id,asc`: paginação real. Os totais continuam sendo do recorte completo.

O navegador mostra processamento sem inventar percentuais intermediários. Memórias individuais e consolidada são os textos recebidos do serviço. A projeção da base exibida deriva da comissão e do delta projetados recebidos; o frontend não reexecuta o motor financeiro. Os cartões 80/120/150 exibem os consolidados históricos de cada cenário, antes da projeção temporal.

## Como conferir

1. Corrija impedimentos, avance e confira o salvamento da versão validada.
2. Escolha uma competência disponível, confira o recorte e execute.
3. Confira protocolo, cenários, paginação e memória de uma venda.
4. Em falha ou recorte sem vendas/sem cobertura, não deve aparecer resultado substituto de demonstração.

## O que falta no ambiente atual

O backend em execução em 22/10/2026 ainda não expunha `/simulacoes` e não havia competências cadastradas. Para homologação financeira real, executar a versão atual do backend e carregar as bases necessárias pelo fluxo de Dados. Nenhum arquivo do backend/IA foi modificado. A simulação determinística não depende de chamadas à Groq.
