# Guia rápido — retomada do rascunho

Ao abrir um rascunho pela listagem, a campanha retoma a maior etapa alcançada, e não a última visitada. Exemplo: chegar à Conferência (etapa 4), voltar à Proposta (etapa 1), sair e reabrir leva novamente à etapa 4.

## Integração

Alteração somente no frontend. Reutiliza `etapaMaisAvancada` retornada na consulta da campanha e já mantida pela operação de progresso. `ultimaEtapa` continua registrando a navegação mais recente, sem reduzir o histórico. Não exige novo endpoint ou alteração no backend.

Uma URL com etapa explícita mantém a navegação solicitada. As verificações existentes continuam valendo: aceite ausente ou inválido leva à Simulação; requisitos pendentes levam à etapa de correção. A retomada não salva regras nem cria outro aceite.

## Como testar

1. Abrir um rascunho, avançar à Simulação, voltar à etapa 1 e sair. Reabrir pela listagem: deve retomar a etapa 3.
2. Aceitar uma simulação válida e chegar à Conferência. Voltar à etapa 1, sair e reabrir: deve retomar a etapa 4.
3. Reabrir um rascunho cujo aceite deixou de ser válido: deve abrir a Simulação, preservando o histórico da etapa 4.

## Verificação

290 testes automatizados aprovados, incluindo retomada das etapas 1 a 3, retorno à etapa 4 com aceite válido e recuo à Simulação sem aceite válido. Build de produção aprovado, com o aviso já existente de tamanho do pacote. Não foi executada uma nova verificação com serviços reais nesta alteração.
