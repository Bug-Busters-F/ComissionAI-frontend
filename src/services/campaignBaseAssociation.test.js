import { describe, it, expect, vi } from 'vitest'
import { associateReports, availableCoverageLots, uploadReportIds } from './campaignBaseAssociation'
describe('real base identities', () => {
  it('uses RH and Sales lots from coverage, not aggregate competence IDs', () => {
    const lot = { reportId: 5, tipoBase: 'HR' }
    expect(availableCoverageLots({ competencias: [{ competencia: '2025-07', rh: { lotesDisponiveisNaoAnexados: [lot] }, vendas: { lotesDisponiveisNaoAnexados: [{ reportId: 8 }] } }] }, '2025-07').map(l => l.reportId)).toEqual([5, 8])
    expect(availableCoverageLots(null, '2025-07')).toEqual([])
  })
  it('extracts both confirmed upload identities and rejects incomplete responses', () => {
    expect(uploadReportIds({ reportIds: [5, 8] })).toEqual([5, 8])
    expect(uploadReportIds({ rh: { reportId: 5 }, vendas: { reportId: 8 } })).toEqual([5, 8])
    expect(() => uploadReportIds({ reportId: 10042 })).toThrow()
  })
  it('retries only failed/unattempted associations after a partial success', async () => {
    const service = { attachBase: vi.fn().mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({}) }
    let pending
    try { await associateReports(service, 2, [5, 8]) } catch (error) { pending = error.pendingReportIds }
    expect(pending).toEqual([8])
    await associateReports(service, 2, pending)
    expect(service.attachBase.mock.calls).toEqual([[2, { reportId: 5 }], [2, { reportId: 8 }], [2, { reportId: 8 }]])
  })
})
