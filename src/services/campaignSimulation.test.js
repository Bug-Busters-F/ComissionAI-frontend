import { describe, expect, it } from 'vitest'
import { CAMPAIGN_SIMULATION_ID, getCampaignSimulationFixture, simulationUsage } from './campaignSimulation'

describe('campaignSimulation', () => {
  it('uses a fixed, explicitly demonstrative fixture', () => {
    const fixture = getCampaignSimulationFixture()
    expect(CAMPAIGN_SIMULATION_ID).toBe('DEMO-SIM-001')
    expect(fixture.scenarios).toHaveLength(3)
    expect(fixture.scenarios[1].withProposal).toBe(7300)
    expect(simulationUsage(fixture.scenarios[2])).toBeGreaterThan(100)
  })

  it('supports the visual suggestion without changing the base fixture', () => {
    expect(getCampaignSimulationFixture('adjusted').scenarios[1].withProposal).toBeLessThan(getCampaignSimulationFixture('base').scenarios[1].withProposal)
  })
})
