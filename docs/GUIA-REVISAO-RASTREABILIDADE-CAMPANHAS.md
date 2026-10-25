# Guia rápido — revisão e rastreabilidade das campanhas

Branch: `feat/revisao-rastreabilidade-campanhas`, criada de `dev` em `3af8d1b`.
Backend correspondente: mesma branch, criada de `dev` em `2146716`.
IA: `dev` atualizada em `1bc472d`, sem mudanças nesta entrega.

## O que está integrado

- Python equivalente individual, sem exemplos fixos nem código geral/Portugol da campanha. A visualização e a cópia usam o código da regra atual, no estilo verde escuro.
- As explicações e o Python são vinculados aos campos, texto, operação, bônus e vigência que descrevem. Uma edição os invalida; a revisão oculta artefatos anteriores e a navegação exige atualização.
- `atualizar-artefatos` recebe `camposEditados` com os nomes do contrato. Uma taxa manual envia `taxa`, preservando `DEFINIR_TAXA`. A resposta atualiza operação, base e origens reais, inclusive quando uma alteração de taxa exige confirmação.
- Origens, referências, edições manuais, confirmação de público e pendências estruturadas são salvas em `regras[].rastreabilidade` e restauradas ao abrir o rascunho. Avisos continuam separados de impedimentos. Consultas cadastrais não são apresentadas como origem automática de todos os campos.
- As quatro etapas mostram a atual, as concluídas, a mais avançada já visitada e as não iniciadas. Voltar preserva o histórico de navegação.
- O rascunho volta à maior etapa alcançada, mesmo depois de navegar para etapas anteriores, inclusive em outro navegador/computador, pois o progresso é persistido no backend. Etapas com requisitos inválidos recuam para a correção necessária.
- O card verde escuro de impacto usa exclusivamente a simulação atual aceita: comissão base, comissão proposta e diferença na competência, além da projeção para a vigência. Não há valores de exemplo nem substituição de erro por zero.

## Configuração e operações

Usar `VITE_CAMPAIGN_PROPOSALS_MODE=api` e `VITE_API_URL=/api/v1` (ou a URL configurada do backend). O navegador continua acessando somente o backend.

Além das operações já integradas de interpretação, atualização, cadastro e simulação:

- POST/PUT `/api/v1/campanhas`: cada regra inclui `rastreabilidade`.
- GET `/api/v1/campanhas/{id}`: retorna rastreabilidade e `ultimaEtapa`, `etapaMaisAvancada`, `versaoProposta`.
- PATCH `/api/v1/campanhas/{id}/progresso`: `{ "ultimaEtapa": 2, "etapaMaisAvancada": 3, "versaoProposta": 1 }`.

As etapas são 1: proposta, 2: interpretação, 3: simulação, 4: conferência. O backend calcula o maior avanço real; o cliente não pode promover uma etapa apenas informando um contador maior. As gravações de navegação são sequenciais e não usam PUT da campanha, preservando o aceite. Falha de gravação mostra aviso e permite tentar novamente.

## Como conferir

1. Interpretar uma campanha multirregras e conferir origens, avisos e impedimentos.
2. Editar uma taxa; avançar, confirmar eventual mudança proposta e salvar. O código e a explicação anteriores não devem aparecer como atuais.
3. Simular uma competência com bases disponíveis, aceitar e abrir a conferência. Expandir as regras, conferir/copiar o Python e comparar o impacto com a tela da simulação.
4. Voltar à interpretação sem editar, sair e usar “Continuar” na listagem: deve voltar à interpretação e preservar o aceite.
5. Abrir de novo a conferência; o Python deve corresponder a cada regra e as origens manuais devem persistir após recarregar.
6. Alterar uma regra: o impacto antigo deixa de ser válido, exigindo salvar, simular e aceitar novamente.

## Limitações e operação do ambiente

- Reiniciar/reconstruir o backend com esta branch para aplicar a migração V23 antes de testar o frontend. O processo que já estava em execução não foi substituído durante os testes.
- Rascunhos antigos sem rastreabilidade não recebem origens inventadas. Os artefatos legados ficam ocultos até uma atualização; pode ser necessário salvar e aceitar uma nova simulação.
- O progresso começa a persistir quando existe um rascunho salvo. Campos ainda não salvos continuam sujeitos à confirmação de saída.
- O Python é uma representação para conferência por regra; não é executado no navegador nem substitui a seleção de regras feita pelo motor. O backend gera o código persistido a partir dos campos atuais, com `Decimal`, `ROUND_HALF_UP` e bônus por parcela.
- As origens têm a precisão das evidências disponíveis. Uma referência consultada não prova que determinou todos os valores; campos sem evidência mostram origem não informada.
- A interpretação ainda depende da disponibilidade/cota da Groq. Esta entrega não modifica a IA nem seus limites.

## Evidências de verificação

- Frontend: 276 testes aprovados e build de produção aprovado. Permanece o aviso pré-existente de tamanho do pacote JavaScript.
- Backend: 309 testes, sem falhas/erros, com um teste já existente ignorado.
- Python realmente gerado pelo backend executado separadamente: arredondamento, bônus, limite exclusivo, valor zero, canal e vigência conferidos.
- Migração até V23 e inicialização com validação do esquema conferidas em PostgreSQL isolado.
- Navegador conectado a frontend e backend reais em ambiente H2 isolado: três regras, revisão, retorno pela listagem à última etapa e preservação do aceite conferidos. O ambiente de conferência não tinha vendas (comparação de zero registros); valores não nulos também foram cobertos por respostas controladas nos testes de apresentação.
- Nenhuma chamada à Groq nem alteração do banco habitual do usuário foi necessária para esta verificação. O teste do fluxo completo de interpretação com os serviços habituais permanece como aceite funcional do ambiente.
