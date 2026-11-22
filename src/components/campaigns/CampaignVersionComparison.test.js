import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignVersionComparison from './CampaignVersionComparison.vue'
import { campaignFixture, savedResponse } from '@/services/campaignLifecycleTestFixtures'

describe('CampaignVersionComparison', () => {
  function getFixtures() {
    const campaign = campaignFixture()
    const raw = savedResponse(campaign)
    const published = { ...raw, campanhaId: raw.id, numero: 1 }
    return { campaign, published }
  }

  it('renders changes between published and proposed version when competences match', async () => {
    const { campaign, published } = getFixtures()
    campaign.titulo = 'Campanha Revisada'
    const app = createSSRApp(CampaignVersionComparison, {
      published,
      campaign,
      proposedNumber: 2,
      sourceNumber: 1,
      baseCompetence: '2026-07',
      proposedCompetence: '2026-07'
    })
    const html = await renderToString(app)
    expect(html).toContain('Revisão das alterações')
    expect(html).toContain('Versão vigente 1 → Proposta 2')
    expect(html).not.toContain('Projeção financeira não comparável')
  })

  it('shows non-comparable alert when competences differ', async () => {
    const { campaign, published } = getFixtures()
    const app = createSSRApp(CampaignVersionComparison, {
      published,
      campaign,
      proposedNumber: 2,
      sourceNumber: 1,
      baseCompetence: '2026-06',
      proposedCompetence: '2026-07'
    })
    const html = await renderToString(app)
    expect(html).toContain('Projeção financeira não comparável')
    expect(html).toContain('2026-06 vs 2026-07')
  })

  it('shows non-comparable alert when competence is missing', async () => {
    const { campaign, published } = getFixtures()
    const app = createSSRApp(CampaignVersionComparison, {
      published,
      campaign,
      proposedNumber: 2,
      sourceNumber: 1
    })
    const html = await renderToString(app)
    expect(html).toContain('Projeção financeira não comparável')
    expect(html).toContain('não informada')
  })
})
