import { describe, expect, it } from 'vitest'
import { validateCampaignForm } from './campaignValidation'

const validForm = {
  titulo: 'Campanha',
  textoOriginal: 'Texto original',
  taxaPercentual: '5',
  dataInicio: '2026-10-01',
  dataFim: '2026-10-31'
}

describe('campaignValidation', () => {
  it('requires title, original text and a positive rate', () => {
    const errors = validateCampaignForm({ ...validForm, titulo: ' ', textoOriginal: '', taxaPercentual: '0' })

    expect(errors).toMatchObject({
      titulo: 'Informe o título da campanha.',
      textoOriginal: 'Informe o texto original da campanha.',
      taxaPercentual: 'Informe uma taxa decimal positiva.'
    })
  })

  it('rejects malformed rates and inverted periods', () => {
    const errors = validateCampaignForm({ ...validForm, taxaPercentual: '5%', dataFim: '2026-09-30' })

    expect(errors.taxaPercentual).toBe('Informe uma taxa decimal positiva.')
    expect(errors.dataFim).toBe('A data final não pode ser anterior à data inicial.')
  })

  it('allows missing dates because the backend supplies the defaults', () => {
    expect(validateCampaignForm({ ...validForm, dataInicio: '', dataFim: '' })).toEqual({})
  })

  it('requires numeric optional dimension codes', () => {
    const errors = validateCampaignForm({ ...validForm, codMarca: 'A10', codLoja: '3B' })

    expect(errors.codMarca).toBe('Use apenas números neste campo.')
    expect(errors.codLoja).toBe('Use apenas números neste campo.')
  })
})
