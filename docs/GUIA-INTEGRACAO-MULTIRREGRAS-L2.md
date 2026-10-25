# Lote 2 — comparações e reinterpretação

## Implementado

O texto completo apresenta uma confirmação antes do envio, avisando que todas as regras, os ajustes manuais e a vigência serão substituídos. O aviso orienta a usar o lápis do bloco para mudanças pontuais. Após confirmar e receber uma resposta válida com propostas, o conjunto é substituído de uma vez, sem modal posterior de comparação. Título e texto informado são mantidos. Cancelar o aviso não faz requisição; falhas, respostas antigas e respostas sem propostas preservam o conjunto atual.

O texto individual usa o mesmo extrator novo com a vigência comum no contexto. O modal reutiliza o componente da demonstração: texto editável, “Reinterpretar novamente”, campos “Atual → Proposto”, correções e confirmação por “OK”. Mostra inicialmente as alterações; “Ver todos os campos” permite ampliar a conferência. Valores atuais editados manualmente são destacados e os detalhes da proposta preservam explicação, origens e pendências. Alterar o texto bloqueia a confirmação até nova interpretação. Vários resultados exigem “Confirmar divisão”; somente o bloco original é substituído na mesma posição. Outros blocos e edições permanecem. Campos nulos explícitos propõem remoção; propriedades obrigatórias ausentes invalidam a resposta individual.

Requisições integrais/individuais não executam juntas. O bloqueio individual preserva edição nos demais blocos. Snapshots de texto, alvo e contexto evitam aplicar resultados antigos; cancelamento e remoção descartam respostas tardias. Uma alteração de outro bloco não invalida a confirmação individual.

## Como integrar/verificar

Não conectar `/reinterpretar-bloco` nem `/api/v2/reinterpretar`. Conferir requisições a `extrair-propostas`: o corpo individual contém somente seu texto e contexto, sem a descrição completa. Testar cancelamento do modal, mudança de filtro para nulo, correção manual, divisão, remoção durante processamento e edição de outro bloco.

Na campanha completa, testar primeiro cancelar o aviso e depois confirmar. O resultado válido deve substituir o conjunto sem outra comparação. Uma falha deve manter todas as regras atuais. Ver também [guia rápido dos modais](GUIA-MODAIS-REINTERPRETACAO.md).

## O que falta

Homologação com o modelo real para divisão e extração de campos. Uma futura operação dedicada pode substituir o transporte, mantendo as proteções e o formato interno. Não é requisito desta entrega.
