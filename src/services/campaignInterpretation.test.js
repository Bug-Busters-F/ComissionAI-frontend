import { describe, expect, it } from 'vitest'
import { applyInterpretationToForm } from './campaignInterpretation'

const form = {
  titulo: 'Campanha',
  textoOriginal: 'Comissão de 5%',
  canal: '',
  codCargo: 200,
  dataInicio: '',
  dataFim: '',
  taxaPercentual: '5'
}

describe('campaignInterpretation', () => {
  it('applies only recognized values and preserves original text', () => {
    const result = applyInterpretationToForm(form, {
      canal: 'ECOMMERCE',
      dataInicio: '2026-12-01',
      taxa: 0.075,
      campoInventado: 'ignorar'
    })

    expect(result.applied).toBe(true)
    expect(result.form).toMatchObject({
      textoOriginal: 'Comissão de 5%',
      canal: 'ECOMMERCE',
      dataInicio: '2026-12-01',
      taxaPercentual: '7.5',
      codCargo: 200
    })
    expect(result.form.campoInventado).toBeUndefined()
  })

  it('does not overwrite manual changes or values when interpretation omits fields', () => {
    const result = applyInterpretationToForm(form, { canal: 'ECOMMERCE' }, { dirtyFields: ['canal'] })

    expect(result.form.canal).toBe('')
    expect(result.form.codCargo).toBe(200)
    expect(result.changedFields).toEqual([])
  })

  it('rejects a response tied to an older source text', () => {
    const result = applyInterpretationToForm(form, { canal: 'ECOMMERCE' }, {
      sourceText: 'texto antigo',
      currentSourceText: 'texto atual'
    })

    expect(result).toMatchObject({ applied: false, reason: 'stale-source' })
    expect(result.form).toEqual(form)
  })
})
