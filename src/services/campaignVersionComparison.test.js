import { describe, expect, it } from 'vitest'
import { campaignFixture, savedResponse } from './campaignLifecycleTestFixtures'
import { compareCampaignVersion, versionToCampaign, displayVersionValue } from './campaignVersionComparison'

function fixture() {
  const campaign = campaignFixture(), raw = savedResponse(campaign)
  return { campaign, version: { ...raw, campanhaId: raw.id, numero: 1 } }
}
describe('published version and proposed changes', () => {
  it('preserves zero, inclusive operators, leading zeros and historical artifacts', () => {
    const { version } = fixture()
    version.regras[0].valorMinimo = 0
    version.regras[0].minInclusivo = false
    version.regras[1].pythonEquivalente = 'historical python'
    const result = versionToCampaign(version)
    expect(result.propostas[0].campos.valorMinimo).toBe('0')
    expect(result.propostas[0].campos.minimoInclusivo).toBe(false)
    expect(result.propostas[1].campos.matricula).toBe('001234')
    expect(result.propostas[1].metadadosRecebidos.pythonAtualizado).toBe('historical python')
    expect(displayVersionValue('valorMinimo', 0)).toContain('0,00')
  })
  it('compares title, dates, filters, range operators, rates and rule additions/removals by identity', () => {
    const { campaign, version } = fixture()
    campaign.titulo = 'Nova versão'; campaign.dataFim = '2026-11-30'
    campaign.propostas[0].campos.valorMinimo = '0'
    campaign.propostas[0].campos.minimoInclusivo = true
    campaign.propostas[0].campos.taxaPercentual = '4'
    campaign.propostas[0].campos.codLoja = '16'
    campaign.propostas.pop()
    const diff = compareCampaignVersion(version, campaign)
    expect(diff.fields.map((f) => f.field)).toEqual(['titulo', 'dataFim'])
    expect(diff.rules[0].fields.map((f) => f.field)).toEqual(expect.arrayContaining(['valorMinimo', 'minInclusivo', 'taxa', 'codLoja']))
    expect(diff.rules.some((r) => r.status === 'Removida')).toBe(true)
    campaign.propostas[0].clientId = 'new-identity'
    const replacement = compareCampaignVersion(version, campaign)
    expect(replacement.rules.some((r) => r.status === 'Adicionada')).toBe(true)
    expect(replacement.rules.some((r) => r.id === 'one' && r.status === 'Removida')).toBe(true)
  })
  it('does not invent differences from fraction number formatting', () => {
    const { campaign, version } = fixture()
    version.regras[0].taxa = '0.0350'
    expect(compareCampaignVersion(version, campaign).rules).toEqual([])
  })
})
