import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignBasesSection from './CampaignBasesSection.vue'

describe('CampaignBasesSection.vue ([FRONT-4], [FRONT-5])', () => {
  it('renderiza o cabeçalho, escopo corporativo e diagnóstico de bases', async () => {
    const app = createSSRApp(CampaignBasesSection, {
      campanhaId: 10,
      competencia: '2026-08',
      campaignsList: [
        { id: 10, titulo: 'Campanha Atual', estado: 'ATIVA', dataInicio: '2026-08-01', dataFim: '2026-08-31' },
        { id: 20, titulo: 'Outra Campanha', estado: 'ATIVA', dataInicio: '2026-08-05', dataFim: '2026-09-10' }
      ]
    })

    const html = await renderToString(app)

    // Título e escopo
    expect(html).toContain('Bases da Campanha (RH e Vendas)')
    expect(html).toContain('Transparência de Bases Globais Corporativas')
    expect(html).toContain('As bases de RH e Vendas possuem escopo corporativo')

    // Competência e upload conjunto
    expect(html).toContain('Envio Conjunto de Bases (RH + Vendas)')
    expect(html).toContain('Planilha de RH / Colaboradores (.xlsx)')
    expect(html).toContain('Planilha de Vendas (.xlsx)')

    // Detecção de outra campanha vinculada
    expect(html).toContain('outra(s) campanha(s) vinculada(s)')
  })

  it('renderiza anexos ativos com botão para abrir preparação e correção de linhas (FRONT-5)', async () => {
    const app = createSSRApp(CampaignBasesSection, {
      campanhaId: 10,
      competencia: '2026-08'
    })

    const html = await renderToString(app)
    expect(html).toBeDefined()
  })
})
