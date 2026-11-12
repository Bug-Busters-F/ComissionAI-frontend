# Guia rápido — FRONT-3: autorização real e pendências da esteira

## Integrado

A identidade, o perfil e as permissões vêm de `/auth/me` e do login real, não de contas de exemplo. Os cinco identificadores oficiais são `ADMINISTRADOR`, `ANALISTA_NEGOCIOS`, `ANALISTA_CODIGO`, `GERENTE_VENDAS` e `AUDITOR`. O backend mantém a autorização efetiva; ocultar um botão não substitui essa proteção.

| Perfil | Etapas de edição | Dados | Gerenciamento |
|---|---|---|---|
| Administrador | Todas | Consulta e ações | Acesso completo |
| Analista de negócios | 1 — Proposta e 3 — Simulação | Sem menu direto | Sem acesso |
| Analista de código | 2 — Interpretação | Sem menu direto | Sem acesso |
| Gerente de vendas | 4 — Conferência | Consulta e ações | Sem acesso |
| Auditor | Somente consulta | Somente consulta | Sem acesso |

Menus, rotas, criação/remoção de campanha, campos das etapas, importações, exclusões e cálculo usam a política central. O gerente não envia PUT de rascunho; aprova a proposta salva e simulada. Negócio pode registrar o aceite na etapa 3, com identidade da sessão: o frontend deixou de enviar um responsável digitado como autoria. A ativação/publicação permanece gerencial.

Propostas interpretadas são salvas antes de sair da primeira etapa, quando o salvamento puder ser confirmado. Os campos continuam visíveis se houver erro. Usuários de outro perfil podem abrir sua etapa pelo botão de acesso correspondente, sujeito às validações existentes. Regras alteradas precisam ser verificadas e salvas antes da simulação. A navegação continua retomando o maior progresso confirmado pelo contrato atual; isso não significa aprovação técnica ou encaminhamento oficial.

O card indica o responsável esperado pela matriz de perfis e explica o bloqueio de edição. Mudanças de perfil são atualizadas na revalidação e chamadas rejeitadas pelo servidor não produzem sucesso. O exemplo local da esteira fica desligado por padrão. Somente `VITE_ENABLE_WORKFLOW_PREVIEW=true` habilita sua URL de desenvolvimento; ele nunca substitui uma decisão persistida.

## Ainda depende de BACK-4

A `dev` `6b55078` não fornece estado oficial de etapa pendente, encaminhamento entre responsáveis, devolução com motivo, ações permitidas por estado ou revisão esperada da decisão. Portanto:

- Não há ação real de encaminhar, aprovar código ou devolver uma campanha.
- O maior passo visitado é navegação, não fonte oficial de responsabilidade pendente.
- As permissões disponíveis são por perfil/operação; não se deve anunciar bloqueio de alteração condicionado a uma transição inexistente no servidor.
- Correções já invalidam simulação/aceite pelos contratos anteriores, mas não há invalidação completa da nova esteira de decisões.

Quando BACK-4 estiver disponível, conectar o carregamento do estado oficial e as transições com controle de concorrência, autor, data e motivo. Revalidar menus e botões com as ações permitidas retornadas pelo servidor, sem inferir aprovação a partir de ATIVA/DRAFT ou progresso.

FRONT-1/2 têm integração real; FRONT-3 tem autorização integrada e permanece parcial quanto à esteira de BACK-4.

Validação desta integração: 397 testes frontend aprovados, 1 ignorado e build aprovado. O acesso do auditor foi verificado no navegador contra a API real descartável, incluindo bloqueio do gerenciamento por URL. Fluxo de interpretação/IA, importação, simulação e aprovação com os dados reais do usuário não foi reexecutado nesta verificação de acesso.
