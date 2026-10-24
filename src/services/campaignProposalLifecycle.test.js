import { describe, expect, it, vi } from 'vitest'
import { effectScope, reactive } from 'vue'
import { campaignFixture, savedResponse } from './campaignLifecycleTestFixtures'
import { createCampaignProposalLifecycle } from './campaignProposalLifecycle'

function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }
const scenario = { totalVendas: '1000', totalComissaoBase: '20', totalComissaoProposta: '40', deltaComissao: '20', deltaPercentual: '100', comissaoProjetada: '40', deltaProjetado: '20', qtdVendasComMudancaFaixa: 0 }
function simulationRaw(id = 'sim-id') { return { id, protocolo: 'protocol', campanhaId: 42, competencia: '2026-09', totalVendasRecortadas: 1, fatorProjecao: '1', diasInclusivos: 30, cenario100: scenario, cenario80: scenario, cenario120: scenario, cenario150: scenario, vendas: [], avisosGerais: [] } }
function setup(overrides = {}) {
  const campaign = reactive(campaignFixture()); const scope = effectScope()
  campaign.propostas[2].campos.taxaPercentual = '4'; campaign.propostas[2].pendenciasRemotas = []; campaign.propostas[2].metadadosRecebidos.validacaoPendente = false
  const api = { load: vi.fn(async () => savedResponse(campaign)), save: vi.fn(async () => savedResponse(campaign)), competences: vi.fn(async () => [{ competencia: '2026-09', totalVendas: 1 }]), cut: vi.fn(async () => ({ competencia: '2026-09', totalVendasRecortadas: 1, totalVendasComImpedimento: 0, impedimentosGerais: [], possuiAmbiguidadeCritica: false })), simulate: vi.fn(async () => simulationRaw()), sales: vi.fn(async (id, page) => ({ simulacaoId: id, paginaAtual: page - 1, totalElementos: 1, totalPaginas: 1, vendas: [] })), accept: vi.fn(async () => ({ simulacaoId: 'sim-id', campanhaId: 42, statusAceite: 'ACEITA', aceitoPor: 'Pessoa teste' })), readiness: vi.fn(async () => ({ aptaParaAtivacao: true, simulacaoId: 'sim-id', aceitoPor: 'Pessoa teste' })), activate: vi.fn(async () => ({ ...savedResponse(campaign), estado: 'ATIVA' })), simulation: vi.fn(async () => simulationRaw()), ...overrides }
  const flow = scope.run(() => createCampaignProposalLifecycle({ campaign, api }))
  return { campaign, api, flow, scope }
}
async function ready(s) { expect(await s.flow.save()).toBe(true); await s.flow.selectCompetence('2026-09'); expect(await s.flow.runSimulation()).toBe(true); s.flow.simulation.aceitoPor = 'Pessoa teste'; expect(await s.flow.accept()).toBe(true) }

