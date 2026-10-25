import { describe, expect, it } from 'vitest'
import { createCampaignProposalProvider, CampaignProposalIntegrationUnavailableError } from './campaignProposalService'

describe('campaign proposal provider', () => {
  it('does not offer remote actions in manual mode', () => {
    const provider = createCampaignProposalProvider({ mode: 'manual' })
    expect(provider.capabilities).toMatchObject({ interpret: false, validate: false, persist: false, simulate: false, examples: false })
    expect(() => provider.saveDraft({})).toThrow(CampaignProposalIntegrationUnavailableError)
  })

  it('loads fixtures only in explicitly selected demo mode', () => {
    const demo = createCampaignProposalProvider({ mode: 'demo' })
    expect(demo.capabilities.examples).toBe(true)
    expect(demo.loadExample('incomplete').propostas).toHaveLength(2)
    expect(() => demo.interpretCampaign({})).toThrow(CampaignProposalIntegrationUnavailableError)
    expect(() => createCampaignProposalProvider({ mode: 'manual' }).loadExample('incomplete')).toThrow()
  })

  it('exposes only methods configured by a confirmed API client', () => {
    const provider = createCampaignProposalProvider({
      mode: 'api',
      client: { interpretCampaign: async () => ({ propostas: [] }) }
    })
    expect(provider.capabilities.interpret).toBe(true)
    expect(provider.capabilities.persist).toBe(false)
    expect(provider.capabilities.simulate).toBe(false)
  })
})
