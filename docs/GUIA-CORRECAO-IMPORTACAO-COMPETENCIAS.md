> Atualizado pela integração da dev: consulte também [GUIA-INTEGRACAO-DEV-MULTIRREGRAS.md](GUIA-INTEGRACAO-DEV-MULTIRREGRAS.md). A implementação atual segue o contrato da dev: parâmetros na query string, arquivo no multipart, sem duplicação.

# Correção da importação RH + Vendas e das competências

## Causa e comportamento corrigido

O upload de vendas não informava a competência obrigatória. O frontend capturava qualquer falha da API e gerava um relatório de sucesso com quantidades estimadas pelo tamanho do arquivo. Além disso, considerava o HTTP 202 de uma importação assíncrona como conclusão. O card era apenas local; após F5, não havia vendas persistidas que sustentassem aquela competência.

No diagnóstico do ambiente real em 22/10/2026, a API retornou 529 matrículas, três lotes de RH concluídos, nenhuma venda e nenhuma competência de referência. RH não é uma competência mensal por si só.

Agora:

- `POST /api/v1/imports/upload` recebe `file`, `importType` e, para SALES/COMISSIONS, `competencia` em `YYYY-MM` somente na query string. Não duplicar esses campos no multipart: o binding do Spring combina os valores e rejeita a competência duplicada.
- O frontend aguarda `GET /api/v1/imports/{reportId}` até `CONCLUIDO`. `PENDENTE`/`PROCESSANDO` não são sucesso. Falhas retornam a mensagem do backend, sem exemplos ou estimativas.
- RH é confirmado antes de enviar vendas. São duas importações, sem transação única: se vendas falhar, RH permanece. A mensagem informa essa situação e o relatório disponível.
- Para arquivos idênticos, o frontend trata somente o conflito 409 que identifica `Já existe um lote ativo (reportId=..., status: ...)`. O backend já comparou hash, tipo e competência. O relatório é consultado e seu ID, tipo e arquivo são conferidos; o lote precisa estar concluído. Não há reutilização por nome, nem sucesso presumido para conflitos genéricos.
- Os IDs dos lotes e as mensagens de processamento são preservados no relatório da sessão. A contagem de RH significa linhas processadas; não necessariamente novas matrículas, pois o backend pode ignorar matrículas existentes.
- Os cards são reconstruídos por `GET /api/v1/referencias/competencias`, a mesma fonte usada pela simulação. Uma resposta vazia remove cards locais sem dados confirmados. Vínculos e taxas ausentes aparecem como pendências.
- A importação avulsa de taxas também aguarda confirmação e envia a competência. A interface seleciona um mês, compatível com o contrato mensal disponível, em vez de prometer um intervalo de vigência arbitrário.
- O acompanhamento tem limite de cinco minutos. Uma falha de rede, cancelamento ou tempo esgotado não confirma sucesso nem cancela o processamento já aceito no servidor. O ID conhecido permanece no erro.

Os cenários de demonstração continuam explícitos e separados do modo real. Não são usados como recuperação de falhas reais.

## Como testar no ambiente real

1. Atualize a página do frontend. Estas alterações não exigem reiniciar backend ou IA.
2. Abra **Enviar ciclo (RH + Vendas)**, escolha o mês correspondente às datas das vendas e anexe os dois arquivos.
3. É possível selecionar o mesmo RH já importado. Ele só será reaproveitado se o backend confirmar o lote idêntico pelo conflito descrito acima.
4. Aguarde a confirmação dos dois processamentos. Se houver erro de competência, estrutura, vínculos ou duplicidade não recuperável, a mensagem real será exibida; corrija o arquivo ou a competência e tente novamente.
5. Conclua o relatório e pressione F5. O card deve reaparecer com vendas persistidas; confira o mesmo mês no seletor de referência da simulação.
6. Caso a referência apresente pendências, consulte seus vínculos de RH e cadastre as taxas do mesmo mês. A existência de vendas não garante que todas sejam aptas à simulação.

## Verificações realizadas

- Suíte completa: **225 testes aprovados em 25 arquivos**; build de produção aprovado. Aviso de tamanho do bundle permanece.
- Testes controlados cobrem recibo assíncrono, erro HTTP e de processamento, recuperação de duplicidade, recibo inválido, cancelamento, tempo esgotado, competência, falha parcial e recriação dos cards em uma nova instância do estado.
- Navegador com API isolada: começou sem competências; reutilizou RH via 409; enviou vendas com `2025-08`; consultou PROCESSANDO → CONCLUIDO; exibiu o card; após recarregar, reconstruiu a mesma competência. Nenhum dado de teste foi gravado no banco real.
- A importação completa com os arquivos do usuário ainda deve ser repetida no ambiente real. A correção não consegue recuperar vendas que nunca foram gravadas.

## Ajuste após validação no Spring em execução

A primeira correção enviava `competencia` no multipart e na query string. No servidor real, a combinação dos parâmetros era rejeitada pelo formato `YYYY-MM`, mesmo com o mês correto. Após a integração da dev, `importType` e `competencia` são enviados uma única vez na query string, com o arquivo no multipart. As duas formas isoladas foram aceitas no diagnóstico; a duplicação é que causava rejeição.

Verificação sem gravar dados: o envio duplicado com arquivo vazio retornou o erro de competência; o envio apenas no multipart passou dessa validação e retornou a rejeição esperada de arquivo vazio. O cliente corrigido foi executado contra o backend real para SALES e COMISSIONS e obteve essa mesma rejeição de arquivo vazio, antes da criação do lote. Foram acrescentadas regressões para impedir a duplicação nos dois tipos de importação.

A importação com as planilhas reais deve ser repetida; essa verificação confirma o contrato HTTP, sem afirmar que o conteúdo das planilhas foi validado.

## Pontos para futuras integrações

- O backend poderia retornar o `reportId` existente como campo estruturado no 409, evitando depender do texto da mensagem.
- Não foi alterada a persistência do histórico visual de envios, nem o fluxo de exclusão. Os cards de competência, por sua vez, vêm do backend e sobrevivem ao F5.
- Esta correção não implementa endpoints de simulação/publicação ausentes no servidor em execução; apenas corrige a ingestão e a referência de competência que alimenta esse fluxo.
