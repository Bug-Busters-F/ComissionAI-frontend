import { describe, it, expect, vi } from 'vitest'
import { effectScope, reactive } from 'vue'
import { createCampaignProposalLifecycle } from './campaignProposalLifecycle'
import { campaignFixture, savedResponse, programFixture } from './campaignLifecycleTestFixtures'
import { createCampaignLifecycleApi } from './campaignLifecycleApi'
import { normalizeBackendCampaignResponse } from './campaignProposalMappers'
import { programLineDiff } from './campaignProgramReview'

const clone = value => JSON.parse(JSON.stringify(value))
function setup(permissions = {}) {
  const campaign = reactive(campaignFixture()); campaign.propostas = campaign.propostas.slice(0, 1)
  let saved = savedResponse(campaign), program = programFixture()
  const scenario = { totalVendas: '1000', totalComissaoBase: '20', totalComissaoProposta: '40', deltaComissao: '20', deltaPercentual: '100', comissaoProjetada: '40', deltaProjetado: '20', enquadramento: { dentroDoOrcamento: true, excedenteOrcamento: 0 } }
  const result = { id: 'sim-1', protocolo: 'protocol', campanhaId: 42, competencia: '2025-07', executadoViaPython: true, versaoProgramaPython: 1, checksumPython: 'a'.repeat(64), totalVendasRecortadas: 1, fatorProjecao: '1', diasInclusivos: 30, cenario80: scenario, cenario100: scenario, cenario120: scenario, cenario150: scenario, vendas: [], analise: { assinaturaPrograma: 'a'.repeat(64), orcamento: 100000, statusSugestoes: 'OK', calibracoes: [{ cenario: '150%', status: 'ENQUADRADA', alteracoes: [{ regraId: 101, campo: 'taxa', antes: '0.035', depois: '0.03' }] }] } }
  const api = {
    load: vi.fn(async () => clone(saved)), save: vi.fn(async () => clone(saved)),
    program: vi.fn(async () => clone(program)), programHistory: vi.fn(async () => [clone(program)]),
    approveProgram: vi.fn(async (id, payload) => { program = {...program, statusAprovacao: 'APROVADO', validoParaExecucao: true, aprovadoPor: 'Revisor do servidor' }; return clone(program) }),
    rejectProgram: vi.fn(async () => { program = {...program, statusAprovacao: 'REJEITADO', validoParaExecucao: false }; return clone(program) }),
    saveProgram: vi.fn(async (id, payload) => { program = {...program, codigoFonte: payload.codigoFonte, versaoPrograma: 2, statusAprovacao: 'PENDENTE_REVISAO', validoParaExecucao: false }; return clone(program) }),
    updateBudget: vi.fn(async (id, payload) => { saved = {...saved, orcamento: payload.orcamento, orcamentoConfirmado: true }; return { campanhaId: id, orcamento: payload.orcamento, orcamentoConfirmado: true } }),
    cut: vi.fn(async () => ({ competencia: '2025-07', totalVendasRecortadas: 1, totalVendasComImpedimento: 0, impedimentosGerais: [] })),
    simulatePython: vi.fn(async () => clone(result)), simulate: vi.fn(),
    accept: vi.fn(),
    sales: vi.fn(async () => ({ simulacaoId: 'sim-1', paginaAtual: 0, totalElementos: 0, totalPaginas: 1, vendas: [] })),
    applyCalibration: vi.fn(async () => { program = {...programFixture(), versaoPrograma: 2, statusAprovacao: 'PENDENTE_REVISAO', validoParaExecucao: false }; saved = {...saved, revisaoControle: 8, ultimaEtapa: 2, etapaMaisAvancada: 2 }; saved.regras[0].taxa = '0.03'; return clone(program) })
  }
  const scope = effectScope()
  const flow = scope.run(() => createCampaignProposalLifecycle({ campaign, api, canReviewProgram: () => true, canSimulate: () => true, ...permissions }))
  return { campaign, api, flow, scope, result }
}
async function prepared(s) { expect(await s.flow.load(42)).toBe(true); expect(await s.flow.selectCompetence('2025-07')).toBe(true) }

