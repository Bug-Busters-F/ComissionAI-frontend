# Área de bases da campanha — interface simplificada

A etapa de simulação usa o seletor de competência já existente. O bloco de bases mostra o envio de RH + Vendas e a opção recolhida “Usar bases já cadastradas”. Os anexos, correções, diagnósticos e a recuperação de falhas de associação foram preservados.

Foi removida a explicação permanente sobre bases compartilhadas, o cartão de consolidação e os avisos repetidos de perfil. O alerta de compartilhamento aparece ao selecionar arquivos para envio. Usuários sem permissão recebem uma única mensagem e os controles permanecem bloqueados.

Nas outras telas que usam este componente, o seletor de competência continua disponível para preservar o uso independente da simulação.

## Integração

Nenhuma operação nova ou alteração de backend/IA é necessária. As operações de envio e associação continuam as mesmas; taxas contratuais continuam sendo gerenciadas em Dados.

## Verificação

- Testes existentes do componente e da associação de bases.
- Build de produção.
- Navegador com respostas controladas: negócios sem permissão de envio; administrador com aviso exibido somente após selecionar um arquivo, sem upload real.
