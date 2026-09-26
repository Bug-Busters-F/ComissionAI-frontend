import { describe, expect, it } from 'vitest'
import {
  campaignFormToPayload,
  campaignResponseToForm,
  decimalToPercent,
  formatDate,
  percentToDecimal
} from './campaignMappers'

describe('campaignMappers', () => {
  it('converts integer and fractional percentages in both directions', () => {
    expect(percentToDecimal('5')).toBe(0.05)
    expect(percentToDecimal('0,75')).toBe(0.0075)
    expect(decimalToPercent(0.05)).toBe('5')
    expect(decimalToPercent('0.0075')).toBe('0.75')
  })

  it('keeps optional absence as null instead of zero', () => {
    const payload = campaignFormToPayload({
      titulo: 'Campanha',
      textoOriginal: 'Texto',
      taxaPercentual: '5',
      canal: '',
      codMarca: '',
      descrMarca: '  ',
      codLoja: null,
      codCargo: '10',
      descriCargo: '',
      matricula: '',
      dataInicio: '',
      dataFim: ''
    })

    expect(payload).toMatchObject({
      taxa: 0.05,
      canal: null,
      codMarca: null,
      codLoja: null,
      codCargo: 10,
      descrMarca: null,
      dataInicio: null,
      dataFim: null
    })
  })

  it('adds the requested campaign state without leaking demonstration fields', () => {
    const payload = campaignFormToPayload({
      titulo: 'Campanha', textoOriginal: 'Texto', taxaPercentual: '5', canal: '', codMarca: '', descrMarca: '',
      codLoja: '', codCargo: '', descriCargo: '', matricula: '', dataInicio: '', dataFim: '', budget: 7500
    }, { estado: 'DRAFT' })

    expect(payload.estado).toBe('DRAFT')
    expect(payload.budget).toBeUndefined()
  })

  it('maps the nested rule response into the shared form', () => {
    expect(campaignResponseToForm({
      titulo: 'Campanha persistida',
      textoOriginal: 'Texto original',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
      regra: { canal: 'ECOMMERCE', codCargo: 100, taxa: 0.0075 }
    })).toMatchObject({
      titulo: 'Campanha persistida',
      textoOriginal: 'Texto original',
      dataInicio: '2026-10-01',
      dataFim: '2026-10-31',
      canal: 'ECOMMERCE',
      codCargo: 100,
      taxaPercentual: '0.75'
    })
  })

  it('formats local dates without timezone conversion', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026')
    expect(formatDate(null)).toBe('Não informado')
  })
})
