export const CAMPAIGN_PROPOSAL_SCENARIOS = Object.freeze({
  threeComplete: {
    label: 'Três regras completas',
    data: {
      schemaVersion: 'frontend-s2-provisional-1',
      campanha: {
        titulo: 'Incentivo de outubro',
        descricao: '3,5% para vendas abaixo de R$ 1.000; 5% a partir de R$ 1.000; 4% para a loja 75.',
        dataInicio: '2026-10-01',
        dataFim: '2026-10-20'
      },
      propostas: [
        {
          clientId: 'demo-three-a',
          origem: 'demonstracao',
          textoOrigem: '3,5% para marca PRETO e cargo 100, abaixo de R$ 1.000.',
          filtros: { codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: '0.035',
          condicaoValor: { minimo: null, minimoInclusivo: null, maximo: '1000.00', maximoInclusivo: false },
          metadados: { demonstrativo: true }
        },
        {
          clientId: 'demo-three-b',
          origem: 'demonstracao',
          textoOrigem: '5% para marca PRETO e cargo 100, a partir de R$ 1.000.',
          filtros: { codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: '0.05',
          condicaoValor: { minimo: '1000.00', minimoInclusivo: true, maximo: null, maximoInclusivo: null },
          metadados: { demonstrativo: true }
        },
        {
          clientId: 'demo-three-c',
          origem: 'demonstracao',
          textoOrigem: '4% para cargo 100 na loja 75.',
          filtros: { codMarca: null, descrMarca: null, codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: 75, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: '0.04',
          condicaoValor: { minimo: null, minimoInclusivo: null, maximo: null, maximoInclusivo: null },
          metadados: { demonstrativo: true }
        }
      ]
    }
  },
  incomplete: {
    label: 'Regra incompleta',
    data: {
      campanha: {
        titulo: 'Exemplo com pendência',
        descricao: '3% para vendedores e mais comissão para vendedores.',
        dataInicio: '2026-10-01',
        dataFim: '2026-10-20'
      },
      propostas: [
        {
          clientId: 'demo-incomplete-a',
          origem: 'demonstracao',
          textoOrigem: '3% para vendedores.',
          filtros: { codMarca: null, descrMarca: null, codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: '0.03',
          condicaoValor: { minimo: null, minimoInclusivo: null, maximo: null, maximoInclusivo: null },
          metadados: { demonstrativo: true }
        },
        {
          clientId: 'demo-incomplete-b',
          origem: 'demonstracao',
          textoOrigem: 'Mais comissão para vendedores; o percentual não foi definido.',
          filtros: { codMarca: null, descrMarca: null, codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: null,
          condicaoValor: { minimo: null, minimoInclusivo: null, maximo: null, maximoInclusivo: null },
          metadados: { demonstrativo: true }
        }
      ]
    }
  },
  ambiguousLimit: {
    label: 'Limite sem operador',
    data: {
      campanha: { titulo: 'Limite ambíguo', descricao: '5% a partir de R$ 1.000.', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [{
        clientId: 'demo-ambiguous',
        origem: 'demonstracao',
        textoOrigem: '5% a partir de R$ 1.000, sem inclusão confirmada.',
        filtros: { codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
        taxa: '0.05',
        condicaoValor: { minimo: '1000.00', minimoInclusivo: null, maximo: null, maximoInclusivo: null },
        metadados: { demonstrativo: true }
      }]
    }
  },
  inclusiveOverlap: {
    label: 'Conflito no limite',
    data: {
      campanha: { titulo: 'Conflito no limite', descricao: 'Duas faixas incluem R$ 1.000.', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [
        {
          clientId: 'demo-overlap-a',
          origem: 'demonstracao',
          textoOrigem: 'Até R$ 1.000, incluindo o limite.',
          filtros: { codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: '0.035',
          condicaoValor: { minimo: null, minimoInclusivo: null, maximo: '1000.00', maximoInclusivo: true },
          metadados: { demonstrativo: true }
        },
        {
          clientId: 'demo-overlap-b',
          origem: 'demonstracao',
          textoOrigem: 'A partir de R$ 1.000, incluindo o limite.',
          filtros: { codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
          taxa: '0.05',
          condicaoValor: { minimo: '1000.00', minimoInclusivo: true, maximo: null, maximoInclusivo: null },
          metadados: { demonstrativo: true }
        }
      ]
    }
  },
  registration: {
    label: 'Matrícula individual',
    data: {
      campanha: { titulo: 'Matrícula individual', descricao: '7% para a matrícula 001234.', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [{
        clientId: 'demo-registration',
        origem: 'demonstracao',
        textoOrigem: '7% para a matrícula 001234.',
        filtros: { codMarca: null, descrMarca: null, codCargo: null, descriCargo: null, codLoja: null, canal: null, matricula: '001234', publicoTodasVendas: false },
        taxa: '0.07',
        condicaoValor: { minimo: null, minimoInclusivo: null, maximo: null, maximoInclusivo: null },
        metadados: { demonstrativo: true }
      }]
    }
  },
  unsupported: {
    label: 'Condição não suportada',
    data: {
      campanha: { titulo: 'Condição não suportada', descricao: 'Bônus fixo de R$ 100 para vendedores.', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [{
        clientId: 'demo-unsupported',
        origem: 'demonstracao',
        textoOrigem: 'Bônus fixo de R$ 100 para vendedores.',
        filtros: { codMarca: null, descrMarca: null, codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
        taxa: null,
        condicaoValor: { minimo: null, minimoInclusivo: null, maximo: null, maximoInclusivo: null },
        pendenciasRemotas: [{
          id: 'demo-unsupported-condition',
          codigo: 'CONDICAO_NAO_SUPORTADA',
          severidade: 'IMPEDITIVO',
          escopo: 'PROPOSTA',
          mensagem: 'Bônus fixo ainda não pode ser representado como taxa percentual nesta etapa.',
          origem: 'IA',
          exigeValidacaoRemota: true
        }],
        metadados: { demonstrativo: true, operacoes: [{ tipo: 'bonus-fixo', valor: '100.00', moeda: 'BRL' }] }
      }]
    }
  },
  adjustmentWithoutBase: {
    label: 'Ajuste sem taxa base',
    data: {
      campanha: { titulo: 'Ajuste sem base', descricao: 'Adicionar 1 ponto percentual à taxa atual.', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [{
        clientId: 'demo-no-base',
        origem: 'demonstracao',
        textoOrigem: 'Adicionar 1 ponto percentual à taxa atual.',
        filtros: { codMarca: 10, descrMarca: 'PRETO', codCargo: 100, descriCargo: 'VENDEDOR LOJA', codLoja: null, canal: null, matricula: null, publicoTodasVendas: false },
        taxa: null,
        condicaoValor: { minimo: null, minimoInclusivo: null, maximo: null, maximoInclusivo: null },
        pendenciasRemotas: [{
          id: 'demo-adjustment-no-base',
          codigo: 'AJUSTE_SEM_BASE',
          severidade: 'IMPEDITIVO',
          escopo: 'PROPOSTA',
          mensagem: 'A taxa final não foi definida porque a taxa base e a operação ainda não foram validadas.',
          origem: 'IA',
          exigeValidacaoRemota: true
        }],
        metadados: { demonstrativo: true, operacoes: [{ tipo: 'adicionar-pontos-percentuais', valor: '1' }] }
      }]
    }
  },
  malformedCollection: {
    label: 'Resposta com regra incompleta',
    data: {
      campanha: { titulo: 'Preservação de regra', descricao: 'Exemplo de resposta parcial.', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [
        { clientId: 'demo-malformed-valid', origem: 'demonstracao', filtros: { codLoja: 75, codCargo: 100 }, taxa: '0.04', condicaoValor: {}, metadados: { demonstrativo: true } },
        null
      ]
    }
  }
})

export function getCampaignProposalFixture(key) {
  const scenario = CAMPAIGN_PROPOSAL_SCENARIOS[key]
  if (!scenario) throw new RangeError('Cenário demonstrativo desconhecido.')
  return JSON.parse(JSON.stringify(scenario.data))
}
