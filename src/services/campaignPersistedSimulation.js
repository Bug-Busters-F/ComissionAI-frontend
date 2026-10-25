import { decimalFractionToPercent } from './campaignProposalValidation'
import { roundHalfUp } from './campaignSimulationService'

export function assertSimulation(raw, campaignId, competence) {
  if (!raw?.id || !raw.protocolo || String(raw.campanhaId) !== String(campaignId) || raw.competencia !== competence || !Array.isArray(raw.vendas) || !['100', '80', '120', '150'].every((key) => raw['cenario' + key] && ['totalVendas', 'totalComissaoBase', 'totalComissaoProposta', 'deltaComissao', 'deltaPercentual', 'comissaoProjetada', 'deltaProjetado'].every((field) => raw['cenario' + key][field] != null && Number.isFinite(Number(raw['cenario' + key][field]))))) throw new Error('A simulação retornou dados incompletos ou de outra campanha. Nenhum resultado foi aceito.')
  return raw
}
export function simulationSaleRow(row) {
  return { saleId: row.id, matricula: row.matricula, loja: row.codLoja ?? 'Não informada', marca: row.descrMarca || row.codMarca || 'Não informada', cargo: row.descriCargo || row.codCargo || 'Não informado', valorVenda: row.valorVendaOriginal, comissaoBase: row.valorComissaoBase, taxaBasePct: decimalFractionToPercent(row.taxaBaseContratual), comissaoProposta: row.cenario100?.valorComissao, diferenca: row.deltaComissao100, taxaPropostaPct: decimalFractionToPercent(row.cenario100?.taxaAplicada), memoriaCalculo: row.memoriaCalculo || 'Memória não informada pelo backend.', valida: row.valida, impedimentos: row.impedimentos || [], raw: row }
}
export function simulationViewModel(raw) {
  const c = raw.cenario100
  const factor = Number(raw.fatorProjecao)
  return { ...raw, rows: raw.vendas.map(simulationSaleRow), totals: {
    totalVendasConsideradas: raw.totalVendasRecortadas, duracaoCampanhaDias: raw.diasInclusivos, fatorDuracaoTexto: raw.fatorProjecao,
    historico: { totalVendas: c.totalVendas, comissaoBase: c.totalComissaoBase, comissaoProposta: c.totalComissaoProposta, diferenca: c.deltaComissao, impactoPct: c.deltaPercentual },
    // Presentation-only derivations, from the consolidated values returned by the backend.
    projetado: { totalVendas: Number(c.totalVendas) * factor, comissaoBase: Number(c.comissaoProjetada) - Number(c.deltaProjetado), comissaoProposta: c.comissaoProjetada, diferenca: c.deltaProjetado, impactoPct: c.deltaPercentual }
  }, scenarios: ['80', '120', '150'].map((key) => { const s = raw['cenario' + key]; return { key, percentage: key + '%', sales: roundHalfUp(Number(s.totalVendas) * factor), withoutProposal: roundHalfUp(Number(s.comissaoProjetada) - Number(s.deltaProjetado)), withProposal: s.comissaoProjetada, impact: s.deltaProjetado, impactPct: s.deltaPercentual, vendasQueMudaramDeFaixa: s.qtdVendasComMudancaFaixa, comissaoProjetada: s.comissaoProjetada, deltaProjetado: s.deltaProjetado } }) }
}

// A API já pagina as vendas; não aplicar novamente a paginação local da tela da dev.
export function persistedSimulationPagination(simulation) {
  const page = simulation.page || 1
  const pageSize = simulation.pageSize || 10
  const totalItems = simulation.totalItems || 0
  const totalPages = Math.max(1, simulation.totalPages || 1)
  const items = simulation.result?.rows || []
  return {
    page, pageSize, totalItems, totalPages, items,
    startIndex: items.length ? (page - 1) * pageSize + 1 : 0,
    endIndex: items.length ? Math.min((page - 1) * pageSize + items.length, totalItems) : 0,
    hasPrev: page > 1, hasNext: page < totalPages
  }
}
