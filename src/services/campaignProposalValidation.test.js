import { describe, expect, it } from 'vitest'
import { createCampaignProposal, createCampaignProposalForm } from './campaignProposalModel'
import { decimalFractionToPercent, getRequiredProposalStep, parseDecimalToMinor, percentToDecimalFraction, validateCampaignProposalSet } from './campaignProposalValidation'

function validCampaign(proposals) {
  return {
    ...createCampaignProposalForm(),
    titulo: 'Incentivo',
    textoOriginal: 'Texto original',
    dataInicio: '2026-10-01',
    dataFim: '2026-10-20',
    propostas: proposals
  }
}

function validProposal(clientId, fields = {}) {
  return createCampaignProposal({
    clientId,
    campos: {
      codMarca: '10',
      descrMarca: 'PRETO',
      codCargo: '100',
      descriCargo: 'VENDEDOR LOJA',
      taxaPercentual: '5',
      ...fields
    }
  })
}

describe('campaign proposal validation', () => {
  it('keeps absence distinct from zero and parses localized decimals without rounding', () => {
    expect(parseDecimalToMinor('', 2)).toBeNaN()
    expect(parseDecimalToMinor('0', 2)).toBe(0)
    expect(parseDecimalToMinor('1,5', 2)).toBe(150)
    expect(parseDecimalToMinor('1.005', 2)).toBeNaN()
    expect(percentToDecimalFraction('3,5')).toBe('0.035')
    expect(decimalFractionToPercent('0.035')).toBe('3.5')
    expect(percentToDecimalFraction('90071992547409.91')).toBe('900719925474.0991')
  })

  it('blocks an incomplete second proposal and treats warnings as non-blocking', () => {
    const second = validProposal('second', { taxaPercentual: '' })
    second.pendenciasRemotas = [{
      id: 'warning-only',
      codigo: 'INFO',
      severidade: 'AVISO',
      mensagem: 'Confirme o cadastro no backend.',
      escopo: 'PROPOSTA',
      origem: 'BACKEND'
    }]
    const campaign = validCampaign([validProposal('first'), second])
    const result = validateCampaignProposalSet(campaign)
    expect(result.blockers.some((item) => item.clientId === 'second')).toBe(true)
    expect(result.warnings).toHaveLength(1)
    expect(result.canAdvanceLocally).toBe(false)
    expect(getRequiredProposalStep('simulacao', result, campaign)).toBe('propostas')
  })

  it('does not report an exclusive/inclusive shared edge as overlap, but flags an inclusive tie', () => {
    const first = validProposal('first', { valorMaximo: '1000', maximoInclusivo: false })
    const second = validProposal('second', { valorMinimo: '1000', minimoInclusivo: true })
    let campaign = validCampaign([first, second])
    expect(validateCampaignProposalSet(campaign).conflicts).toHaveLength(0)

    first.campos.maximoInclusivo = true
    campaign = validCampaign([first, second])
    const result = validateCampaignProposalSet(campaign)
    expect(result.conflicts).toHaveLength(1)
    expect(result.byProposal.first.some((item) => item.codigo === 'FAIXA_SOBREPOSTA')).toBe(true)
    expect(result.byProposal.second.some((item) => item.codigo === 'FAIXA_SOBREPOSTA')).toBe(true)
  })

  it('requires an explicit audience choice and a limit operator', () => {
    const proposal = createCampaignProposal({ clientId: 'empty', campos: { taxaPercentual: '5', valorMinimo: '1000' } })
    const result = validateCampaignProposalSet(validCampaign([proposal]))
    expect(result.blockers.some((item) => item.codigo === 'PUBLICO_AUSENTE')).toBe(true)
    expect(result.blockers.some((item) => item.codigo === 'OPERADOR_MINIMO_AUSENTE')).toBe(true)
  })

  it('allows an exact-value interval only when both limits include the value', () => {
    const proposal = validProposal('exact', {
      valorMinimo: '1000',
      minimoInclusivo: true,
      valorMaximo: '1000',
      maximoInclusivo: true
    })
    expect(validateCampaignProposalSet(validCampaign([proposal])).blockers).toHaveLength(0)
    proposal.campos.maximoInclusivo = false
    expect(validateCampaignProposalSet(validCampaign([proposal])).blockers.some((item) => item.codigo === 'FAIXA_VAZIA')).toBe(true)
  })

  it('requires filters to be cleared before applying to every sale and does not conflate different audiences', () => {
    const allWithFilter = validProposal('all-with-filter', { publicoTodasVendas: true })
    const storeAudience = validProposal('store', { codMarca: '', descrMarca: '', codLoja: '75' })
    const brandAudience = validProposal('brand', { codLoja: '' })
    const invalid = validateCampaignProposalSet(validCampaign([allWithFilter]))
    expect(invalid.blockers.some((item) => item.codigo === 'PUBLICO_AMPLA_COM_FILTROS')).toBe(true)
    const separate = validateCampaignProposalSet(validCampaign([storeAudience, brandAudience]))
    expect(separate.conflicts).toHaveLength(0)
  })

  it('keeps a warning non-blocking and treats an unknown remote severity as blocking', () => {
    const proposal = validProposal('unknown')
    proposal.pendenciasRemotas = [{ codigo: 'FUTURO', mensagem: 'Precisa classificar.' }]
    const result = validateCampaignProposalSet(validCampaign([proposal]))
    expect(result.blockers.some((item) => item.codigo === 'FUTURO')).toBe(true)
    expect(result.canAdvanceLocally).toBe(false)
  })
})
