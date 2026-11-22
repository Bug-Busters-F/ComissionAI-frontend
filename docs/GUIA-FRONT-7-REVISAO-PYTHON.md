# FRONT-7 — Revisão do programa executável

Branch: `feat/revisao-python-simulacao-calibracoes`. Base frontend: dev `1d22f98`. Usa o backend `feat/simulacao-python-calibracoes` e a IA dev `7b1a182` (PR #18).

## Como usar

1. Crie/interprete e salve uma campanha. Na etapa 2, confira o painel **Revisão técnica do programa**.
2. Analista de código ou administrador pode editar o programa completo, salvar uma nova revisão, comparar com o histórico e aprovar o código exibido. Os demais perfis consultam.
3. Depois de editar campos ou aplicar uma calibração, use **Validar dados e preparar revisão** antes de aprovar o programa. A preparação atualiza explicações/validações e salva eventuais mudanças; confira novamente o código exibido.
4. A devolução exige justificativa. O responsável vem da sessão do servidor, sem nome livre no formulário.
5. Código editado ainda não salvo bloqueia aprovação, atualização do painel e mudança de etapa. É possível descartar somente essa edição.
6. Uma nova revisão invalida a aprovação e a simulação da proposta. A etapa 3 exige programa atualmente aprovado e válido para execução, além das validações das regras.

## Integração

O navegador usa a instância HTTP autenticada e somente o backend:

- `GET /campanhas/{id}/programa-python`
- `GET /campanhas/{id}/programa-python/historico`
- `PUT /campanhas/{id}/programa-python`, com `codigoFonte` e `justificativa`.
- `POST /campanhas/{id}/programa-python/aprovar`, com `checksumEsperado` e parecer opcional.
- `POST /campanhas/{id}/programa-python/rejeitar`, com justificativa obrigatória.

O programa completo é distinto dos trechos Python por regra. A assinatura e a versão aprovadas são conferidas novamente antes da execução. Falhas não produzem aprovação local fictícia. Os comentários do programa constituem as premissas declaradas disponíveis; o contrato não traz um documento separado de premissas.

A comparação é textual, preservando contexto comum e destacando linhas removidas/adicionadas. Não é um interpretador semântico de Python.

## Pontos de atenção para próximas integrações

A aprovação tem controle atômico por checksum no servidor. Atualização e rejeição ainda não recebem checksum esperado; o frontend confere o programa imediatamente antes dessas operações, mas uma garantia atômica adicional para essas duas ações exige evolução do backend.

Consulte o guia FRONT-8 para execução, orçamento e aplicação de alternativas. Testes controlados não substituem a aprovação funcional do usuário no ambiente configurado.

## Evidências locais

Verificado no navegador com serviços reais: programa completo gerado, aprovação por assinatura, autoria do servidor, edição técnica criando nova revisão, nova aprovação e execução da versão editada. Após calibração, preparar as validações antes de aprovar permitiu voltar à simulação sem ciclo de invalidação. Consulte o guia FRONT-8 para os valores e resultados registrados. A aceitação funcional final continua a cargo do usuário.
