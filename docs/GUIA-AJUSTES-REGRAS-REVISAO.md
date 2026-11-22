# Regras de negócio e revisão do programa Python

## Responsabilidades

- Negócios: define título, descrição, valores e regras nas etapas 1 e 2, incluindo reinterpretação, adição e remoção. Valida e salva os dados antes de encaminhar o programa para revisão. Mantém a responsabilidade pela simulação na etapa 3.
- Código: consulta as regras na etapa 2 e revisa, edita, aprova ou devolve somente o programa completo. Não salva parâmetros da campanha nem solicita interpretação das regras.
- Administrador: mantém acesso às duas responsabilidades. Gerente e auditor mantêm suas permissões anteriores.

Para negócios, a etapa 2 exibe somente a situação da aprovação, sem código. O avanço para simulação e conferência permanece bloqueado até uma aprovação atual. A ação “Validar e enviar para revisão” prepara e salva os parâmetros alterados; “Verificar aprovação” consulta o estado mais recente.

Para código e demais perfis de consulta, o programa completo aparece depois das regras, com o painel escuro e texto verde usado anteriormente nos códigos individuais. Os códigos individuais deixaram de ser exibidos, inclusive nos resumos e histórico; os dados já armazenados não são apagados. Origens, explicações, pendências e resumo do impacto continuam disponíveis.

## Integração

Aplicar também a branch `fix/permissoes-edicao-regras` no backend. A API restringe o PUT da campanha e as operações de interpretação a negócios/administrador; preserva a edição e aprovação do programa para código/administrador. Não há migração de dados ou alteração na IA.

As alterações nas regras continuam invalidando a aprovação e os resultados anteriores da proposta. É necessário validar/salvar a proposta, revisar o novo programa e simular novamente antes da publicação.

Mensagens técnicas recebem tradução apenas na apresentação. As evidências e a severidade da validação são preservadas; falhas não são convertidas em sucesso.

## Conferência rápida

1. Negócios abre um rascunho na etapa 2, altera uma taxa e adiciona/remove uma regra. O Python não aparece; somente a situação da aprovação é exibida.
2. Negócios valida e salva a proposta. Código abre a mesma campanha, consulta os valores e edita/aprova o programa. Os campos de negócio não ficam disponíveis para alteração.
3. Após alteração do programa ou das regras, confirmar que é exigida nova aprovação/simulação conforme o fluxo existente.
4. Conferir que o único painel Python aparece depois das regras e que o indicador da etapa mostra “Disponível”.
5. Em uma falha de conexão/interpretação, verificar orientação legível e preservação dos campos.

## Evidências

- Frontend: suíte automatizada, build de produção e conferência dos dois perfis em navegador com respostas controladas.
- Backend: testes de autenticação/autorização com filtros reais e banco isolado.
- Uma interpretação nova com o provedor de IA e a simulação completa não fazem parte da conferência automatizada deste ajuste.

O indicador de aprovação na etapa 2 usa layout compacto: texto e ação lado a lado em telas maiores e empilhados no celular, preservando as mesmas permissões e condições de avanço. Não exige integração adicional.

O indicador de aprovação compartilha agora a coluna dos cards de regras, mantendo as bordas alinhadas e reservando a coluna lateral para a navegação.
