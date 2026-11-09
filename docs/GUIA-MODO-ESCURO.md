# Guia rápido — modo escuro

## Disponível

- Três opções de tema: **Claro**, **Escuro** e **Seguir o sistema** (padrão). A escolha fica no rodapé da barra lateral no desktop e na Topbar em telas menores que `md`.
- Com "Seguir o sistema", a interface acompanha o tema do sistema operacional em tempo real, sem recarregar a página.
- A escolha fica salva no navegador e é aplicada antes da tela aparecer, então quem usa o tema escuro não vê um flash claro ao abrir ou recarregar.
- O verde da marca é o mesmo nos dois temas. Os neutros escuros mantêm o tom oliva do preto carvão.
- Inputs nativos (data, mês, checkbox), barras de rolagem e diálogos `<dialog>` também seguem o tema, via `color-scheme`.
- Todos os pares de texto da paleta escura passam no contraste WCAG AA (mínimo de 4,5:1).

## Integração

Não é necessária nenhuma mudança no backend. A preferência não sai do navegador.

| Peça | Arquivo | Papel |
|---|---|---|
| Paleta | `src/assets/main.css` | Variáveis do tema claro em `:root` e do escuro em `:root[data-theme="dark"]`, no formato de canais RGB (`159 232 112`) |
| Mapeamento | `tailwind.config.js` | Transforma cada variável em classe com `rgb(var(--color-x) / <alpha-value>)`, o que habilita opacidade (`bg-overlay/50`) |
| Estado | `src/services/useTheme.js` | Preferência `system`, `light` ou `dark`, salva no `localStorage` como `comissionai:theme`. Aplica `data-theme` no `<html>` e atualiza o `theme-color` |
| Anti-flash | `index.html` | Script inline no `<head>` que aplica o tema antes do Vue montar. **Mantenha a chave e a lógica iguais às de `useTheme.js`** |
| Controle | `src/components/layout/ThemeToggle.vue` | Grupo de três botões (sol, lua, monitor) com `role="radiogroup"` |

Para usar o tema em outro componente:

```js
import { useTheme } from '@/services/useTheme'

const { preference, theme, setPreference } = useTheme()
// preference: 'system' | 'light' | 'dark'  (o que o usuário escolheu)
// theme:      'light' | 'dark'             (o que está aplicado)
```

## Regras para novos componentes

O tema funciona porque os componentes só usam tokens. Uma classe de cor fixa aparece "quebrada" no tema escuro.

| Situação | Use | Não use |
|---|---|---|
| Fundo de card, input, modal, sidebar | `bg-surface` | `bg-white` |
| Texto principal | `text-brand-dark` | `text-black`, `text-gray-*` |
| Texto sobre o botão verde (`bg-brand`) | `text-on-brand` | `text-brand-dark` (fica claro no escuro) |
| Card ou botão de destaque escuro | `bg-inverse` + `text-on-inverse`, hover `bg-inverse-hover` | `bg-brand-dark` + `text-white` |
| Texto secundário dentro do bloco escuro | `text-inverse-muted` | `text-sage-border`, `text-sage-light` |
| Texto sobre `bg-danger`, `bg-success` ou `bg-warning` | `text-on-status` | `text-white` |
| Fundo de modal | `bg-overlay/50` ou `bg-overlay/60` | `bg-black/50`, `bg-brand-dark/50` |
| Cores de status | famílias `success-*`, `warning-*`, `danger-*` | `emerald-*`, `amber-*`, `red-*` |
| Cor de token direto no CSS | `rgb(var(--color-x))` | `var(--color-x)` (a variável guarda só os canais) |

Exceções conhecidas:

- `bg-white/10` e `border-white/10` são permitidos **somente dentro de `bg-inverse`**, que continua escuro nos dois temas.
- `::backdrop` de `<dialog>` usa `rgb(0 0 0 / 45%)` literal, porque variáveis CSS não chegam ao `::backdrop` em todos os navegadores.

Para criar uma cor nova, defina a variável nos dois blocos de `main.css` (claro e escuro), registre em `tailwind.config.js` com `token('nome')` e confira o contraste nos dois temas.

## Mudança visível também no tema claro

Antes desta entrega, as classes com opacidade sobre tokens (`border-danger/30`, `bg-warning-bg/80`, `bg-brand-dark/50`…) não geravam CSS, porque as variáveis eram hexadecimais. Com os canais RGB, elas passaram a funcionar: **os modais ganharam o fundo escurecido** e várias bordas suaves de erro, alerta e sucesso aparecem como previsto no layout.

## Como verificar

1. Rode `npm run dev` e alterne entre Claro, Escuro e Sistema no rodapé da barra lateral.
2. Com "Seguir o sistema", troque o tema do sistema operacional. A interface deve mudar sem recarregar.
3. Escolha Escuro e recarregue a página. Não deve haver flash claro.
4. Percorra Home, Dados (upload, relatório de validação, cálculo da competência) e Campanhas (todas as etapas, simulação, detalhes). Confira modais, toasts, o card de projeção da simulação e o código Python das regras.
5. Navegue com Tab: o anel de foco verde deve ter o espaço no tom do fundo, não branco.
6. Em 390 px de largura, o seletor de tema deve aparecer na Topbar.

## Verificações realizadas

- 356 testes aprovados, incluindo 7 novos em `useTheme.test.js`: resolução pelo sistema, preferência salva, `localStorage` bloqueado, mudança do sistema em tempo real e atualização do `theme-color`. Build de produção concluído, com o aviso de tamanho do bundle já conhecido.
- CSS compilado conferido: `border-danger/30`, `bg-overlay/50`, `bg-surface/80`, `bg-sage-surface` e o anel de foco geram as regras esperadas.
- Contraste calculado para os principais pares de texto e superfície nos dois temas. No escuro, todos passam AA.
- Revisão visual das telas nos dois temas feita pela equipe.
