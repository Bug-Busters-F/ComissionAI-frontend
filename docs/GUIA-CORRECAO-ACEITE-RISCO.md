# Correção do envio de aceite de risco

## Causa corrigida no frontend

A tabela enviava `ADVERTENCIA` para uma operação cujo enum aceita somente `AVISO` e `IMPEDIMENTO`. A requisição falhava antes de executar a regra de negócio. Agora `ADVERTENCIA` e `AVISO` são enviados como `AVISO`; as duas grafias de impedimento continuam exigindo correção, sem aceite.

O aceite de uma linha consulta as pendências reais dos lotes associados à campanha e identifica uma única inconsistência pelo arquivo, número da linha e campo. A requisição inclui `inconsistenciaImportacaoId` e um identificador estável, sem confundir linhas de arquivos distintos. Não inventa um aceite quando o diagnóstico não identifica a origem ou quando há ambiguidade.

A identidade do responsável é obtida pela sessão no serviço. A interface exige confirmação real (`status=ACEITA`, campanha e identificador correspondentes), atualiza a cobertura e apresenta rejeições dentro do modal. As mensagens dos erros de preparação também passam a usar `motivo`, conforme o contrato, além do formato antigo `mensagem`.

## Operações utilizadas

- `GET /campanhas/{id}/cobertura-fechamento/pendencias`, paginado e filtrado pelo tipo de base/competência.
- `POST /campanhas/{id}/pendencias/aceite` com `severidade=AVISO`, justificativa e identificação da inconsistência importada.

Nenhum aceite real foi registrado durante os testes.

## Integração com campanhas publicadas

O backend diferencia advertências de arquivos das pendências das regras. Gerente e administrador podem aceitar uma inconsistência real de uma base vinculada à versão vigente, com competência aberta. A severidade, mensagem e campo são conferidos na origem; o autor vem da sessão. Não altera regras, programa aprovado nem resultados anteriores.

Erros impeditivos, arquivos removidos/rejeitados, fontes não vinculadas, versões históricas e competências fechadas continuam bloqueados. Aceites de propostas ou versões antigas não são emprestados à vigente.

## Teste manual

Abra uma campanha publicada com competência aberta, consulte uma advertência de um lote vinculado, informe uma justificativa válida e confirme. O modal deve fechar somente após confirmação real e o diagnóstico deve ser atualizado. Recarregue para verificar a persistência. A ausência de outro requisito, como as taxas de comissão, continua exigindo correção própria antes da apuração.

As verificações automatizadas usam dados isolados. Nenhum aceite foi registrado em nome do usuário nas campanhas locais.
