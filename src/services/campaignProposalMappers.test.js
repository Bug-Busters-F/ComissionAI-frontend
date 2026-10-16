import { describe, expect, it } from 'vitest'
import { campaignProposalToCanonical, normalizeCampaignProposalResponse } from './campaignProposalMappers'
import { validateCampaignProposalSet } from './campaignProposalValidation'

describe('campaign proposal mappers', () => {
  it('preserves every entry, including a malformed proposal, with a blocking pending', () => {
    const result = normalizeCampaignProposalResponse({
      campanha: { titulo: 'Teste', descricao: 'Linha 1\nLinha 2', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [
        { clientId: 'one', filtros: { codCargo: 100 }, taxa: '0.05', condicaoValor: {} },
        null,
        { clientId: 'three', filtros: { matricula: '001234' }, taxa: '0.07', condicaoValor: {} }
      ]
    })
    expect(result.campaign.propostas).toHaveLength(3)
    expect(result.campaign.propostas[1].pendenciasRemotas[0].severidade).toBe('IMPEDITIVO')
    expect(result.campaign.propostas[2].campos.matricula).toBe('001234')
    expect(result.campaign.textoOriginal).toBe('Linha 1\nLinha 2')
  })

  it('converts rates once and keeps inclusive boundaries in the full canonical collection', () => {
    const { campaign } = normalizeCampaignProposalResponse({
      campanha: { titulo: 'Campanha', descricao: 'Texto original', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [
        { clientId: 'left', filtros: { codMarca: 10, codCargo: 100 }, taxa: '0.035', condicaoValor: { maximo: '1000.00', maximoInclusivo: false } },
        { clientId: 'right', filtros: { codMarca: 10, codCargo: 100 }, taxa: '0.05', condicaoValor: { minimo: '1000.00', minimoInclusivo: true } }
      ]
    })
    const canonical = campaignProposalToCanonical(campaign)
    expect(canonical.propostas).toHaveLength(2)
    expect(canonical.propostas[0].taxa).toBe('0.035')
    expect(canonical.propostas[0].condicaoValor.maximoInclusivo).toBe(false)
    expect(canonical.propostas[1].condicaoValor.minimoInclusivo).toBe(true)
    expect(canonical.campanha.descricao).toBe('Texto original')
    campaign.propostas[0].campos.codLoja = ' '
    campaign.propostas[0].campos.canal = ' '
    expect(campaignProposalToCanonical(campaign).propostas[0].filtros.codLoja).toBeNull()
    expect(campaignProposalToCanonical(campaign).propostas[0].filtros.canal).toBeNull()
  })

  it('keeps duplicate local IDs separate and blocks a proposal with a different received validity', () => {
    const { campaign } = normalizeCampaignProposalResponse({
      campanha: { titulo: 'Campanha', descricao: 'Texto', dataInicio: '2026-10-01', dataFim: '2026-10-20' },
      propostas: [
        { clientId: 'same', filtros: { codCargo: 100 }, taxa: '0.05', condicaoValor: {} },
        { clientId: 'same', filtros: { codLoja: 75 }, taxa: '0.04', condicaoValor: {}, vigencia: { dataInicio: '2026-10-02', dataFim: '2026-10-20' } }
      ]
    })
    expect(campaign.propostas).toHaveLength(2)
    expect(campaign.propostas[0].clientId).not.toBe(campaign.propostas[1].clientId)
    expect(campaign.propostas[1].metadadosRecebidos.vigenciaRecebida.dataInicio).toBe('2026-10-02')
    expect(validateCampaignProposalSet(campaign).blockers.some((item) => item.codigo === 'VIGENCIA_DIVERGENTE')).toBe(true)
  })

  it('rejects an unrecognized response envelope instead of replacing the current collection', () => {
    expect(() => normalizeCampaignProposalResponse({ campanha: {}, items: [] })).toThrow(/lista de regras/)
  })
})
