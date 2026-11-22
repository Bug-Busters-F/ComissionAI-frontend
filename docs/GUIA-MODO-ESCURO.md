# Guia rápido — modo escuro

Integrado à branch `feat/login-gerenciamento-usuarios` a partir do trabalho preservado em `feat/modo-escuro`. Alterações somente no frontend.

## Uso

O seletor abaixo do usuário na sidebar oferece Claro (sol), Escuro (lua) e Sistema (monitor). Na tela de login existe a mesma seleção compacta; no celular fica no menu da conta. No primeiro acesso,
o tema acompanha a preferência do sistema. Uma escolha explícita é salva localmente
(`comissionai-theme`), reaplicada antes da montagem da página e sincronizada entre abas.
Sem acesso ao armazenamento, a alternância continua funcionando durante a sessão.

## Integração

Não exige operações novas no backend ou na IA. Os componentes usam as cores semânticas
existentes; superfícies claras passam a superfícies escuras e os destaques verdes são
preservados. Painéis de código e destaques financeiros mantêm o fundo escuro próprio.
Campos nativos e indicadores de sucesso, atenção e erro acompanham o tema.

Ao adicionar componentes, reutilizar os tokens de `main.css` e do Tailwind. Evitar cores
literais claras em estilos locais. O Python exibido e os dados de campanha não mudam.

## Conferência

- Alternar o tema pelo seletor na sidebar e navegar entre Home, Dados e Campanhas.
- Recarregar a página: manter a escolha.
- Conferir formulários, tabelas, notificações e modais nos dois temas.
- Conferir em largura móvel: botão de tema permanece disponível com ícone e nome acessível.
- Remover a preferência salva para voltar a acompanhar o tema do sistema.

Testes automatizados cobrem preferência explícita, escolha do sistema, alternância,
armazenamento indisponível e sincronização entre abas. As chamadas de integração e as
regras de negócio não foram alteradas.

## Integração com acesso e esteira

O controle `ThemeSelector.vue` é compartilhado pela sidebar, login e menu móvel da conta. A identidade,
a saída e a política de permissões foram preservadas. A escolha do tema não concede acesso
nem muda o estado das campanhas. O fundo principal escuro é preto puro (`#000000`).
Cards, bordas e campos usam cinzas neutros, sem tonalidade esverdeada. O verde fica nos destaques e nas indicações de sucesso. O stash original foi mantido
como backup; esta integração não cria commits nem altera o backend/IA.

O seletor da sidebar exibe somente os ícones (sol, lua, monitor), com nomes acessíveis
e dicas ao passar o mouse. O usuário na parte inferior abre as opções Perfil e Sair;
o menu foi retirado do canto superior direito. No celular, a conta aparece abaixo
da navegação e também disponibiliza a seleção de aparência.
