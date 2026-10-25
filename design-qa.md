# QA visual — navegação por traços na etapa 2

## Alvo e evidências

- Referência: `/tmp/codex-clipboard-8db5c3b8-c874-49a1-8ad6-1c9bea9ac196.png` (386 × 490 px).
- Implementação final: `/home/renan/Documents/Codex/2026-10-11/new-chat/outputs/Navegacao-Tracos-Previa.png` (905 × 743 px; viewport CSS 920 × 755, DPR 1).
- Tela estreita: `/home/renan/Documents/Codex/2026-10-11/new-chat/outputs/Navegacao-Tracos-Mobile.png` (375 × 812 px; viewport CSS 390 × 844, DPR 1).
- Rota de teste: `http://127.0.0.1:5174/campanhas/nova?etapa=propostas`, com respostas HTTP controladas.
- Estado final: regra 2 em visualização e prévia da regra 3 pelo teclado.

A referência é um recorte do chat em tema escuro; a implementação é uma adaptação do componente ao formulário existente em tema claro, conforme solicitado. Não se compara o layout completo do chat com o formulário. As duas imagens foram abertas juntas na mesma entrada de comparação, com atenção à régua e à prévia. A captura fornecida pelo navegador tem um pequeno redimensionamento uniforme em relação ao viewport CSS; não foram classificados como defeitos diferenças de densidade ou elementos externos ao componente.

## Superfícies de fidelidade

- Tipografia: textos da prévia usam a família do projeto, identificação em negrito e trecho em tamanho pequeno, limitado a três linhas. A referência também distingue identificação e descrição. Preservada a tipografia do produto.
- Espaçamento/layout: traços alinhados verticalmente, sem bolinhas, cápsula ou números permanentes; ativo mais longo; prévia arredondada adjacente. Um traço por regra, com alvo de 32 × 24 px. Lado direito e espaçamento entre controles são adaptações intencionais para navegação do formulário.
- Cores/tokens: cores existentes de texto e borda; ativo escuro, inativos discretos mas legíveis, foco verde já usado no projeto. O tema claro é intencional.
- Imagens/ícones: não há fotografias ou ilustrações a reproduzir neste componente. Os traços usam o ícone `Minus` da biblioteca já instalada, sem imagens geradas ou desenhos SVG próprios.
- Conteúdo: prévia mostra número e texto da regra atual da coleção. Não reutiliza mensagens, ações de favorito ou status de processamento do chat de referência.

Não foi necessário um recorte adicional: a régua e a prévia estão legíveis na captura de contexto e na conferência de tela estreita.

## Histórico de comparação e correções

1. Na primeira conferência, os traços inativos estavam claros demais para o fundo do produto (P2). A opacidade mínima passou de 0,45 para 0,8. A captura final mostra a distinção entre traços inativos e ativo sem perder visibilidade.
2. Na lista de quinze regras, focar o último controle rolava a lista interna e fechava sua prévia (P2). O evento da lista agora reposiciona a prévia do controle focado. Nova conferência confirmou foco em “Ir para regra 15”, rolagem interna de 40 px e prévia da regra manual.
3. A captura final foi comparada novamente com a referência após as correções. Não há diferenças P0/P1/P2 pendentes dentro do escopo solicitado.

## Interações e verificações

- Clique em um traço transfere o foco para o bloco correspondente e atualiza o destaque após a rolagem.
- Setas, Home/End e Esc conferidos; prévia pelo foco do teclado conferida.
- Lista com quinze regras, remoção de uma regra e substituição por três regras conferidas.
- Viewport de 390 px: régua e prévia dentro da área visível; `scrollWidth` não excedeu `clientWidth`. Viewport padrão restaurado.
- Logs do navegador: nenhum erro JavaScript. Houve um aviso de conexão durante o encerramento do serviço temporário; após reinício, a reinterpretação de teste funcionou e os dados foram preservados.
- 147 testes existentes e build aprovados. Não foram feitas chamadas à Groq.

## Pendências e checklist

- Nenhum ajuste P0/P1/P2 pendente.
- A prévia ao passar o mouse usa o mesmo estado da prévia por foco. A conferência automatizada do navegador priorizou clique e teclado; não houve teste em aparelho físico de toque.
- Não exige backend/IA adicional. Guia em `docs/GUIA-NAVEGACAO-REGRAS-TRACOS.md`.

final result: passed
