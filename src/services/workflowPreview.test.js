import { describe, expect, it } from 'vitest'
import { newWorkflowPreview, editPreview, transitionPreview, simulatePreview, restoreWorkflowPreview, persistWorkflowPreview } from './workflowPreview'
const advance = (state, role = 'ADMINISTRADOR') => transitionPreview(state, { action: 'advance', role, name: 'Pessoa de exemplo' })
describe('isolated workflow preview', () => {
  it('passes through the four owners without publishing a real campaign', () => {
    let state = newWorkflowPreview()
    state = advance(state, 'ANALISTA_NEGOCIOS'); expect(state.step).toBe(2)
    expect(() => advance(state, 'ANALISTA_NEGOCIOS')).toThrow('perfil')
    state = advance(state, 'ANALISTA_CODIGO'); expect(state.step).toBe(3)
    expect(() => advance(state, 'ANALISTA_NEGOCIOS')).toThrow('simulação')
    state = simulatePreview(state, 'ANALISTA_NEGOCIOS')
    state = advance(state, 'ANALISTA_NEGOCIOS'); expect(state.step).toBe(4)
    state = advance(state, 'GERENTE_VENDAS'); expect(state.status).toBe('PUBLISHED')
    expect(state.history).toHaveLength(4)
    expect(() => advance(state)).toThrow('perfil')
  })
  it('requires a reason for returns and preserves it for the next owner', () => {
    let state = advance(newWorkflowPreview())
    expect(() => transitionPreview(state, { action: 'return', role: 'ANALISTA_CODIGO', reason: '' })).toThrow('motivo')
    state = transitionPreview(state, { action: 'return', role: 'ANALISTA_CODIGO', name: 'Código', reason: 'Esclarecer a taxa' })
    expect(state).toMatchObject({ step: 1, status: 'RETURNED', reason: 'Esclarecer a taxa', reached: 2 })
    expect(state.history.at(-1).reason).toBe('Esclarecer a taxa')
    expect(state.codeApprovedRevision).toBeNull()
  })
  it('invalidates artifacts when the proposal changes after a return', () => {
    let state = advance(newWorkflowPreview())
    state = transitionPreview(state, { action: 'return', role: 'ANALISTA_CODIGO', reason: 'Corrigir público' })
    const revision = state.revision
    state = editPreview(state, 'description', 'Novo texto', 'ANALISTA_NEGOCIOS')
    expect(state.revision).toBe(revision + 1)
    expect(state.simulationRevision).toBeNull()
    expect(state.codeApprovedRevision).toBeNull()
  })
  it('requires a new simulation after a manager return or budget change', () => {
    let state = advance(advance(newWorkflowPreview()))
    state = advance(simulatePreview(state, 'ANALISTA_NEGOCIOS'))
    state = transitionPreview(state, { action: 'return', role: 'GERENTE_VENDAS', reason: 'Reduzir orçamento' })
    expect(state.step).toBe(3); expect(state.simulationRevision).toBeNull()
    expect(() => advance(state)).toThrow('simulação')
    state = simulatePreview(state, 'ANALISTA_NEGOCIOS')
    state = editPreview(state, 'budget', '4000', 'ANALISTA_NEGOCIOS')
    expect(state.simulationRevision).toBeNull()
    expect(state.codeApprovedRevision).toBe(state.revision)
  })
  it('denies auditor mutations and rate edits outside code review', () => {
    expect(() => advance(newWorkflowPreview(), 'AUDITOR')).toThrow('perfil')
    expect(() => editPreview(newWorkflowPreview(), 'rate', '8', 'ANALISTA_NEGOCIOS')).toThrow('campo')
    expect(() => simulatePreview(newWorkflowPreview(), 'AUDITOR')).toThrow('responsável')
  })
  it('restores the pending stage rather than a previously visited stage', () => {
    const values = new Map()
    const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }
    const state = advance(advance(newWorkflowPreview()))
    persistWorkflowPreview(storage, state)
    expect(restoreWorkflowPreview(storage)).toMatchObject({ step: 3, reached: 3, status: 'WAITING_SIMULATION' })
    expect(restoreWorkflowPreview({ getItem: () => '{broken' })).toEqual(newWorkflowPreview())
  })
})
