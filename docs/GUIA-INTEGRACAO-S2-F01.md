> Atualização: este documento registra a entrega anterior da interface/modo demonstrativo. Para o modo API e a integração atual, consulte [o guia consolidado](GUIA-INTEGRACAO-MULTIRREGRAS.md).

# Guia rápido — criação de campanha com múltiplas regras

## O que está pronto

- A rota /campanhas/nova usa o fluxo novo de quatro etapas: proposta, interpretação, simulação e conferência. A edição continua no fluxo legado.
- Título, descrição original, vigência comum, filtros, matrícula, taxa e limites de venda são editáveis. Inclusão/exclusão dos limites fica explícita.
- Os blocos mantêm identidade própria; regras incompletas e condições não suportadas continuam visíveis e impedem avançar.
- O modo manual é o padrão. Demo carrega exemplos somente após escolha explícita. API só habilita ações para um cliente com métodos configurados.
- Persistência, validação cadastral, interpretação e simulação reais permanecem indisponíveis sem integração.
- Testes Vitest de modelo, mapeadores, validação e provedor foram adicionados. Nesta entrega, 17 arquivos de teste e 73 testes passaram; o build de produção também passou. O Vite emitiu apenas um aviso de chunk JavaScript acima de 500 kB.

## Onde integrar

- Estado e guardas: src/services/useCampaignProposalFlow.js.
- Modelo e identidade: src/services/campaignProposalModel.js.
- Entrada/saída provisória: src/services/campaignProposalMappers.js, esquema frontend-s2-provisional-1.
- Validação local e conflitos limitados: src/services/campaignProposalValidation.js.
- Capacidades do provedor: src/services/campaignProposalService.js.
- Fixtures explícitas: src/services/campaignProposalFixtures.js.
- View da criação: src/views/CampaignCreationFlowView.vue.

## O que falta no backend/IA

- Contrato da coleção com IDs, matrícula, limites e inclusividade.
- Interpretação da descrição completa e pendências correlacionadas por regra/campo.
- Validação de cadastros, bases, operações e conflitos.
- Persistência da coleção inteira e confirmação de que nenhuma regra foi omitida.
- Simulação, aceite, ativação e explicações/Python, que pertencem a tarefas seguintes.

## Como conectar

1. Confirmar nomes, tipos, precisão decimal, pendências, rascunho e correlação dos IDs com o backend.
2. Implementar o cliente usando a instância api existente e adaptar os mapeadores; não enviar o esquema provisório a um endpoint singular.
3. Habilitar cada capacidade somente quando o método real estiver pronto. O modo api sem cliente permanece indisponível.
4. Preservar revisão, cancelamento e correlação por clientId ao mapear respostas e erros.
5. Validar ida e volta com três regras, uma incompleta, limites coincidentes e matrícula 001234.
6. Liberar persistência ou publicação apenas após verificar resposta completa da coleção.

## Como testar

O modo manual é o padrão; não é necessário iniciar os repositórios de Back ou IA.

1. No repositório do frontend, instale as dependências se ainda não estiverem instaladas (`pnpm install`) e inicie o servidor (`pnpm dev`).
2. Abra `http://localhost:5173/campanhas/nova`.
3. Ao abrir a etapa, título e descrição não devem mostrar alertas embaixo dos campos. Tente avançar sem preenchê-los: os alertas devem aparecer. Preencha título e descrição; as datas podem ficar em branco se a vigência estiver descrita no texto.
4. Na etapa de interpretação, deixe a taxa percentual vazia. A regra deve mostrar a pendência e bloquear o avanço para simulação. Preencha a taxa, por exemplo `3,5`, e confira se o bloqueio desaparece.
5. Informe filtros de público e um limite mínimo, por exemplo marca `10`, cargo `100`, mínimo `1000` e operador “A partir de (inclui)”. Confira o resumo da regra e a vigência descrita como proveniente do texto original.
6. Adicione outra regra com o mesmo público e uma faixa que também inclua R$ 1.000,00. A coleção deve sinalizar a sobreposição. Se um dos lados excluir o limite coincidente, essa borda não deve gerar conflito.
7. Avance. A etapa de simulação deve informar que cálculo e validação real não estão disponíveis; continue para conferir os dados de todas as regras.
8. Volte uma etapa e avance novamente para confirmar que os dados continuam preenchidos. Use Cancelar para conferir o aviso antes de descartar alterações.

Os dados ficam em memória e não sobrevivem a F5. Não há salvamento, ativação nem resultado financeiro fictício. Para exemplos pré-preenchidos, configure `VITE_CAMPAIGN_PROPOSALS_MODE=demo`, reinicie o servidor, abra a mesma rota e escolha um cenário.

Para verificações automatizadas, rode `pnpm test` e `pnpm build`. A integração real com Back ou IA não é validada por esses passos.
