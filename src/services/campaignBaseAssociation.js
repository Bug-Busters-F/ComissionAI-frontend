export function availableCoverageLots(coverage, competence) {
  const month = coverage?.competencias?.find(item => item.competencia === competence)
  const lots = [...(month?.rh?.lotesDisponiveisNaoAnexados || []), ...(month?.vendas?.lotesDisponiveisNaoAnexados || [])]
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
