> Atualização de 22/10/2026: o escopo posterior de salvamento, simulação, aceite e ativação está no [guia de persistência multirregras](GUIA-PERSISTENCIA-MULTIRREGRAS.md). As restrições de fluxo somente em memória descritas abaixo pertencem à entrega anterior.

# Integração multirregras — guia consolidado

A implementação modifica somente o frontend, na branch `feat/formulario-multiregras`. Contratos de referência: backend `e3863c0`, IA `1cbcd1c`. O fluxo termina na revisão e permanece em memória; não salva, publica, ativa ou executa simulação.

## Configurar

Configure `VITE_CAMPAIGN_PROPOSALS_MODE=api` no ambiente local e reinicie o Vite. `VITE_API_URL=/api/v1` usa o proxy existente para `http://localhost:8080`. Para outra instalação, configure essa URL conforme a implantação. Não coloque credenciais da IA no navegador.

Abra `/campanhas/nova`. Os modos `manual` (padrão) e `demo` continuam separados; um erro de API nunca carrega exemplos. Os valores do formulário desaparecem ao recarregar; a saída solicita confirmação.

## Operações utilizadas

| Operação | Entrada | Tempo limite |
| --- | --- | --- |
| `POST /api/v1/interpretador/extrair-propostas` | `{ texto, contexto: { dataReferencia } }` | 75 s |
| Mesma operação para um bloco | `{ texto: textoIndividual, contexto: { dataReferencia, vigenciaCampanha: { inicio, fim } } }` | 75 s |
| `POST /api/v1/interpretador/atualizar-artefatos` | `{ proposta: PropostaRegraDTO }` com os campos atuais | 30 s |
| `POST /api/v1/interpretador/validar-proposta` | Filtros, taxa decimal e período; `campanhaId: null` | 30 s |

A interpretação completa não envia a vigência anterior, permitindo mudá-la pelo texto. A individual herda a vigência comum. Não há chamadas diretas à IA, ao interpretador antigo, a salvamento ou publicação.

Na reinterpretação completa, uma confirmação prévia autoriza substituir regras, ajustes manuais e vigência; a resposta válida é aplicada sem comparação posterior. Na individual, o modal segue o modelo da demonstração e permite comparar, corrigir, reinterpretar novamente e confirmar somente o bloco selecionado. Detalhes no [guia dos modais](GUIA-MODAIS-REINTERPRETACAO.md).

Exemplo de extração:

```json
{
  "texto": "3,5% na loja 75, de 1 a 31 de outubro de 2026",
  "contexto": { "dataReferencia": "2026-10-21" }
}
```

A resposta deve conter `propostas[]` e `pendenciasGerais[]`. Cada proposta traz `blocoId`, `trechoOrigem`, todos os filtros (incluindo os nulos), `condicaoValor` com os quatro campos, `operacaoBase`, `taxaFinal`, `pendencias`, `completa` e `vigencia`. Origens, referências, explicação e bônus são preservados. A interface não usa o ID recebido como ID persistido.

Exemplo mínimo de resposta compatível:

```json
{
  "tituloSugerido": "Campanha loja 75",
  "propostas": [{
    "blocoId": "bloco-1",
    "trechoOrigem": "3,5% na loja 75",
    "filtros": {
      "canal": null, "codMarca": null, "descrMarca": null,
      "codLoja": 75, "codCargo": null, "descriCargo": null, "matricula": null
    },
    "condicaoValor": {
      "valorMinimo": "0.00", "minInclusivo": true,
      "valorMaximo": "1000.00", "maxInclusivo": false
    },
    "operacaoBase": {
      "tipoOperacao": "DEFINIR_TAXA", "valorAjuste": "0.0350", "referenciaBase": null
    },
    "taxaFinal": "0.0350",
    "origensPorCampo": { "loja": "TEXTO", "taxa": "TEXTO" },
    "referenciasConsultadas": [],
    "explicacao": "Aplica comissão de 3,5% na loja 75, abaixo de R$ 1.000.",
    "pendencias": [], "completa": true,
    "vigencia": { "dataInicio": "2026-10-01", "dataFim": "2026-10-31" },
    "bonusPercentual": null, "bonusValorFixo": null
  }],
  "pendenciasGerais": []
}
```

Os ajustes visuais posteriores estão descritos no [guia rápido de interface](GUIA-AJUSTES-INTERFACE-MULTIRREGRAS.md).

## Quatro lotes

1. [Interpretação e contrato](GUIA-INTEGRACAO-MULTIRREGRAS-L1.md).
2. [Comparações e reinterpretação](GUIA-INTEGRACAO-MULTIRREGRAS-L2.md).
3. [Origens, edição e validação](GUIA-INTEGRACAO-MULTIRREGRAS-L3.md).
4. [Revisão e verificação](GUIA-INTEGRACAO-MULTIRREGRAS-L4.md).

## Limitações e futuras integrações

- O uso do extrator novo para um bloco é orquestrado pelo frontend. Não depende da operação dedicada antiga nem dos endpoints 501 da IA.
- A reinterpretação individual mantém o período comum. Para mudar a vigência, edite o texto completo e confirme a reinterpretação da campanha. Pendências recebidas continuam visíveis.
- O backend pode retornar origem genérica, assumir operadores ou emitir avisos de vigência e dados não interpretados. O frontend apresenta a evidência disponível; não reconstrói evidências perdidas no servidor.
- A validação cadastral não recebe faixas monetárias e pode utilizar o fallback do backend. Não certifica integralmente a regra nem o resultado financeiro.
- A atualização dos artefatos não reavalia a semântica de todo o texto. Pendências semânticas/desconhecidas continuam até nova interpretação. Apenas pendências mecânicas de campos explicitamente corrigidos e revalidados são retiradas.
- Operações, bônus e referências sem editor próprio são preservados e aparecem na revisão como somente leitura. Para alterar a operação/bonificação pelo texto, use a reinterpretação.
- O Python é um exemplo fixo, rotulado como demonstrativo; o código gerado pelo backend não substitui esse exemplo.
- Salvamento da coleção, recarga persistida, edição de campanhas existentes e histórico de versões precisam de tarefas posteriores. As rotas de edição existentes não foram migradas.

## Evidências e aprovação

Execute `npm test` e `npm run build`. Os testes de contrato usam respostas controladas; não acionam LLM nem banco. A homologação real exige backend, IA e banco funcionando e o roteiro do lote 4.

Na execução desta implementação, backend e IA não responderam em `localhost:8080` e `localhost:8000`. A verificação no navegador utilizou um servidor HTTP temporário de respostas controladas, sem persistência, separado do código do produto. Portanto a aprovação com os serviços reais permanece pendente.
