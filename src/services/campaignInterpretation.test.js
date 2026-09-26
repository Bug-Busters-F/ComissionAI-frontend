import { describe, expect, it } from 'vitest'
import { applyInterpretationToForm, normalizeInterpretationResult } from './campaignInterpretation'

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
    const result = applyInterpretationToForm({ ...form, taxaPercentual: '' }, {
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

  it('clears an old suggestion when the new interpretation explicitly returns null', () => {
    const result = applyInterpretationToForm({ ...form, taxaPercentual: '5' }, {
      taxa: null,
      pendencias: ['Percentual não identificado.']
    }, { suggestedFields: ['taxaPercentual'] })

    expect(result.form.taxaPercentual).toBe('')
    expect(result.suggestedFields).toContain('taxaPercentual')
  })

  it('preserves manually cleared fields while replacing other suggestions', () => {
    const result = applyInterpretationToForm({ ...form, taxaPercentual: '', canal: 'ECOMMERCE' }, {
      canal: 'APP',
      taxa: 0.03
    }, {
      manualFields: ['taxaPercentual'],
      suggestedFields: ['canal', 'taxaPercentual']
    })

    expect(result.form.canal).toBe('APP')
    expect(result.form.taxaPercentual).toBe('')
    expect(result.preservedFields).toContain('taxaPercentual')
  })

  it('does not infer matrícula and deduplicates pending messages', () => {
    const normalized = normalizeInterpretationResult({
      matricula: '123',
      confianca: null,
      pendencias: ['Cargo ambíguo', 'Cargo ambíguo']
    })

    expect(normalized.valid).toBe(true)
    expect(normalized.fields.matricula).toBeUndefined()
    expect(normalized.pending).toEqual(['Cargo ambíguo'])
    expect(normalized.confidence).toBeNull()
  })

  it('rejects an empty or unrelated response before touching the form', () => {
    expect(normalizeInterpretationResult({}).valid).toBe(false)
    expect(normalizeInterpretationResult({ resultado: 'desconhecido' }).valid).toBe(false)
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
