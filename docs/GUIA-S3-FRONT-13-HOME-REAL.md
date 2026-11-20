# FRONT-13 — Home com dados reais

## Integração disponível

A Home consulta somente operações de leitura, pela instância HTTP autenticada existente:

- `GET /api/v1/indicadores`: competências, campanhas, pendências, alertas, data da consulta e ações por perfil.
- `GET /api/v1/campanhas`: três campanhas mais recentes, na ordem retornada pelo servidor.

Configuração: `VITE_API_URL` já utilizada no projeto. Sem configuração adicional e sem alteração no backend ou na IA. Os dois pedidos têm prazo de 30 segundos e cancelamento ao sair da página. Não existe fallback de demonstração nesta tela, inclusive se o restante do projeto estiver em modo demonstrativo.

## Comportamento

- Cards mostram os totais recebidos; não calculam o total a partir das três campanhas recentes.
- “Pendências” é a soma de categorias definida pelo servidor, não uma contagem de linhas ou pessoas. A composição aparece no card.
- “Aguardando gerente” substitui o antigo indicador fixo de apuração; não existe esse total de apuração no contrato atual.
- Alertas mostram lotes com impedimentos e falhas de cálculo/fechamento. Fechamentos em processamento aparecem separadamente.
- O aviso fixo de dezembro e todos os números fixos foram removidos.
- Ao abrir a Home, ambas as fontes são consultadas. Cada seção tem erro e tentativa próprios. Falha não vira zero nem mensagem de lista vazia.
- Dados ficam somente no componente. Recarregar consulta novamente; sair limpa o estado. Troca de usuário/perfil/permissões refaz os pedidos e invalida respostas antigas.

## Próximas ações

Somente itens enviados em `aguardandoAcao` e permitidos pela política atual do frontend são exibidos. Auditor não recebe ações de alteração. URLs e métodos enviados pelo servidor não são executados: cada tipo conhecido é convertido para uma rota local existente.

| Tipo retornado | Destino |
| --- | --- |
| `ORCAMENTO_PENDENTE` | Proposta da campanha, etapa 1 |
| `REVISAO_CODIGO_PENDENTE` | Interpretação da campanha, etapa 2 |
| `APROVACAO_GERENCIAL_PENDENTE` | Conferência da campanha, etapa 4 |
| `LOTE_COM_IMPEDIMENTO` | Detalhes da campanha e suas bases |
| `FECHAMENTO_FALHOU` / `CALCULO_FALHOU` | Consulta de cálculos da competência |

O fluxo de destino continua aplicando seus próprios bloqueios e limites de etapa. O atalho não aprova código, não confirma orçamento, não publica e não inicia cálculos.

Limitação atual: o servidor pode enviar correção de lote para negócio, mas a política atual permite gerir bases somente a gerente/administrador. Esse atalho é omitido para negócio. O total do servidor permanece visível. A Home não amplia permissões para contornar essa diferença. Não inventa ações que o servidor não retornou para o gerente.

## Como verificar

1. Com backend atualizado e login válido, abrir `/home` e conferir os dois pedidos na rede.
2. Comparar os cards e a data com `/indicadores`; conferir as três campanhas com `/campanhas`.
3. Entrar com cada um dos cinco perfis: verificar ações permitidas, ausência de “Nova campanha” quando não autorizado e navegação para o item correto.
4. Voltar à Home após uma alteração real em campanhas ou bases. O resumo deve refletir a nova consulta.
5. Simular falha separada de cada consulta e repetir: a outra seção permanece utilizável; não devem aparecer exemplos ou zeros artificiais.
6. Conferir listas vazias e contagens zeradas legítimas. Sair durante uma consulta e entrar com outra conta: respostas antigas não podem reaparecer.

Testes automatizados usam respostas controladas do contrato, incluindo os cinco perfis, estados visuais, falhas, cancelamento e respostas antigas. A verificação com os serviços reais exige backend e banco em execução; testes controlados não a substituem.

### Evidências desta entrega — 20/11/2026

- Suíte completa com Node 24: **538 testes aprovados, 1 ignorado**. Inclui 20 testes novos de contrato, permissões, estado e apresentação da Home.
- Build de produção aprovado. Permanece o aviso já existente de tamanho do pacote principal.
- `git diff --check` sem erros.
- O Node 18 instalado no terminal não fornece todas as APIs usadas pelos testes existentes (`File` e `crypto`) e apresentou falhas de temporizadores. A suíte foi repetida com o Node 24 disponível no ambiente e passou sem alterações nessas áreas.
- O backend local em `127.0.0.1:8080` estava desligado; não foi realizada validação autenticada com dados reais nem iniciados serviços de outros repositórios.

## Integrações futuras

FRONT-7/FRONT-8 continuam responsáveis pela revisão do programa executável, confirmação de orçamento e calibrações. A Home apenas indica a pendência e abre o fluxo existente. Nenhuma dessas operações foi simulada ou implementada nesta entrega.
