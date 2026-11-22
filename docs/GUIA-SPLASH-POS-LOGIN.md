# Splash curta após o login

A tela aparece somente após `accounts.login` confirmar uma sessão real. Usa a composição Horizonte: curva verde animada, título “Novos horizontes.” e logo + ComissionAI no canto inferior direito. Os botões de prévia foram removidos. Não aparece ao recarregar uma sessão nem em credenciais rejeitadas.

- Duração mínima normal: 1.500 ms, simultânea à navegação. Transição de saída: 180 ms.
- Preferência de movimento reduzido: 200 ms, sem animações.
- Limite de segurança: 4 segundos. Erro de navegação ou perda de sessão encerra a splash e libera a interface.
- Sem requisições extras, porcentagem de progresso fictícia, armazenamento ou dependências novas.
- A interface atrás da animação fica inerte temporariamente, impedindo cliques e tabulação acidentais.

Visual: `src/components/accounts/LoginWelcomeSplash.vue`. Coordenação/duração: `src/services/loginWelcome.js`. O login inicia o efeito e a raiz `App.vue` o mantém durante a mudança de rota.

Para testar: sair, entrar com credenciais válidas e conferir a chegada à página solicitada; repetir com senha incorreta (sem splash), recarregar (sem splash) e com movimento reduzido no sistema. As alterações não exigem integração adicional no backend.

Verificação automatizada: 400 testes aprovados e 1 contrato opcional ignorado; build de produção aprovado. Os testes novos cobrem duração, cancelamento, navegações concorrentes e movimento reduzido.

Verificação visual feita no navegador com respostas HTTP controladas e conta inteiramente fictícia. Confirmada a splash após sucesso e a chegada à Home; nenhuma conta ou base real foi alterada.
