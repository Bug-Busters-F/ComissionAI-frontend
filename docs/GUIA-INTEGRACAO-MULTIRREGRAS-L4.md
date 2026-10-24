> Atualização de 22/10/2026: o escopo posterior de salvamento, simulação, aceite e ativação está no [guia de persistência multirregras](GUIA-PERSISTENCIA-MULTIRREGRAS.md). As restrições de fluxo somente em memória descritas abaixo pertencem à entrega anterior.

# Lote 4 — revisão e verificação

## Implementado

Antes de avançar, as regras alteradas são verificadas. Botão, navegação de etapas e URL usam a mesma restrição de impedimentos, processamento, revisão pendente e validação. A etapa intermediária foi mantida, sem integração de simulação.

A revisão contém os campos atuais de todas as regras, vigência, operadores, explicações atuais, origens disponíveis, avisos, operações e bônus somente para leitura. Explicações desatualizadas são identificadas e substituídas visualmente pelo resumo local dos valores atuais. O Python continua demonstrativo com visualização e cópia. Nada é salvo, publicado ou ativado.

## Verificação automatizada

`npm test` cobre o contrato HTTP novo, conversões, pendências, datas, público explícito, transações de comparação, divisão, cancelamento, respostas antigas, taxa manual, atualização de artefatos, origens e guardas. `npm run build` verifica a compilação da interface. O aviso de bundle acima de 500 kB já existia e não impede o build.

No navegador com respostas HTTP controladas foram verificados: extração de três regras, edição de taxa em outro bloco, divisão sem perda dessa edição, validação antes do avanço, revisão, visualização/cópia do Python, comparação completa, cancelamento preservando valores e falha HTTP preservando as regras. Isso não substitui homologação com o modelo/banco reais.

## Resultado da execução

- 21 arquivos de teste e 133 testes aprovados, incluindo 36 testes novos de integração/fluxo.
- Build de produção aprovado; aviso não impeditivo de bundle JavaScript de aproximadamente 644 kB.
- Verificação de espaços e conflitos do diff aprovada.
- Backend e IA sem alterações. Sem commit ou push nesta implementação.

## Roteiro de homologação real pendente

1. Executar frontend em modo API, backend, banco e IA com as credenciais do servidor.
2. Interpretar uma campanha com datas, públicos distintos e duas faixas adjacentes.
3. Corrigir campos, atualizar explicação e conferir avisos e origens.
4. Reinterpretar um bloco: cancelar; repetir; corrigir e confirmar.
5. Pedir divisão em duas regras e conferir que os outros blocos não mudam.
6. Reinterpretar a campanha inteira: conferir o aviso de substituição de todas as regras/ajustes e a orientação para edição pontual; cancelar e confirmar a preservação. Repetir, confirmar e conferir a substituição direta por todas as novas propostas, sem comparação posterior.
7. Simular indisponibilidade do serviço em ambiente de teste e confirmar que os dados continuam preenchidos, sem sucesso fictício.
8. Avançar, revisar todas as regras, abrir e copiar Python demonstrativo.
9. Confirmar que não houve requisições de salvamento/publicação. F5 não deve ser apresentado como persistência.

A aprovação funcional depende dessa homologação. Os serviços reais não estavam acessíveis durante esta execução; não houve chamada ao LLM nem alteração no backend/IA.
