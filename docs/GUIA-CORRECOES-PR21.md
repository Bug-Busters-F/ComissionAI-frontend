# Correções de integração — PR #21

## Comportamento

- Nenhum login automático, senha embutida, perfil simulado ou gerente fictício. A área confirma a identidade por `GET /auth/me`; sem sessão confirmada, alterações ficam bloqueadas.
- O cliente HTTP usa o mesmo `authSession` do trabalho de login (`comissionai.auth.session.v1`, em sessionStorage). A sessão guarda somente token e validade. Respostas de outra sessão são descartadas; expiração cancela requisições.
- As consultas de campanhas usam o cliente autenticado. Falhas de consulta/edição/associação são apresentadas ao usuário.
- Lotes disponíveis vêm de `GET /campanhas/{id}/cobertura-fechamento`, por competência, em `rh.lotesDisponiveisNaoAnexados` e `vendas.lotesDisponiveisNaoAnexados`. Cada lote possui seu próprio botão de associação. Não se presume um ID a partir da competência.
- O upload conjunto usa os dois IDs efetivamente retornados (`reportIds`, ou `rh.reportId` e `vendas.reportId`). Após falha parcial de associação, a repetição envia somente os lotes ainda pendentes.
- Aceite/revogação retornam erros reais, inclusive 404/403/500. Dados de demonstração foram removidos do provedor real.
- Em HTTP 409 a edição permanece bloqueada e mantém os dados digitados. A linha atual é consultada na coleção paginada. O usuário compara os valores e escolhe os atuais ou confirma explicitamente manter os seus. Não há incremento presumido de versão.
- A efetivação não fica disponível sem prévia, durante carregamento, após falha da prévia ou quando esta informa bloqueio de fechamento.

## Integração com o trabalho de login

Este PR não cria telas de login nem substitui o trabalho de FRONT-1/2. Para utilização completa, integrar esse trabalho com a mesma instância de `authSession` e preservar o cliente HTTP compartilhado, sem restaurar o login automático do PR original. O adaptador `bases-auth` serve somente à área de bases e consulta a identidade real; não persiste usuário/perfil nem cria uma segunda sessão. A extensão `authSession.subscribe` limpa esse adaptador ao expirar/trocar a sessão, sem substituir o callback utilizado pela tela de login.

## Dependências reais

- BACK-5: preparação, edição, histórico, revalidação e efetivação.
- BACK-6: diagnóstico de cobertura e associação/desassociação.
- BACK-7: aceite e revogação de pendências. Enquanto indisponível, a ação falha explicitamente; não existe registro fictício.
- A listagem de lotes utiliza o recorte de vigência devolvido pela cobertura. Uma competência usada apenas como referência de simulação, fora desse recorte, não fabrica lotes anexáveis.

## Roteiro

1. Entrar como gerente/administrador e conferir permissões; repetir como auditor e sem sessão.
2. Selecionar um lote real de RH e outro de vendas, conferindo os anexos após recarregar.
3. Enviar RH + vendas; provocar falha na segunda associação e repetir, confirmando que a primeira não é reenviada.
4. Editar a mesma linha em duas sessões. A segunda deve exibir comparação e exigir decisão.
5. Indisponibilizar o aceite ou devolver 404: a pendência deve permanecer e a falha deve aparecer.
6. Falhar a consulta de campanhas ou a prévia: não apresentar ausência de impacto como certeza nem permitir efetivação sem prévia válida.

## Verificação

A suíte automatizada usa respostas controladas. Os resultados não substituem a validação funcional com os serviços da sprint 3 e o login integrado. Não foram alterados registros reais durante a correção.

Resultado desta revisão: 397 testes aprovados, 1 teste opcional ignorado e build de produção aprovado. Permanece o aviso de tamanho do pacote JavaScript, já existente no PR original.
