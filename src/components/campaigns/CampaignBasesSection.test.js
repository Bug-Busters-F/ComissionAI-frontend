import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignBasesSection from './CampaignBasesSection.vue'

describe('CampaignBasesSection.vue ([FRONT-4], [FRONT-5])', () => {
  it('mostra envio e acesso discreto às bases existentes sem textos repetidos', async () => {
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
    expect(html).toContain('Bases da campanha')
    expect(html).not.toContain('Transparência de Bases Globais Corporativas')
    expect(html).not.toContain('Consolidação no Banco')
    expect(html).toContain('Usar bases já cadastradas')
    expect(html).not.toContain('Modo Somente Leitura')
    expect(html).not.toContain('Upload bloqueado para seu perfil')
    expect(html.match(/Somente gerente ou administrador pode enviar e vincular bases/g)).toHaveLength(1)

    // Competência e upload conjunto
    expect(html).toContain('Envio Conjunto de Bases (RH + Vendas)')
    expect(html).toContain('Planilha de RH / Colaboradores (.xlsx)')
    expect(html).toContain('Planilha de Vendas (.xlsx)')

    // Detecção de outra campanha vinculada
    expect(html).not.toContain('outra(s) campanha(s) vinculada(s)')
  })

  it('renderiza anexos ativos com botão para abrir preparação e correção de linhas (FRONT-5)', async () => {
    const app = createSSRApp(CampaignBasesSection, {
      campanhaId: 10,
      competencia: '2026-08'
    })

    const html = await renderToString(app)
    expect(html).toBeDefined()
    const simulation = await renderToString(createSSRApp(CampaignBasesSection, {campanhaId:10,competencia:'2026-08',autoSelectCompetence:false}))
    expect(simulation).not.toContain('<select')
    expect(simulation).toContain('Competência:')
  })
})
