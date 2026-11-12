import { describe, it, expect } from 'vitest'
import { findAffectedCampaigns } from './campaignBasesImpactService'

describe('campaignBasesImpactService — Transparência de Bases Globais ([FRONT-4], [BACK-5], [BACK-6])', () => {
  const mockCampaigns = [
    {
      id: 1,
      titulo: 'Campanha de Inverno 2026',
      estado: 'ATIVA',
      dataInicio: '2026-07-01',
      dataFim: '2026-08-15'
    },
    {
      id: 2,
      titulo: 'Campanha de Primavera 2026',
      estado: 'DRAFT',
      simulacaoAceita: true,
      dataInicio: '2026-08-20',
      dataFim: '2026-09-30'
    },
    {
      id: 3,
      titulo: 'Campanha Fim de Ano 2026',
      estado: 'DRAFT',
      dataInicio: '2026-11-01',
      dataFim: '2026-12-31'
    }
  ]

  it('identifica corretamente campanhas sobrepostas à competência 2026-08', () => {
    const analysis = findAffectedCampaigns('2026-08', mockCampaigns)

    expect(analysis.totalAfetadas).toBe(2)
    expect(analysis.todasAfetadas.map((c) => c.id)).toEqual([1, 2])
    expect(analysis.possuiAtivas).toBe(true)
  })

  it('classifica severidade crítica para campanhas ATIVAS e média para rascunhos com simulação aceita', () => {
    const analysis = findAffectedCampaigns('2026-08', mockCampaigns)

    const c1 = analysis.todasAfetadas.find((c) => c.id === 1)
    expect(c1.severidade).toBe('CRITICA')
    expect(c1.riscoLabel).toBe('Impacto Crítico')

    const c2 = analysis.todasAfetadas.find((c) => c.id === 2)
    expect(c2.severidade).toBe('MEDIA')
    expect(c2.riscoLabel).toBe('Re-simulação Necessária')
  })

  it('ignora a campanha atual ao listar outras campanhas afetadas', () => {
    const analysis = findAffectedCampaigns('2026-08', mockCampaigns, 1)

    expect(analysis.totalAfetadas).toBe(2)
    expect(analysis.totalOutrasAfetadas).toBe(1)
    expect(analysis.outrasCampanhas.map((c) => c.id)).toEqual([2])
    expect(analysis.possuiAtivas).toBe(false) // campanha 1 é a atual, campanha 2 é rascunho
  })

  it('retorna zero campanhas quando a competência não intersecta nenhuma vigência', () => {
    const analysis = findAffectedCampaigns('2026-05', mockCampaigns)

    expect(analysis.totalAfetadas).toBe(0)
    expect(analysis.totalOutrasAfetadas).toBe(0)
    expect(analysis.possuiAtivas).toBe(false)
  })
})
