export function campaignBaseLabel(type) { return ({ HR: 'RH', SALES: 'Vendas', COMISSIONS: 'Taxas de comissão', COMMISSIONS: 'Taxas de comissão' })[type] || 'Base' }
export function availableCoverageLots(coverage, competence) {
  const month = coverage?.competencias?.find(item => item.competencia === competence)
  const lots = [...(month?.rh?.lotesDisponiveisNaoAnexados || []), ...(month?.vendas?.lotesDisponiveisNaoAnexados || []), ...(month?.taxasBase?.lotesDisponiveisNaoAnexados || [])]
  return [...new Map(lots.filter(item => Number.isSafeInteger(item.reportId) && item.reportId > 0).map(item => [item.reportId, item])).values()]
}
export function uploadReportIds(result) {
  const ids = result?.reportIds || [result?.rh?.reportId, result?.vendas?.reportId]
  if (ids.length !== 2 || ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== 2) throw Error('Os identificadores dos dois arquivos não foram confirmados. Atualize a lista de lotes antes de associar.')
  return ids
}
export async function associateReports(service, campaignId, ids) {
  const pending = [...ids]
  while (pending.length) {
    try { await service.attachBase(campaignId, { reportId: pending[0] }); pending.shift() }
    catch (error) { error.pendingReportIds = [...pending]; throw error }
  }
}

// Cobertura de fechamento só inclui versões publicadas e meses da vigência.
// A seleção de arquivos deve também funcionar em rascunhos e referências históricas.
export function availableImportedLots(imports, competence, attachments = []) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(competence || '')) return []
  const attached = new Set(attachments.map(item => item.reportId))
  const eligible = imports.filter(item => Number.isSafeInteger(item.reportId) && item.reportId > 0 &&
    item.status === 'CONCLUIDO' && !item.excluidoEm && !item.rejeicaoIntegral && !attached.has(item.reportId) &&
    (item.competencia === competence || (item.tipoBase === 'HR' && !item.competencia)) &&
    ['HR', 'SALES', 'COMISSIONS'].includes(item.tipoBase))
  return [...new Map(eligible.map(item => [item.reportId, {
    ...item, nomeArquivoOriginal: item.nomeArquivo, linhasValidas: item.totalLinhas
  }])).values()]
}
