# Integração de rascunho, simulação, aceite e ativação multirregras

> Atualização: Python, origens persistidas, progresso e impacto agora seguem o [guia de revisão e rastreabilidade](GUIA-REVISAO-RASTREABILIDADE-CAMPANHAS.md). As menções anteriores a código demonstrativo nessas etapas foram substituídas.
Entrega de 22/10/2026, somente frontend na branch `feat/formulario-multiregras`. Complementa a integração de interpretação já existente. Referências inspecionadas: backend dev `75a8e60`; layout de simulação reaproveitado de frontend `origin/dev` `519ed06`. Nenhum merge global da dev e nenhuma alteração no código do backend/IA.

## Guias rápidos por lote

1. [Salvar e reabrir](GUIA-PERSISTENCIA-MULTIRREGRAS-L1.md).
2. [Simulação real](GUIA-PERSISTENCIA-MULTIRREGRAS-L2.md).
3. [Aceite e conferência](GUIA-PERSISTENCIA-MULTIRREGRAS-L3.md).
4. [Ativação e proteções](GUIA-PERSISTENCIA-MULTIRREGRAS-L4.md).

## Configuração

Use `VITE_CAMPAIGN_PROPOSALS_MODE=api` e `VITE_API_URL=/api/v1`; reinicie o frontend após trocar ambiente. O proxy existente aponta para `localhost:8080`. Credenciais da IA continuam no servidor. Manual/demo não gravam nem ativam campanhas reais.

O backend em execução precisa conter as operações de simulação/aceite/conferência/ativação já presentes no código dev. Conferir a documentação gerada do serviço em execução evita confundir código disponível com container atualizado. Também são necessárias competências e bases com cobertura cadastral/contratual para simular.

## Exemplo reduzido do contrato de persistência

```json
{
  "titulo": "Outubro",
  "textoOriginal": "Campanha válida de 01/10/2026 a 31/10/2026...",
  "estado": "DRAFT",
  "dataInicio": "2026-10-01",
  "dataFim": "2026-10-31",
  "regras": [
    { "blocoId": "identidade-local-a", "canal": "LOJA_FISICA", "taxa": "0.035", "valorMaximo": "1000.00", "maxInclusivo": false, "completa": true },
    { "blocoId": "identidade-local-b", "canal": "LOJA_FISICA", "taxa": "0.05", "valorMinimo": "1000.00", "minInclusivo": true, "completa": true }
  ]
}
```

O backend retorna `id`, estado, datas confirmadas e `regras[]` com seus próprios IDs. O frontend preserva todas as regras e distingue esses IDs dos `clientId`. O campo `completa` enviado pelo formulário depende de validação e artefatos atuais; o exemplo acima pressupõe essa verificação.

Simulação: `POST /simulacoes` com `{ "campanhaId": 42, "competencia": "2026-09", "limite": 10, "pagina": 0 }`. O retorno inclui `id`, `protocolo`, `cenario100/80/120/150`, vendas e memórias reais.

Aceite: `POST /simulacoes/{id}/aceite` com `{ "campanhaId": 42, "aceitoPor": "Responsável informado", "motivo": null }`. O backend deve confirmar `statusAceite: "ACEITA"`; a conferência precisa apontar `aptaParaAtivacao: true` para o mesmo ID. Somente então a ativação dedicada é disponibilizada.

## Evidências da execução

### Automatizadas e controladas

- Suíte completa: 192 testes em 24 arquivos, sem chamadas ao modelo. Build de produção aprovado; permanece o aviso conhecido de bundle acima de 500 kB.
- Cobertura adicionada: coleção completa, precisão, limites/zero, matrícula, rascunhos incompletos, datas padrão com confirmação, reabertura, falhas e respostas antigas, criação incerta, navegação por URL, concorrência preventiva, aceite formal, recuperação de aceite e ativação sem PUT intermediário.
- Navegador com API controlada separada: interpretar três blocos → salvar → F5 → validar → simular → abrir memória → informar responsável → aceitar → conferir → F5 com recuperação do aceite → copiar Python demonstrativo → ativar → consultar as três regras.
- O registro HTTP desse cenário confirmou ausência de PUT entre aceite e ativação. Esse teste valida a integração da interface, não o cálculo financeiro do backend real.

### Serviços reais

- Backend e banco responderam. `POST /campanhas` retornou 201 para rascunho com três regras, uma incompleta; GET retornou os três blocos e período padrão real `2026-10-22` a `2026-11-21`.
- Conferidos limites `0 ≤ venda < 1000`, mínimo inclusivo da segunda regra, taxa decimal `0.035` e matrícula `001234`.
- Navegador abriu o rascunho real, corrigiu a taxa da terceira regra para 4%, salvou por PUT e confirmou `[3,5; 5; 4]` após F5. O registro temporário de QA foi removido ao final.
- `GET /referencias/competencias` retornou lista vazia.
- A documentação do backend em execução não continha `/simulacoes`, `/simulacoes/{id}/aceite`, `/campanhas/{id}/conferencia-simulacao` nem `/campanhas/{id}/ativar`, embora existam no código dev inspecionado. A tentativa do último endpoint retornou erro 500 de recurso inexistente. Não é uma rejeição funcional de regra, e não houve ativação real.
- Portanto, simulação financeira real, aceite e ativação real aguardam execução do backend atualizado e bases de referência. Nenhuma chamada à Groq foi necessária nesta verificação.

## Limitações atuais e próximas integrações

O contrato de campanha não persiste a rastreabilidade estruturada completa nem a confirmação de “todas as vendas”. O frontend não simula esses dados após F5. Pendências desconhecidas recuperadas como texto exigem reinterpretação. Versionamento de campanhas aprovadas e fechamento continuam fora do fluxo; campanhas fora de DRAFT não recebem PUT.

O GET preventivo detecta várias mudanças concorrentes, mas não elimina a janela entre conferir e escrever. Concorrência estrita exige suporte transacional de versão/ETag no backend. Criação idempotente exige chave própria no contrato. O responsável pelo aceite é explícito enquanto não houver autenticação integrada.

As alterações estão locais, sem commit ou push. A aprovação funcional completa depende da homologação com os serviços atualizados e dados reais.
