# Simulação: alternativas e bloqueio por orçamento

## Interface

A confirmação do orçamento permanece no início da etapa 3. Os resultados financeiros e os cenários de sensibilidade vêm antes das alternativas de ajuste, que agora ficam antes da tabela de vendas.

O card principal informa se o cenário de referência (100%) está dentro ou acima do orçamento, com teto e excedente. Os demais cenários têm sinalização individual. Nas alternativas, o custo original acima do teto é distinguido do custo sugerido após o ajuste.

## Aceite

O custo total projetado de comissões no cenário 100% é o critério de bloqueio, conforme a regra já aplicada pelo backend. Cenários de 120% ou 150% acima do teto geram alertas de sensibilidade e não bloqueiam isoladamente o aceite do cenário de referência.

Quando o cenário 100% excede o teto:

- O botão de aceite fica desabilitado e há uma explicação ao final da etapa.
- O modal e a operação local de aceite também bloqueiam a confirmação.
- A conferência/publicação não é liberada por um aceite antigo incompatível com o orçamento.
- O usuário pode aplicar uma alternativa confirmada ou ajustar o orçamento e simular novamente.

A comparação usa preferencialmente o orçamento registrado no próprio resultado, e não um valor posteriormente digitado. Os valores são comparados em centavos. Custo igual ao teto permanece permitido.

## Integração

Somente frontend. Os endpoints de simulação, aplicação de alternativa e aceite permanecem iguais. O backend já rejeita o aceite acima do orçamento no cenário 100%. Aplicar uma alternativa continua exigindo nova revisão técnica e simulação.

## Verificação

Testes automatizados cobrem comparação de valores, igualdade no teto, orçamento do resultado, cenários independentes, bloqueio antes da chamada de aceite e posição das alternativas. A conferência no navegador usou respostas controladas: teto de R$ 90 mil, custo acima do teto, excedente visível, aceite desabilitado e modal de confirmação da alternativa. Não foi executada uma calibração nova contra o provedor real de IA nesta verificação.
