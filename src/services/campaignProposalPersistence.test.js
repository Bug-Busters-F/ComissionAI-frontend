import { campaignFixture, savedResponse } from './campaignLifecycleTestFixtures'
import { describe, expect, it } from 'vitest'
import { createCampaignProposal, createCampaignProposalForm, createPending } from './campaignProposalModel'
import { campaignToDraftRequest, persistedCampaignToProposal, validateDraftForPersistence, draftFingerprint } from './campaignProposalPersistence'

describe('persisting the real multi-rule contract', () => {
  it('flattens all rules and retains decimal precision, boundaries, zero and registration', () => {
    const c = campaignFixture(); c.propostas[0].campos.valorMinimo = '0'; c.propostas[0].campos.minimoInclusivo = true
    const request = campaignToDraftRequest(c)
    expect(request.regras).toHaveLength(3); expect(request.estado).toBe('DRAFT')
    expect(request.regras[0]).toMatchObject({ taxa: '0.035', valorMinimo: '0.00', minInclusivo: true, valorMaximo: '1000.00', maxInclusivo: false, completa: true })
    expect(request.regras[1]).toMatchObject({ matricula: '001234', tipoOperacao: 'DEFINIR_TAXA', valorAjuste: '0.05', bonusValorFixo: '50.00' })
    expect(request.regras[2]).toMatchObject({ taxa: null, completa: false })
    expect(request).not.toHaveProperty('regra'); expect(request.regras[0]).not.toHaveProperty('filtros')
  })
  it('allows business-incomplete drafts but rejects malformed numbers and inverted ranges', () => {
    const c = campaignFixture(); expect(validateDraftForPersistence(c)).toEqual([])
    c.propostas[0].campos.taxaPercentual = 'abc'; expect(validateDraftForPersistence(c).join()).toContain('taxaPercentual')
    c.propostas[0].campos.valorMinimo = '2000'; expect(validateDraftForPersistence(c).join()).toContain('mínimo')
  })
  it('hydrates every persisted rule, keeps database ids separate and preserves metadata in-session', () => {
    const c = campaignFixture(), raw = savedResponse(c)
    const hydrated = persistedCampaignToProposal(raw, c)
    expect(hydrated.propostas.map((p) => p.serverId)).toEqual([101, 102, 103])
    expect(hydrated.propostas.map((p) => p.clientId)).toEqual(['one', 'two', 'three'])
    expect(hydrated.propostas[1].campos.matricula).toBe('001234'); expect(hydrated.propostas[1].camposManuais).toEqual(['taxaPercentual'])
    expect(hydrated.propostas[2].pendenciasRemotas[0].codigo).toBe('SEMANTICA')
    expect(persistedCampaignToProposal(raw).propostas).toHaveLength(3)
  })
  it('does not fabricate audience confirmation or origins on reload', () => {
    const c = campaignFixture(); c.propostas[0].campos.canal = ''; c.propostas[0].campos.publicoTodasVendas = true
    const raw = savedResponse(c); raw.regras.forEach((r) => { delete r.rastreabilidade })
    const hydrated = persistedCampaignToProposal(raw)
    expect(hydrated.propostas[0].campos.publicoTodasVendas).toBe(false)
    expect(hydrated.propostas[0].metadadosRecebidos.origensPorCampo).toEqual({})
  })
  it('preserves general pending messages through the available per-rule string field', () => {
    const c = campaignFixture(); c.pendenciasCampanha = [createPending({ codigo: 'DESCONHECIDA', mensagem: 'Mensagem; com ponto e vírgula.', severidade: 'AVISO' })]
    const next = persistedCampaignToProposal(savedResponse(c))
    expect(next.pendenciasCampanha).toHaveLength(1); expect(next.pendenciasCampanha[0]).toMatchObject({ severidade: 'AVISO', mensagem: 'Mensagem; com ponto e vírgula.' })
    expect(next.propostas[2].pendenciasRemotas[0].severidade).toBe('IMPEDITIVO')
  })
  it('never persists a demo or stale Python or explanation', () => {
    const c = campaignFixture(), m = c.propostas[0].metadadosRecebidos
    m.contratoBackend = { pythonEquivalente: 'old or demo' }
    expect(campaignToDraftRequest(c).regras[0].pythonEquivalente).toBeNull()
    m.pythonAtualizado = 'real updated'; expect(campaignToDraftRequest(c).regras[0].pythonEquivalente).toBe('real updated')
    c.propostas[0].artefatosDesatualizados = true
    expect(campaignToDraftRequest(c).regras[0]).toMatchObject({ explicacao: null, pythonEquivalente: null, completa: false })
  })
  it('does not silently consolidate divergent rule periods', () => {
    const c = campaignFixture(); c.propostas[0].metadadosRecebidos.vigenciaRecebida = { dataInicio: '2026-10-01', dataFim: '2026-10-31' }; c.propostas[1].metadadosRecebidos.vigenciaRecebida = { dataInicio: '2026-11-01', dataFim: '2026-11-30' }
    c.pendenciasCampanha = [createPending({ codigo: 'VIGENCIA_NAO_CONSOLIDADA', mensagem: 'Divergente' })]
    expect(validateDraftForPersistence(c).join()).toContain('divergentes')
  })
  it('rejects missing confirmed dates and repeated database identities', () => {
    const raw = savedResponse(campaignFixture())
    expect(() => persistedCampaignToProposal({ ...raw, dataFim: null })).toThrow('vigência')
    raw.regras[1].id = raw.regras[0].id
    expect(() => persistedCampaignToProposal(raw)).toThrow('identificador')
  })
  it('gives distinct presentation identities to older duplicate blocoIds without losing rules', () => {
    const raw = savedResponse(campaignFixture()); raw.regras[1].blocoId = raw.regras[0].blocoId
    const mapped = persistedCampaignToProposal(raw)
    expect(mapped.propostas).toHaveLength(3); expect(new Set(mapped.propostas.map((p) => p.clientId)).size).toBe(3)
  })
  it('tracks user fields, source, rule removal and audience confirmation in the save baseline', () => {
    const c = campaignFixture(), before = draftFingerprint(c)
    c.propostas[0].textoOrigem += ' editado'; expect(draftFingerprint(c)).not.toBe(before)
    const withSource = draftFingerprint(c); c.propostas.pop(); expect(draftFingerprint(c)).not.toBe(withSource)
  })
})