describe('draft, persisted simulation, formal acceptance and activation lifecycle', () => {
  it('creates once, skips unchanged PUT and preserves all rules after reloading', async () => {
    const s = setup(); expect(s.flow.dirty.value).toBe(true)
    expect(await s.flow.save()).toBe(true); expect(s.flow.dirty.value).toBe(false)
    expect(await s.flow.save()).toBe(true); expect(s.api.save).toHaveBeenCalledOnce()
    expect(await s.flow.load(42)).toBe(true); expect(s.campaign.propostas).toHaveLength(3); expect(s.campaign.propostas[1].campos.matricula).toBe('001234')
    s.scope.stop()
  })
  it('warns before backend date defaults and displays the period actually returned', async () => {
    const s = setup(); s.campaign.dataInicio = ''; s.campaign.dataFim = ''
    expect(await s.flow.save()).toBe(false); expect(s.flow.state.defaultsOpen).toBe(true); expect(s.api.save).not.toHaveBeenCalled()
    expect(await s.flow.save({ confirmDefaults: true })).toBe(true)
    expect(s.api.save.mock.calls[0][1]).toMatchObject({ dataInicio: null, dataFim: null })
    expect(s.campaign).toMatchObject({ dataInicio: '2026-10-22', dataFim: '2026-11-21' })
    expect(s.campaign.propostas.every((p) => p.artefatosDesatualizados)).toBe(true)
    s.scope.stop()
  })
  it('requires new date confirmation after a change in its original snapshot', async () => {
    const s = setup(); s.campaign.dataFim = ''; await s.flow.save(); s.campaign.titulo += ' nova'
    expect(await s.flow.save({ confirmDefaults: true })).toBe(false); expect(s.api.save).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('preserves fields on save rejection and protects against duplicate creation after lost response', async () => {
    const s = setup({ save: vi.fn().mockRejectedValueOnce({ response: { status: 422, data: { message: 'Rejeitado' } } }).mockRejectedValueOnce(new Error('timeout')) })
    const before = JSON.stringify(s.campaign)
    expect(await s.flow.save()).toBe(false); expect(s.flow.state.error).toBe('Rejeitado'); expect(JSON.stringify(s.campaign)).toBe(before)
    expect(await s.flow.save()).toBe(false); expect(s.flow.state.uncertainCreate).toBe(true)
    expect(await s.flow.save()).toBe(false); expect(s.api.save).toHaveBeenCalledTimes(2); expect(JSON.stringify(s.campaign)).toBe(before); s.scope.stop()
  })
  it('does not overwrite newer form edits with an older save response', async () => {
    const d = deferred(), s = setup({ save: vi.fn(() => d.promise) }); const raw = savedResponse(s.campaign)
    const promise = s.flow.save(); s.campaign.titulo = 'Alterado durante solicitação'; d.resolve(raw)
    expect(await promise).toBe(true); expect(s.campaign.titulo).toBe('Alterado durante solicitação'); expect(s.flow.dirty.value).toBe(true); s.scope.stop()
  })
  it('uses the saved campaign id and real protocol and never saves between acceptance and activation', async () => {
    const s = setup(); await ready(s)
    expect(s.api.simulate).toHaveBeenCalledWith(42, '2026-09')
    expect(s.api.accept).toHaveBeenCalledWith('sim-id', { campanhaId: 42, aceitoPor: 'Pessoa teste', motivo: null })
    expect(s.flow.simulation.result.protocolo).toBe('protocol'); expect(s.flow.canReview.value).toBe(true)
    expect(await s.flow.activate()).toBe(true); expect(s.api.activate).toHaveBeenCalledWith(42)
    expect(s.api.save).toHaveBeenCalledOnce(); expect(s.flow.state.estado).toBe('ATIVA'); s.scope.stop()
  })
  it('blocks acceptance and activation when an API operation fails, without fallback results', async () => {
    const s = setup({ simulate: vi.fn(async () => { throw new Error('Backend indisponível') }) }); await s.flow.save(); await s.flow.selectCompetence('2026-09')
    expect(await s.flow.runSimulation()).toBe(false); expect(s.flow.simulation.result).toBeNull(); expect(s.flow.simulation.status).toBe('FALHOU')
    expect(await s.flow.accept()).toBe(false); expect(await s.flow.activate()).toBe(false); expect(s.api.accept).not.toHaveBeenCalled(); expect(s.api.activate).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('does not accept a simulation belonging to another campaign or a malformed response', async () => {
    const s = setup({ simulate: vi.fn(async () => ({ ...simulationRaw(), campanhaId: 77 })) }); await s.flow.save(); await s.flow.selectCompetence('2026-09')
    expect(await s.flow.runSimulation()).toBe(false); expect(s.flow.simulation.result).toBeNull(); s.scope.stop()
  })
  it('rejects a late simulation after the form changes', async () => {
    const d = deferred(), s = setup({ simulate: vi.fn(() => d.promise) }); await s.flow.save(); await s.flow.selectCompetence('2026-09')
    const running = s.flow.runSimulation(); await Promise.resolve(); await Promise.resolve(); s.campaign.propostas[0].campos.taxaPercentual = '6'; d.resolve(simulationRaw())
    expect(await running).toBe(false); expect(s.flow.simulation.result).toBeNull(); s.scope.stop()
  })
  it('invalidates acceptance immediately when any rule changes, is removed or reordered', async () => {
    const s = setup(); await ready(s); s.campaign.propostas.reverse()
    expect(s.flow.simulation.accepted).toBe(false); expect(s.flow.canReview.value).toBe(false); expect(await s.flow.activate()).toBe(false); s.scope.stop()
  })
  it('invalidates local acceptance when reference competence changes', async () => {
    const s = setup(); await ready(s); await s.flow.selectCompetence('2026-08')
    expect(s.flow.simulation.accepted).toBe(false); expect(s.flow.canActivate.value).toBeFalsy(); s.scope.stop()
  })
  it('requires explicit responsible identity and backend confirmation of the acceptance', async () => {
    const s = setup({ accept: vi.fn(async () => ({ statusAceite: 'INVALIDADA', simulacaoId: 'sim-id', campanhaId: 42 })) }); await s.flow.save(); await s.flow.selectCompetence('2026-09'); await s.flow.runSimulation()
    expect(await s.flow.accept()).toBe(false); expect(s.api.accept).not.toHaveBeenCalled()
    s.flow.simulation.aceitoPor = 'Responsável'; expect(await s.flow.accept()).toBe(false); expect(s.flow.simulation.accepted).toBe(false); s.scope.stop()
  })
  it('preserves an accepted result after activation rejection while displaying the backend reason', async () => {
    const s = setup({ activate: vi.fn(async () => { throw { response: { status: 409, data: { message: 'Proposta desatualizada' } } } }) }); await ready(s)
    expect(await s.flow.activate()).toBe(false); expect(s.flow.state.estado).toBe('DRAFT'); expect(s.flow.state.error).toBe('Proposta desatualizada'); expect(s.flow.simulation.result.id).toBe('sim-id'); s.scope.stop()
  })
  it('loads accepted simulation and rechecks its readiness on draft reopening', async () => {
    const s = setup(); s.api.load.mockResolvedValue({ ...savedResponse(s.campaign), simulacaoAceitaId: 'sim-id', statusAceite: 'ACEITA' })
    expect(await s.flow.load(42)).toBe(true); expect(s.flow.simulation.accepted).toBe(true); expect(s.flow.canActivate.value).toBeTruthy(); expect(s.api.accept).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('cannot downgrade an active campaign through draft saving or simulation', async () => {
    const s = setup(); s.api.load.mockResolvedValue({ ...savedResponse(s.campaign), estado: 'ATIVA' })
    await s.flow.load(42); s.campaign.titulo = 'Mudança'; expect(await s.flow.save()).toBe(false); expect(await s.flow.runSimulation()).toBe(false); expect(s.api.save).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('retains the previous sales page and aggregates when another page fails', async () => {
    const s = setup(); await ready(s); s.api.sales.mockRejectedValue(new Error('Página indisponível'))
    expect(await s.flow.changePage(2)).toBe(false); expect(s.flow.simulation.page).toBe(1); expect(s.flow.simulation.result.totals.historico.comissaoProposta).toBe('40'); expect(s.flow.simulation.pageError).toContain('Página'); s.scope.stop()
  })
})

describe('concurrency and validation guards', () => {
  it('refuses PUT after another session changes the persisted rules and preserves local edits', async () => {
    const s = setup(); await s.flow.save(); const concurrent = savedResponse(s.campaign); concurrent.regras[0].taxa = '0.09'
    s.campaign.titulo = 'Título local'; s.api.load.mockResolvedValue(concurrent)
    expect(await s.flow.save()).toBe(false); expect(s.flow.state.remoteChanged).toBe(true); expect(s.campaign.titulo).toBe('Título local'); expect(s.api.save).toHaveBeenCalledOnce(); s.scope.stop()
  })
  it('does not simulate a campaign changed remotely after its recorte', async () => {
    const s = setup(); await s.flow.save(); await s.flow.selectCompetence('2026-09'); const concurrent = savedResponse(s.campaign); concurrent.titulo += ' outra sessão'; s.api.load.mockResolvedValue(concurrent)
    expect(await s.flow.runSimulation()).toBe(false); expect(s.api.simulate).not.toHaveBeenCalled(); expect(s.flow.simulation.accepted).toBe(false); s.scope.stop()
  })
  it('invalidates previously accepted readiness when reference checking finds impediments', async () => {
    const s = setup(); await ready(s); s.api.cut.mockResolvedValue({ competencia: '2026-09', totalVendasRecortadas: 1, totalVendasComImpedimento: 1, possuiAmbiguidadeCritica: false, impedimentosGerais: [] })
    await s.flow.selectCompetence('2026-09', { preserveAccepted: true }); expect(s.flow.simulation.accepted).toBe(false); expect(s.flow.canActivate.value).toBeFalsy(); s.scope.stop()
  })
  it('does not run simulation for an incomplete saved draft even when called directly', async () => {
    const s = setup(); s.campaign.propostas[0].campos.taxaPercentual = ''; await s.flow.save(); await s.flow.selectCompetence('2026-09')
    expect(await s.flow.runSimulation()).toBe(false); expect(s.api.simulate).not.toHaveBeenCalled(); s.scope.stop()
  })
  it('preserves defaults after reload without persisting an already-resolved missing-period blocker', async () => {
    const s = setup(); s.campaign.dataInicio = ''; s.campaign.dataFim = ''; s.campaign.pendenciasCampanha = [{ codigo: 'VIGENCIA_NAO_CONSOLIDADA', severidade: 'IMPEDITIVO', mensagem: 'Vigência ausente' }]
    await s.flow.save(); await s.flow.save({ confirmDefaults: true })
    expect(s.api.save.mock.calls[0][1].regras.every((r) => !r.pendencias.some((p) => p.includes('Vigência ausente')))).toBe(true)
    expect(s.campaign.pendenciasCampanha).toEqual([]); s.scope.stop()
  })
})


it('adapta impedimentos de cobertura para o bloqueio da tela da dev, preservando a validação do backend', async () => {
  const s = setup({ cut: vi.fn(async () => ({ competencia: '2026-09', totalVendasRecortadas: 1, totalVendasComImpedimento: 1, possuiAmbiguidadeCritica: false, impedimentosGerais: ['Taxa de comissão não encontrada (Marca: PRETO, Cargo: VENDEDOR).'] })) })
  await s.flow.save()
  expect(await s.flow.selectCompetence('2026-09')).toBe(false)
  expect(s.flow.simulation.referenceValidation.canExecute).toBe(false)
  expect(s.flow.simulation.referenceValidation.missingBases[0]).toMatchObject({ marca: 'PRETO', cargo: 'VENDEDOR' })
  expect(s.api.simulate).not.toHaveBeenCalled()
  s.scope.stop()
})