describe('FRONT-7 executable program review', () => {
  it('bloqueia aprovação e edição do programa até negócios validar as regras salvas, mas permite devolução com motivo', async () => {
    const s = setup(); await prepared(s)
    s.campaign.propostas[0].metadadosRecebidos.validacaoPendente = true
    s.api.load.mockResolvedValue(savedResponse(s.campaign))
    expect(await s.flow.load(42)).toBe(true)
    expect(await s.flow.reviewProgram('approve', {})).toBe(false)
    expect(s.flow.program.error).toContain('validações atualizadas')
    expect(s.api.approveProgram).not.toHaveBeenCalled()
    expect(await s.flow.reviewProgram('reject', { justificativa: 'Validar regras antes da conferência' })).toBe(true)
    s.scope.stop()
  })

  it('approves the exact displayed checksum without supplying a user identity', async () => {
    const s = setup(); await prepared(s)
    expect(await s.flow.reviewProgram('approve', { justificativa: 'Conferido' })).toBe(true)
    expect(s.api.approveProgram).toHaveBeenCalledWith(42, { checksumEsperado: 'a'.repeat(64), justificativa: 'Conferido' })
    expect(s.flow.program.current.aprovadoPor).toBe('Revisor do servidor'); s.scope.stop()
  })
  it('rejects with a mandatory reason and preserves server identity', async () => {
    const s = setup(); await prepared(s)
    expect(await s.flow.reviewProgram('reject', { justificativa: '' })).toBe(false)
    expect(s.api.rejectProgram).not.toHaveBeenCalled()
    expect(await s.flow.reviewProgram('reject', { justificativa: 'Corrigir faixa' })).toBe(true)
    expect(s.api.rejectProgram).toHaveBeenCalledWith(42, { justificativa: 'Corrigir faixa' })
    expect(s.flow.isCodeApproved.value).toBe(false); s.scope.stop()
  })
  it('blocks approval if a different program arrived after loading the review', async () => {
    const s = setup(); await prepared(s)
    s.api.program.mockResolvedValue(programFixture(42, { checksumSha256: 'b'.repeat(64), versaoPrograma: 2 }))
    expect(await s.flow.reviewProgram('approve', {})).toBe(false)
    expect(s.api.approveProgram).not.toHaveBeenCalled(); expect(s.flow.program.error).toContain('mais recente'); s.scope.stop()
  })
  it('saving code requires a new approval and clears the previous simulation', async () => {
    const s = setup(); await prepared(s); await s.flow.runSimulation()
    expect(await s.flow.reviewProgram('save', { codigoFonte: 'def calcular_comissao(venda):\n    return 2' })).toBe(true)
    expect(s.flow.program.current.statusAprovacao).toBe('PENDENTE_REVISAO'); expect(s.flow.simulation.result).toBeNull(); expect(s.flow.isCodeApproved.value).toBe(false); s.scope.stop()
  })
  it('does not approve or replace code on failure or without technical permissions', async () => {
    const s = setup({ canReviewProgram: () => false }); await prepared(s)
    expect(await s.flow.reviewProgram('save', { codigoFonte: 'x' })).toBe(false); expect(s.api.saveProgram).not.toHaveBeenCalled(); s.scope.stop()
    const t = setup(); await prepared(t); t.api.saveProgram.mockRejectedValue(new Error('Indisponível'))
    expect(await t.flow.reviewProgram('save', { codigoFonte: 'changed' })).toBe(false); expect(t.flow.program.current.codigoFonte).toBe(programFixture().codigoFonte); t.scope.stop()
  })
  it('compares complete text with additions, removals and unchanged context', () => {
    expect(programLineDiff('header\nold\nend', 'header\nnew\nend')).toEqual([{type:'same',text:'header'},{type:'removed',text:'old'},{type:'added',text:'new'},{type:'same',text:'end'}])
  })
})

