> Atualização: este documento registra a entrega anterior da interface/modo demonstrativo. Para o modo API e a integração atual, consulte [o guia consolidado](GUIA-INTEGRACAO-MULTIRREGRAS.md).

# Reinterpretação individual — interface da Sprint 2

## Experimentar

Inicie o Vite com `VITE_CAMPAIGN_PROPOSALS_MODE=demo` no ambiente (ou no `.env.local`) e abra `/campanhas/nova`.
Clique em **Carregar exemplo** para abrir uma campanha demonstrativa com três regras. Essa ação pede confirmação se já houver dados preenchidos.

O lápis acima de cada regra abre seu texto. Altere, por exemplo, para `Comissão de 4% para marca PRETO na loja 75` e clique em **Reinterpretar**.
A demonstração reconhece apenas percentuais, marca PRETO/BRANCO e número da loja; não faz chamadas a um modelo. O seletor demonstrativo também permite testar novo preenchimento, falha, resposta vazia e várias regras.

Durante o carregamento apenas o bloco fica bloqueado. O modal apresenta Atual → Proposto e permite corrigir os campos recebidos, editar o texto e reinterpretar novamente.
OK aplica a proposta; Cancelar ou Escape descartam a revisão. Campos ausentes da resposta e outras regras são preservados. A proposta completa da campanha permanece intacta.
Os dados continuam somente em memória; esta entrega não adiciona persistência.

## Adaptador provisório

`createCampaignProposalProvider({ mode: 'api', client })` habilita a capacidade `reinterpret` somente se existir `client.reinterpretRule(input, { signal })`.
O cliente ainda deve ser conectado ao fluxo quando houver um contrato real aprovado. Nenhum endpoint foi inventado nem conectado ao endpoint legado singular.

Entrada:

```js
{
  clientId: 'identidade-estavel-do-bloco',
  texto: 'Texto individual editado',
  campanha: { titulo, descricao, dataInicio, dataFim },
  regraAtual: { /* snapshot do bloco e campos manuais */ }
}
```

`cenarioDemonstrativo` é usado somente pelo provedor demo. O cliente real deve ignorá-lo ao montar sua requisição HTTP.

Resposta esperada pela interface (adaptar a resposta do contrato real para este formato):

```js
{
  propostas: [{
    campos: { taxaPercentual: '4', codLoja: '75' },
    resumo: 'Comissão de 4% na loja 75',
    pendencias: [],
    metadados: { origens: {}, explicacao: 'Explicação recebida do serviço' }
  }]
}
```

Somente as chaves presentes em `campos` participam da revisão. Os nomes seguem `PROPOSAL_FIELD_NAMES`; `taxaPercentual` usa percentual de exibição (`4` significa 4%), sem conversão implícita de fração decimal. Valores de texto/código/moeda são strings; as opções são booleanos, com null permitido para os operadores de limites. Um null explícito em campo textual propõe remover o valor e aparece na comparação; ausência da chave preserva o valor.

`pendencias` é obrigatório e usa o formato existente: `codigo`, `mensagem`, `campo`, `severidade`, `origem`, `camposRelacionados`, `exigeValidacaoRemota`. Array vazio significa nenhuma pendência nova. Pendências antigas de campos não retornados, ou que relacionem campos não retornados, são mantidas por segurança. Pendências gerais permanecem até uma futura validação completa do bloco.

Zero ou várias propostas, campos desconhecidos e tipos inválidos são rejeitados sem alterar a regra. Falhas reais nunca viram respostas fictícias.

## Confirmação e rastreabilidade

- O trecho inicial é preservado em `trechoOriginal`; o texto confirmado fica em `textoOrigem` e o resumo em `resumo`.
- A resposta permanece provisória até OK. Mudanças no texto exigem nova interpretação; resultados cancelados ou incompatíveis com o contexto/estado atual não são aplicados.
- Apenas campos retornados têm sua origem manual substituída pela interpretação. Correções feitas no modal são registradas como manuais.
- A última resposta e as correções ficam em `metadadosRecebidos.ultimaReinterpretacao`. Metadados anteriores continuam preservados.
- Respostas parciais ou corrigidas manualmente marcam os artefatos como desatualizados; não certificam explicações/Python da regra inteira. As validações locais existentes são recalculadas após OK e continuam bloqueando o avanço quando necessário.
- Regras adicionadas manualmente não recebem controles de reinterpretação nesta entrega.

## Verificação

Os testes de `ruleReinterpretation.test.js` cobrem confirmação/cancelamento, preservação de campos e identidades, correções manuais, mudança de texto, falhas e repetição, respostas antigas, contexto alterado, zero/várias regras e separação entre demo/API.
Verificar também no navegador: loading localizado, modal com navegação por teclado, retorno do foco, edição posterior no formulário e layout móvel. Animações usam `motion-safe`, respeitando movimento reduzido.
