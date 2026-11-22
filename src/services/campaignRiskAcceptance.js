export function riskSeverity(value) {
  const severity = String(value || '').toUpperCase()
  if (['ADVERTENCIA', 'AVISO'].includes(severity)) return 'AVISO'
  throw new Error('Erros impeditivos exigem correção do dado e não admitem aceite de risco.')
}

export async function findImportRisk(service, campaignId, { reportId, linha, campo, tipoBase, competencia, mensagem }) {
  if (!Number.isSafeInteger(reportId) || reportId <= 0 || !Number.isInteger(linha) || linha < 1 || !campo) throw new Error('Não foi possível identificar a origem desta pendência. Atualize o lote antes de continuar.')
  let page = 0, totalPages = 1
  const matches = []
  while (page < totalPages) {
    const result = await service.listPendencies(campaignId, { tipoBase, ...(competencia ? { competencia } : {}), page, size: 200 })
    if (!Array.isArray(result?.content)) throw new Error('Não foi possível consultar as pendências do arquivo.')
    matches.push(...result.content.filter(item => item.reportId === reportId && item.linha === linha && item.campo === campo))
    totalPages = result.totalPages ?? 1
    page++
  }
  const exact = matches.filter(item => item.motivo === mensagem)
  const found = exact.length === 1 ? exact[0] : matches.length === 1 ? matches[0] : null
  if (!found || !Number.isSafeInteger(found.inconsistenciaId) || found.inconsistenciaId <= 0) throw new Error('Não foi possível localizar uma pendência única deste arquivo para o aceite. Revalide o lote; se a pendência foi criada na preparação, corrija ou efetive o arquivo antes de tentar novamente.')
  riskSeverity(found.severidade)
  return found
}
