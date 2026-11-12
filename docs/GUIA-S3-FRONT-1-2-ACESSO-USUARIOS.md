# Guia rápido — FRONT-1 e FRONT-2 integradas

## Estado e configuração

Frontend na branch `feat/login-gerenciamento-usuarios`. Integração com `dev` do backend `6b55078`, que contém o PR #33 e a correção `62d4af2` (mesma árvore de código testada anteriormente: 397 aprovados, 8 ignorados).

- Iniciar/reconstruir o backend atualizado e executar suas migrações antes de usar o frontend.
- `VITE_API_URL=/api/v1` usa o proxy local. O destino do proxy é `VITE_BACKEND_URL` (padrão `http://127.0.0.1:8080`). Reiniciar Vite ao mudar variáveis.
- Em produção, servir a API na mesma origem ou configurar explicitamente a origem permitida no backend. O proxy do Vite só existe no desenvolvimento.
- Usar uma conta real criada pelo administrador ou as credenciais iniciais configuradas no backend. As antigas contas `@comissionai.exemplo` não autenticam mais.
- `AI_SERVICE_API_KEY` permanece somente nos serviços backend/IA, nunca no frontend. Ela não é a senha de login.

## Operações

| Ação | API |
|---|---|
| Entrar | POST `/auth/login` com `email`, `senha` |
| Restaurar identidade/permissões | GET `/auth/me` |
| Sair | POST `/auth/logout` |
| Alterar senha própria | PATCH `/auth/me/senha` com `senhaAtual`, `novaSenha` |
| Catálogo oficial dos cinco perfis | GET `/auth/perfis` |
| Listar/buscar/filtrar usuários | GET `/usuarios`; busca, filtros e paginação aplicados à lista retornada |
| Cadastrar | POST `/usuarios` com `nome`, `email`, `senha`, `papel` |
| Editar dados | PUT `/usuarios/{id}` com `nome`, `email` |
| Alterar perfil | PATCH `/usuarios/{id}/perfil` com `papel` |
| Desativar/reativar | PATCH `/usuarios/{id}/ativo?ativo=false/true` |

O modal de cadastro exige senha inicial. Não existe cadastro público, convite automático ou exclusão física. Desativação preserva o ID e a identificação histórica conforme o contrato do backend. Alteração de nome/e-mail e perfil usa duas operações: se somente a primeira for confirmada, a lista mostra o resultado confirmado e o modal explica a falha parcial; não há toast de sucesso integral.

## Sessão e isolamento

O token Bearer e sua expiração ficam no `sessionStorage` da aba (`comissionai.auth.session.v1`), com fallback em memória quando o armazenamento está indisponível. Senhas, listas de usuários e cópias da identidade/perfil não são persistidas. Recarregar exige `GET /auth/me`; a identidade exibida vem do servidor.

A sessão é revalidada nas navegações, ao recuperar foco e após rejeição de acesso. `401` encerra a sessão local e exige nova entrada; `403` não simula sucesso nem é tratado automaticamente como senha inválida. O timeout local também exige nova entrada. Sem conexão para confirmar `/me`, a interface não autoriza usando uma identidade antiga.

Sair, expirar ou trocar de usuário cancela requisições antigas, rejeita respostas de uma revisão de sessão anterior, limpa caches conhecidos de apuração/acompanhamento e prévias antigas, reinicia estados Pinia e preserva preferências de aparência. Logout e troca de senha só exibem conclusão após confirmação real. Após a senha mudar, todas as sessões são revogadas pelo backend e a interface solicita novo login.

Não há proteção de um segredo de serviço no navegador. O token é acessível ao JavaScript da origem: manter as proteções contra XSS e usar HTTPS em produção. Sessões de outras abas/dispositivos são revogadas pelo backend quando previsto; a aba detecta isso na próxima consulta/revalidação.

## Roteiro manual

1. Tentar senha incorreta e conta desativada; verificar o motivo e ausência de sucesso.
2. Entrar, recarregar e conferir nome/perfil retornados pelo servidor.
3. Administrador: cadastrar com senha inicial, buscar, editar e recarregar para conferir persistência.
4. Alterar perfil; desativar/reativar. Testar e-mail duplicado e proteção da própria conta/último administrador.
5. Auditor: Gerenciamento não aparece e URL direta leva a acesso restrito.
6. Alterar a própria senha; confirmar saída e entrada com a nova senha.
7. Revogar sessão/conta em outra sessão e tentar navegar; conferir limpeza e retorno ao login.
8. Interromper a API durante uma operação: campos preservados, erro visível e nenhum sucesso fictício.

## Evidências

Testes automatizados usam respostas controladas. A verificação no navegador utilizou backend real com Java 21 e H2 descartável, sem tocar no banco do usuário: credenciais inválidas, login, restauração, identidade, listagem/catálogo, edição persistida após F5, logout, perfil do auditor, bloqueio por URL e revogação por desativação. Testes HTTP adicionais verificaram troca de perfil em token já emitido e proteção administrativa. Isso não substitui testar a implantação com PostgreSQL e suas credenciais reais.

Validação final: 397 testes frontend aprovados e 1 contrato opcional ignorado; build de produção aprovado (aviso anterior de tamanho do pacote). A prévia de navegador e o backend H2 temporários foram encerrados após os testes. Branch de trabalho preservada, sem commit/push nesta entrega.
