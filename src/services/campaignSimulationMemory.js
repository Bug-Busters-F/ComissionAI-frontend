import { userFacingText } from './userFacingText'

export function simulationMemory(row, simulation = {}) {
  const raw = row?.raw
  const legacy = typeof row?.memoriaCalculo === 'object' && row.memoriaCalculo ? row.memoriaCalculo : {}
  const selected = raw?.cenario100
  const origin = selected?.origemTaxa
  const baseApplied = ['BASE_COMISS', 'BASE_CONTRATUAL'].includes(origin)
  const scenarios = ['100', '80', '120', '150'].flatMap((key) => {
    const c = raw?.['cenario' + key]
    return c ? [{ key, value: c.valorVenda, rate: c.taxaAplicada == null ? null : Number(c.taxaAplicada) * 100,
      commission: c.valorComissao, rule: c.regraNome || (['BASE_COMISS', 'BASE_CONTRATUAL'].includes(c.origemTaxa) ? 'Taxa contratual' : 'Não informada'),
      changedRange: c.mudouFaixaEmRelacaoA100 === true }] : []
  })
  return {
    date: raw?.dataVenda || legacy.dataVenda || null,
    competence: simulation.competencia || legacy.competenciaOrigemBase || null,
    saleSource: raw ? 'Vendas da competência selecionada' : userFacingText(legacy.origemDados) || 'Origem não detalhada nesta simulação',
    audienceSource: raw ? 'Dados da venda e do vínculo de RH usados na simulação' : 'Origem do público não detalhada nesta simulação',
    baseSource: raw?.taxaBaseContratual != null ? 'Taxa contratual de referência desta competência' : userFacingText(legacy.documentoOrigemBase) || 'Referência contratual não informada',
    appliedSource: origin === 'REGRA_PROPOSTA' ? 'Regra da campanha' : baseApplied ? 'Taxa contratual mantida' : legacy.manteveRegraBase === true ? 'Taxa contratual mantida' : 'Origem da taxa não informada',
    rule: baseApplied ? 'Taxa contratual' : userFacingText(selected?.regraNome || legacy.regraAplicada) || null,
    eligibility: selected ? selected.atendeFaixaValor === true ? 'Atende às condições da regra aplicada' : selected.atendeFaixaValor === false ? 'A condição de valor da regra não foi atendida' : 'Condição não detalhada' : userFacingText(legacy.condicaoOuFaixaSatisfeita) || null,
    baseRate: row?.taxaBasePct ?? legacy.taxaBasePct ?? null,
    rate: row?.taxaPropostaPct ?? legacy.taxaFinalPct ?? null,
    bonusPercentAmount: selected?.valorBonusPercentual ?? null,
    bonusFixedAmount: selected?.valorBonusFixo ?? null,
    rounding: raw ? 'Comissão e bônus arredondados separadamente para centavos. Quando a terceira casa é 5 ou maior, o centavo sobe.' : userFacingText(legacy.criterioArredondamento) || 'Critério de arredondamento não informado',
    scenarios,
    duration: simulation.diasInclusivos ?? simulation.totals?.duracaoCampanhaDias ?? null,
    factor: simulation.fatorProjecao ?? simulation.totals?.fatorDuracaoTexto ?? null,
    explanation: typeof row?.memoriaCalculo === 'string' ? userFacingText(row.memoriaCalculo) : null
  }
}
