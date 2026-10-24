# Guia rápido — navegação por traços na etapa 2

## Disponível

- As bolinhas numeradas foram substituídas por traços laterais, sem cápsula, fundo ou borda.
- Cada traço representa uma regra existente. A régua acompanha a rolagem e destaca a regra atual com um traço maior e mais escuro.
- O destaque ativo, hover e foco usam o verde `--color-success-text` da paleta atual; os traços inativos continuam neutros. Não exige integração adicional.
- Passar o mouse ou focar um traço pelo teclado abre uma prévia com o número e o texto da regra. Regras sem texto apresentam uma orientação curta.
- Clicar ou pressionar Enter/Espaço leva ao bloco e transfere o foco para ele. Setas para cima/baixo percorrem os controles; Home/End selecionam o primeiro/último controle; Esc fecha a prévia.
- A régua continua no lado direito do formulário e usa as cores do projeto. Telas menores mantêm a prévia dentro da área visível. A preferência por movimento reduzido continua sendo respeitada.
- Listas longas têm rolagem própria; adicionar, remover ou substituir regras atualiza os traços pelas identidades dos blocos.

## Integração

Não é necessária nenhuma mudança no backend ou na IA. O componente `CampaignRuleScrollNav.vue` usa os `clientId`, os textos e a posição dos blocos já presentes na página. Nenhum dado é salvo ou enviado por essa navegação.

O texto da prévia acompanha `textoOrigem`, com alternativa em `trechoOriginal`. Ele identifica o trecho do bloco; os campos e a explicação atualizada permanecem nas respectivas áreas do formulário/revisão.

## Como verificar

1. Abra a etapa 2 com várias regras: deve haver um traço por regra e nenhum círculo numerado.
2. Role o formulário e confira o destaque da regra atual.
3. Passe o mouse ou navegue pelo teclado até um traço. Confira a prévia e selecione para ir ao bloco.
4. Adicione/remova uma regra e reinterprete o conjunto. A régua deve refletir a coleção atual.
5. Em tela estreita, confira que o controle e a prévia ficam dentro da tela.

## Verificações realizadas

- Conferência em navegador com respostas controladas, sem consumir chamadas da Groq: três regras, salto para a segunda, prévia por foco, Esc, Home/End, quinze regras com rolagem interna, remoção e substituição do conjunto.
- Largura de 390 px: controles e prévia dentro da tela, sem transbordamento horizontal. O tamanho padrão do navegador foi restaurado após a conferência.
- 147 testes existentes aprovados e build de produção concluído, com o aviso de tamanho do bundle já conhecido.
- Nenhum erro JavaScript capturado na prévia. O serviço temporário de respostas foi reiniciado durante a conferência; a falha de conexão preservou o conjunto de teste.

Evidência visual: `/home/renan/Documents/Codex/2026-10-11/new-chat/outputs/Navegacao-Tracos-Previa.png`.
