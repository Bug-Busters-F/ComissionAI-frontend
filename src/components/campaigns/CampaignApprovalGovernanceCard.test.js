import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignApprovalGovernanceCard from './CampaignApprovalGovernanceCard.vue'

describe('CampaignApprovalGovernanceCard', () => {
  it('renders pending status by default', async () => {
    const app = createSSRApp(CampaignApprovalGovernanceCard, {
      approval: null,
      canApprove: false
    })
    const html = await renderToString(app)
    expect(html).toContain('Governança de Código Python')
    expect(html).toContain('Aprovação Pendente')
    expect(html).toContain('Aprovação de responsabilidade exclusiva do Analista de Código')
    expect(html).not.toContain('Aprovar Código Python')
  })

  it('renders approved status and metadata when approved', async () => {
    const app = createSSRApp(CampaignApprovalGovernanceCard, {
      approval: {
        versaoNumero: 2,
        statusAprovacaoCodigo: 'APROVADO',
        codigoAprovadoPor: 'analista.codigo@empresa.com',
        codigoAprovadoEm: '2026-11-14T10:00:00Z',
        regras: [{ regraId: 1, nome: 'Regra Ecommerce', statusAprovacaoCodigo: 'APROVADO' }]
      },
      canApprove: true
    })
    const html = await renderToString(app)
    expect(html).toContain('Código Aprovado')
    expect(html).toContain('analista.codigo@empresa.com')
    expect(html).toContain('Regra Ecommerce')
  })

  it('alerts when code artifacts are invalidated after approval', async () => {
    const app = createSSRApp(CampaignApprovalGovernanceCard, {
      approval: {
        versaoNumero: 2,
        statusAprovacaoCodigo: 'INVALIDADO',
        codigoAprovadoPor: 'analista.codigo@empresa.com',
        codigoAprovadoEm: '2026-11-14T10:00:00Z',
        regras: [{ regraId: 1, nome: 'Regra Ecommerce', statusAprovacaoCodigo: 'INVALIDADO' }]
      },
      canApprove: true
    })
    const html = await renderToString(app)
    expect(html).toContain('Artefatos alterados após aprovação técnica!')
    expect(html).toContain('Artefatos Invalidados')
  })

  it('renders action buttons when authorized to approve', async () => {
    const app = createSSRApp(CampaignApprovalGovernanceCard, {
      approval: {
        versaoNumero: 1,
        statusAprovacaoCodigo: 'PENDENTE',
        regras: []
      },
      canApprove: true
    })
    const html = await renderToString(app)
    expect(html).toContain('Rejeitar Código')
    expect(html).toContain('Aprovar Código Python')
  })
})