describe('FRONT-8 approved execution, budget and calibration', () => {
  it('blocks an over-budget acceptance even without the enrollment flag', async () => {
    const s = setup(); await prepared(s)
    s.result.analise.orcamento = '30'
    s.result.cenario100 = {...s.result.cenario100, enquadramento:undefined}
    expect(await s.flow.runSimulation()).toBe(true)
    expect(s.flow.isBudgetWithinLimit.value).toBe(false)
    expect(await s.flow.accept()).toBe(false)
    expect(s.api.accept).not.toHaveBeenCalled()
    expect(s.flow.simulation.error).toContain('Aceite bloqueado')
    s.scope.stop()
  })

  it('confirms the budget against the specific response contract and reloads the campaign', async () => {
    const s = setup(); await prepared(s)
    expect(await s.flow.confirmBudget('85000,50')).toBe(true)
    expect(s.api.updateBudget).toHaveBeenCalledWith(42, { orcamento: '85000.50', justificativa: null, versaoEsperada: 1 })
    expect(s.flow.state.orcamentoConfirmado).toBe(true); expect(s.flow.dirty.value).toBe(false); s.scope.stop()
  })
  it.each(['0','-1','a','1.000,00','1,123'])('rejects invalid budget %s without a request', async amount => {
    const s = setup(); await prepared(s); expect(await s.flow.confirmBudget(amount)).toBe(false); expect(s.api.updateBudget).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('runs only the approved Python and reuses the request identity after timeout', async () => {
    const s = setup(); await prepared(s)
    s.api.simulatePython.mockRejectedValueOnce(new Error('timeout'))
    expect(await s.flow.runSimulation()).toBe(false)
    expect(await s.flow.runSimulation()).toBe(true)
    expect(s.api.simulatePython.mock.calls[0][1].solicitacaoId).toBe(s.api.simulatePython.mock.calls[1][1].solicitacaoId)
    expect(s.api.simulate).not.toHaveBeenCalled(); expect(s.flow.simulation.result.executadoViaPython).toBe(true)
    expect(await s.flow.runSimulation()).toBe(true)
    expect(s.api.simulatePython.mock.calls[2][1].solicitacaoId).not.toBe(s.api.simulatePython.mock.calls[1][1].solicitacaoId); s.scope.stop()
  })
  it('does not accept results produced by a different executor or code version', async () => {
    const s = setup(); await prepared(s); s.api.simulatePython.mockResolvedValue({...s.result, checksumPython: 'b'.repeat(64)})
    expect(await s.flow.runSimulation()).toBe(false); expect(s.flow.simulation.result).toBeNull(); expect(s.api.simulate).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('uses the nested budget result to block scenario 100 above the ceiling', async () => {
    const s = setup(); await prepared(s); s.result.cenario100 = {...s.result.cenario100, enquadramento: { dentroDoOrcamento: false, excedenteOrcamento: '10' }}
    expect(await s.flow.runSimulation()).toBe(true); expect(s.flow.isBudgetWithinLimit.value).toBe(false); s.scope.stop()
  })
  it('applies only a confirmed eligible scenario with revision and signature then requires a new review', async () => {
    const s = setup(); await prepared(s); await s.flow.runSimulation()
    expect(await s.flow.applyCalibration('150%')).toBe(true)
    expect(s.api.applyCalibration).toHaveBeenCalledWith('sim-1', { cenario: '150%', revisaoEsperada: null, assinaturaProgramaEsperada: 'a'.repeat(64) })
    expect(s.campaign.propostas[0].campos.taxaPercentual).toBe('3'); expect(s.flow.state.ultimaEtapa).toBe(2); expect(s.flow.simulation.result).toBeNull(); expect(s.flow.isCodeApproved.value).toBe(false); s.scope.stop()
  })
  it('preserves a valid simulation if alternatives are unavailable or an application fails', async () => {
    const s = setup(); await prepared(s); s.result.analise.statusSugestoes = 'FALHA'; s.result.analise.calibracoes = []
    expect(await s.flow.runSimulation()).toBe(true); expect(await s.flow.applyCalibration('150%')).toBe(false); expect(s.api.applyCalibration).not.toHaveBeenCalled(); expect(s.flow.simulation.result.id).toBe('sim-1'); s.scope.stop()
    const t = setup(); await prepared(t); await t.flow.runSimulation(); t.api.applyCalibration.mockRejectedValue({ response: { status: 409, data: { message: 'Desatualizada' } } })
    expect(await t.flow.applyCalibration('150%')).toBe(false); expect(t.flow.simulation.result.id).toBe('sim-1'); t.scope.stop()
  })
  it('locks a confirmed mutation if its new state cannot be loaded, instead of reusing the old result', async () => {
    const s = setup(); await prepared(s); await s.flow.runSimulation()
    s.api.load.mockResolvedValueOnce(savedResponse(s.campaign)).mockRejectedValueOnce(new Error('Conexão perdida'))
    expect(await s.flow.applyCalibration('150%')).toBe(false)
    expect(s.flow.simulation.result).toBeNull()
    expect(s.flow.state.remoteChanged).toBe(true)
    expect(s.flow.program.current.statusAprovacao).toBe('PENDENTE_REVISAO')
    expect(s.flow.simulation.error).toContain('foi aplicada')
    s.scope.stop()
  })
  it('denies simulation, budget and calibration to consultation-only users', async () => {
    const s = setup({ canSimulate: () => false }); expect(await s.flow.load(42)).toBe(true)
    expect(await s.flow.selectCompetence('2025-07')).toBe(false); expect(s.api.cut).not.toHaveBeenCalled()
    expect(await s.flow.runSimulation()).toBe(false); expect(await s.flow.confirmBudget('50')).toBe(false); expect(await s.flow.applyCalibration('150%')).toBe(false); expect(s.api.simulatePython).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('maps extracted budget without confirming it on behalf of the user', () => {
    const result = normalizeBackendCampaignResponse({ propostas: [], pendenciasGerais: [], orcamentoExtraido: {valor:'50000',trechoOriginal:'teto de 50 mil'} })
    expect(result.campaign).toMatchObject({ orcamento:'50000', orcamentoExtraidoIa:'50000', orcamentoConfirmado:false })
  })
  it('routes all operations through the backend using the expected contracts', async () => {
    const http = { get: vi.fn(async () => ({data:{}})), put: vi.fn(async () => ({data:{}})), post: vi.fn(async () => ({data:{}})) }, api = createCampaignLifecycleApi(http)
    await api.program(42); await api.programHistory(42); await api.saveProgram(42,{codigoFonte:'x'}); await api.approveProgram(42,{checksumEsperado:'sha'}); await api.rejectProgram(42,{justificativa:'x'}); await api.simulatePython(42,{competencia:'2025-07'}); await api.applyCalibration('sim',{cenario:'150%'})
    expect(http.post).toHaveBeenCalledWith('/campanhas/42/simulacao-python',{competencia:'2025-07'},{timeout:300000})
    expect(http.post).toHaveBeenCalledWith('/simulacoes/sim/calibracoes/aplicar',{cenario:'150%'},expect.any(Object))
    expect(http.put).toHaveBeenCalledWith('/campanhas/42/programa-python',{codigoFonte:'x'},expect.any(Object))
  })
})
