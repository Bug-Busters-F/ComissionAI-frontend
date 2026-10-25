# Lote 4 — ativação, consulta e proteções

## Disponível

Após conferência, “Aprovar e ativar campanha” pede confirmação com número de regras, vigência e protocolo. Reconfere a versão persistida e a aptidão retornada pelo backend e chama `POST /api/v1/campanhas/{id}/ativar`.

Não há PUT entre aceite e ativação: esse PUT invalidaria a simulação aceita. Só é exibida ativação concluída após retorno da campanha correta com estado `ATIVA` e a coleção de regras.

A listagem real conta `regras[]`; os detalhes mostram todos os blocos. Campanhas fora de DRAFT ficam somente para consulta no fluxo novo e não são rebaixadas por salvamento. Não existe histórico inventado de versões. Edição versionada e fechamento permanecem fora desta entrega.

## Proteções

- URL e navegação não liberam conferência sem aceite formal da versão atual.
- A saída com mudanças não salvas mantém confirmação. Operações de gravação em andamento impedem saída acidental.
- GET de conferência da versão persistida detecta mudanças externas antes de PUT, simulação, aceite e ativação; os campos locais são preservados.
- Essa verificação preventiva não é uma trava transacional: garantia completa de concorrência exige versão/ETag no backend. A ativação continua submetida à validação do hash no servidor.
- O Python da interface continua explicitamente demonstrativo e nunca é persistido como equivalente real. Explicação/Python reais só são enviados se os artefatos estiverem atuais.

## Como conferir

Aceite uma simulação, abra a confirmação final, confirme e consulte as três regras na campanha ativa. Confira na rede que não houve PUT após aceite. Tente acessar a edição de uma campanha ativa: não deve haver controles de gravação. Em rejeição do backend, o rascunho e os resultados são preservados.

## Validação pendente no ambiente real

O container atual não contém o endpoint `/campanhas/{id}/ativar` presente no código dev; a tentativa retornou erro de operação não encontrada. Não houve ativação real durante o teste. Atualizar o processo/container a partir do código atual e disponibilizar bases são requisitos de homologação, sem necessidade de alterar o código do backend nesta entrega.
