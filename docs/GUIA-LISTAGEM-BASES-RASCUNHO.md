# Bases existentes em campanhas em rascunho

A seleção de bases agora consulta `GET /api/v1/imports?status=CONCLUIDO&page=...&size=100` em todas as páginas, junto dos anexos ativos. Ela não depende mais da cobertura de fechamento, que considera somente a versão vigente publicada e as competências da vigência.

A interface oferece RH global e arquivos de Vendas/Taxas da competência selecionada. Exclui arquivos removidos, rejeitados, não concluídos ou já anexados. Mantém os identificadores reais `reportId`; associar continua dependendo da confirmação de `POST /campanhas/{id}/anexos-base`. Falhas na listagem são apresentadas como erro, sem mensagem de ausência de arquivos. Respostas de campanhas anteriores são descartadas.

## Verificação

Em rascunho, selecione a competência e abra “Usar bases já cadastradas”. Os arquivos existentes devem aparecer sem novo upload. Vincule com gerente/administrador. Depois, no cartão do arquivo vinculado, use “Auditar e Corrigir Linhas”. Atualize a página para verificar a persistência da associação.

Testes cobrem paginação, falha de consulta, filtros por competência, RH global, deduplicação e exclusão dos anexos ativos. A verificação no navegador usa respostas controladas e não modifica bases locais.

## Restrição atual

A simulação pode consultar uma referência fora da vigência, mas `PreparacaoBaseService.validarVigenciaCampanhaEPeriodoDisponivel` recusa a edição de um lote mensal fora do período da campanha. Portanto, para corrigir Vendas de agosto usadas como referência em campanha de julho, é necessário corrigir o arquivo original e reenviá-lo pelo fluxo de Dados; a associação não elimina essa restrição. Verifique o impacto e as dependências antes de substituir a carga. Arquivos de RH são globais no contrato atual e não possuem competência persistida.

Não há alteração no backend nesta correção.
