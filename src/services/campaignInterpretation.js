import { decimalToPercent } from './campaignMappers'

const INTERPRETATION_TO_FORM = {
  canal: 'canal',
  codMarca: 'codMarca',
  descrMarca: 'descrMarca',
  codLoja: 'codLoja',
  codCargo: 'codCargo',
  descriCargo: 'descriCargo',
  matricula: 'matricula',
  dataInicio: 'dataInicio',
  dataFim: 'dataFim'
}

export function applyInterpretationToForm(form, interpretation, options = {}) {
  const { sourceText = null, currentSourceText = null, dirtyFields = [] } = options
  const result = normalizeInterpretationResult(interpretation?.result || interpretation || {})

  if (sourceText !== null && currentSourceText !== null && sourceText !== currentSourceText) {
    return {
      applied: false,
      reason: 'stale-source',
      form: { ...form },
      changedFields: []
    }
  }

  const dirty = new Set(dirtyFields)
  const nextForm = { ...form }
  const changedFields = []

  Object.entries(INTERPRETATION_TO_FORM).forEach(([sourceField, formField]) => {
    const value = result[sourceField]
    if (value === undefined || value === null || value === '' || dirty.has(formField)) {
      return
    }

    nextForm[formField] = value
    changedFields.push(formField)
  })

  if (result.taxa !== undefined && result.taxa !== null && !dirty.has('taxaPercentual')) {
    const taxaPercentual = decimalToPercent(result.taxa)
    if (taxaPercentual !== '') {
      nextForm.taxaPercentual = taxaPercentual
      changedFields.push('taxaPercentual')
    }
  }

  return {
    applied: true,
    reason: null,
    form: nextForm,
    changedFields
  }
}

function normalizeInterpretationResult(result) {
  return {
    ...result,
    canal: result.canal ?? result.channel,
    codMarca: result.codMarca ?? result.cod_marca,
    descrMarca: result.descrMarca ?? result.descr_marca,
    codLoja: result.codLoja ?? result.cod_loja,
    codCargo: result.codCargo ?? result.cod_cargo,
    descriCargo: result.descriCargo ?? result.descri_cargo,
    dataInicio: result.dataInicio ?? result.data_inicio,
    dataFim: result.dataFim ?? result.data_fim
  }
}
