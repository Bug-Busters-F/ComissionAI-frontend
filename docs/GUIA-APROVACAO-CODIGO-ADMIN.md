# Revisão técnica e fluxo completo pelo administrador

## Diagnóstico da campanha Agosto 25

A consulta real local da campanha 10 encontrou a competência 08/2025 aberta, programa pendente de revisão e três regras salvas com `rastreabilidade.artefatosAtualizados=false` e `completa=false`. O orçamento está extraído (R$ 90.000), ainda não confirmado. A aprovação técnica fica bloqueada até negócios validar e salvar as regras; não se trata de falta da permissão do analista de código.

A aprovação não foi executada e os dados reais não foram alterados durante a verificação.

## Como desbloquear

1. Como analista de negócios, use **Validar e enviar para revisão** na etapa 2; confira eventuais correções e confirme os resultados propostos.
2. Como administrador, a mesma preparação está em **Validar dados e preparar revisão**, no painel do código.
3. Como analista de código, clique em **Atualizar revisão**. Essa ação agora busca também a proposta salva, não apenas o programa: correções feitas por negócios em outra sessão passam a ser consideradas.
4. Confira o programa e aprove. Se precisar devolver, informe o motivo; pendências de preparação não impedem essa devolução.

A tela apresenta o motivo da preparação pendente, com os números das regras envolvidas. Não permite editar o código ou aprová-lo enquanto as regras não estiverem verificadas. O controle também é aplicado no coordenador das requisições, além dos botões.

## Administrador sozinho

O servidor já permite ADMINISTRADOR em todas as operações do fluxo. O frontend preserva essas permissões e deixa explícito que o administrador pode preparar regras, revisar/editar/aprovar o código, confirmar orçamento, simular, aceitar e publicar sem trocar de conta.

Na etapa 4, **Concluir e ativar campanha** utiliza uma única confirmação. Ela executa o encaminhamento existente, se necessário, e somente após sua confirmação prossegue com a publicação. Não exige encaminhar o trabalho a outra pessoa. Uma proposta já encaminhada não é encaminhada novamente. Os demais perfis mantêm suas responsabilidades.

São mantidos os bloqueios de validação, conflito de edição, revisão técnica, orçamento, simulação aceita e fechamento. Uma resposta de encaminhamento sem identificação e confirmação explícita não é tratada como sucesso.

## Integrações

- GET da campanha, do programa e de seu histórico para atualizar a revisão.
- POST de atualização dos artefatos e validação cadastral, seguido do salvamento existente da proposta.
- POST de aprovação/rejeição do programa completo, com assinatura esperada na aprovação.
- POST `/campanhas/{id}/encaminhar-gerente`, seguido de POST `/campanhas/{id}/ativar` para concluir como administrador.

Nenhuma alteração no backend ou na IA foi necessária para estes ajustes. Não há nova chave, usuário fictício ou aprovação automática do código.

## Testes

O navegador com respostas controladas reproduziu a campanha Agosto 25 bloqueada, a atualização após validação por negócios e a aprovação pelo analista de código. Também percorreu aprovação técnica, simulação, aceite e publicação pelo administrador, conferindo a ordem encaminhamento → ativação. Os testes automatizados verificam as permissões, as regras não verificadas, a devolução e a interrupção da publicação quando o encaminhamento falha.

Para validar com serviços reais, execute os passos acima em competência aberta e acompanhe os resultados. O orçamento deve ser confirmado na etapa 3. A competência fechada continua bloqueando o fluxo inclusive para administrador.

## Posição da ação de preparação

A ação **Validar dados e preparar revisão** aparece no cabeçalho do painel, em verde e com ícone. No celular, ocupa a largura disponível. Durante a preparação, mostra indicador de processamento e permanece bloqueada contra cliques repetidos. **Atualizar revisão** fica como ação secundária. As permissões e integrações permanecem as mesmas; não há nova integração necessária.
