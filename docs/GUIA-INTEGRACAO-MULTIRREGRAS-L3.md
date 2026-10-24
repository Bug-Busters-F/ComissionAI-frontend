# Lote 3 — origens, edição e explicações

## Implementado

Os controles de origem mostram texto, contexto, cadastro, padrão do sistema, operação calculada ou edição manual quando existe evidência. Sem evidência, mostram “Origem não informada”. Origem manual tem prioridade. Mudança de público invalida a atribuição anterior das origens dependentes; referências históricas não certificam valores novos.

Ao tentar avançar, o fluxo envia automaticamente cada proposta pendente a `atualizar-artefatos` e consulta `validar-proposta`. O card e o botão de validação individual foram removidos da interpretação; a explicação permanece na revisão. Após uma correção verificável, o rodapé permite “Verificar correções”, preservando o bloqueio até a confirmação do backend. Taxa manual passa a `DEFINIR_TAXA`; ela não é restaurada pela operação anterior. Outra taxa recalculada requer confirmação. Erros e avisos retornados continuam no bloco. Falha ou resposta antiga preserva os campos e a necessidade de verificar novamente.

Pendências de validações anteriores são substituídas apenas dentro de sua cobertura. Pendências semânticas/desconhecidas e globais não são apagadas por validação cadastral. Descrições divergentes da referência de marca/cargo são apontadas para correção sem substituição silenciosa.

## Como integrar/verificar

Consultar as duas operações disponíveis no backend. Testar taxa manual sobre uma proposta originalmente calculada por base, edição de público, erro de cadastro, resposta com nova taxa e mudança de campo durante a atualização. Limites usam a validação local e de artefatos; não são enviados ao validador cadastral.

## O que falta

Homologação das consultas e disponibilidade da base/cadastros. A resposta não permite distinguir sempre todas as seis origens desejadas nem atesta ausência de fallback cadastral. Para melhorar essa precisão, o backend deve fornecer evidências por campo e revisão, com identificação das dependências.
