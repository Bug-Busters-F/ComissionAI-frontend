import { decimalToPercent } from './campaignMappers'

const FIELD_ALIASES = {
  canal: ['canal', 'channel'],
  codMarca: ['codMarca', 'cod_marca'],
  descrMarca: ['descrMarca', 'descr_marca'],
  codLoja: ['codLoja', 'cod_loja'],
  codCargo: ['codCargo', 'cod_cargo'],
  descriCargo: ['descriCargo', 'descri_cargo'],
  dataInicio: ['dataInicio', 'data_inicio'],
  dataFim: ['dataFim', 'data_fim']
}

const SIMPLE_FIELDS = ['canal', 'codLoja', 'dataInicio', 'dataFim']
const COORDINATED_FIELDS = [
  ['codMarca', 'descrMarca'],
  ['codCargo', 'descriCargo']
]

export const INTERPRETATION_FIELDS = [
  'canal',
  'codMarca',
  'descrMarca',
  'codLoja',
  'codCargo',
  'descriCargo',
  'dataInicio',
  'dataFim',
  'taxaPercentual'
]

export function applyInterpretationToForm(form, interpretation, options = {}) {
  const { sourceText = null, currentSourceText = null, dirtyFields = [], manualFields = [], suggestedFields = [] } = options
  const normalized = interpretation?.fields ? interpretation : normalizeInterpretationResult(interpretation?.result || interpretation)

  if (!normalized.valid) {
    return {
      applied: false,
      reason: 'incompatible-response',
      message: normalized.message,
      form: { ...form },
      changedFields: [],
      suggestedFields: [],
      preservedFields: []
    }
  }

  if (sourceText !== null && currentSourceText !== null && sourceText !== currentSourceText) {
    return {
      applied: false,
      reason: 'stale-source',
      form: { ...form },
      changedFields: [],
      suggestedFields: [],
      preservedFields: []
    }
  }

  const manual = new Set(manualFields.length ? manualFields : dirtyFields)
  const previousSuggestions = new Set(suggestedFields)
  const nextForm = { ...form }
  const changedFields = []
  const nextSuggestedFields = []
  const preservedFields = []

  for (const fields of COORDINATED_FIELDS) {
    const responseHasGroup = fields.some((field) => hasOwn(normalized.fields, field))
    const manuallyOwned = fields.some((field) => manual.has(field))
    const previouslySuggested = fields.some((field) => previousSuggestions.has(field))
    const hasExistingValue = fields.some((field) => !isEmpty(form[field]))

    if (manuallyOwned) {
      for (const field of fields) {
        if (!manual.has(field) && (previousSuggestions.has(field) || hasOwn(normalized.fields, field))) {
          setField(nextForm, field, null, changedFields)
        }
      }
      preservedFields.push(...fields.filter((field) => manual.has(field)))
      continue
    }

    if (!responseHasGroup || (hasExistingValue && !previouslySuggested)) {
      continue
    }

    for (const field of fields) {
      const value = hasOwn(normalized.fields, field) ? normalized.fields[field] : null
      setField(nextForm, field, value, changedFields)
      nextSuggestedFields.push(field)
    }
  }

  for (const field of SIMPLE_FIELDS) {
    if (!hasOwn(normalized.fields, field)) continue

    if (manual.has(field)) {
      preservedFields.push(field)
      continue
    }

    const hasExistingValue = !isEmpty(form[field])
    if (hasExistingValue && !previousSuggestions.has(field)) continue

    setField(nextForm, field, normalized.fields[field], changedFields)
    nextSuggestedFields.push(field)
  }

  if (hasOwn(normalized.fields, 'taxa')) {
    if (manual.has('taxaPercentual')) {
      preservedFields.push('taxaPercentual')
    } else {
      const hasExistingValue = !isEmpty(form.taxaPercentual)
      if (!hasExistingValue || previousSuggestions.has('taxaPercentual')) {
        const value = normalized.fields.taxa === null ? null : decimalToPercent(normalized.fields.taxa)
        setField(nextForm, 'taxaPercentual', value, changedFields)
        nextSuggestedFields.push('taxaPercentual')
      }
    }
  }

  return {
    applied: true,
    reason: null,
    form: nextForm,
    changedFields,
    suggestedFields: nextSuggestedFields,
    preservedFields: [...new Set(preservedFields)]
  }
}

export function normalizeInterpretationResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return { valid: false, message: 'O serviço retornou uma resposta sem estrutura compatível.' }
  }

  if (result.pendencias !== undefined && !Array.isArray(result.pendencias)) {
    return { valid: false, message: 'A resposta da interpretação possui pendências em formato inválido.' }
  }

  const fields = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const entry = findFirstPresent(result, aliases)
    if (entry.present) fields[field] = entry.value
  }

  if (hasOwn(result, 'taxa')) {
    const taxa = result.taxa
    if (taxa !== null && !isDecimalValue(taxa)) {
      return { valid: false, message: 'A resposta da interpretação trouxe uma taxa inválida.' }
    }
    fields.taxa = taxa
  }

  const confidence = hasOwn(result, 'confianca') ? result.confianca : result.confidence
  if (confidence !== undefined && confidence !== null && !Number.isFinite(Number(confidence))) {
    return { valid: false, message: 'A resposta da interpretação trouxe uma confiança inválida.' }
  }

  const hasContractField = Object.keys(fields).length > 0 ||
    hasOwn(result, 'pendencias') ||
    hasOwn(result, 'confianca') ||
    hasOwn(result, 'confidence')
  if (!hasContractField) {
    return { valid: false, message: 'O serviço retornou uma resposta vazia ou incompatível.' }
  }

  return {
    valid: true,
    fields,
    pending: dedupeMessages(result.pendencias),
    confidence: confidence === undefined || confidence === null ? null : Number(confidence),
    raw: result
  }
}

export function dedupeInterpretationMessages(messages) {
  return dedupeMessages(messages)
}

function findFirstPresent(object, aliases) {
  for (const alias of aliases) {
    if (hasOwn(object, alias)) {
      return { present: true, value: object[alias] }
    }
  }
  return { present: false, value: undefined }
}

function setField(form, field, value, changedFields) {
  const nextValue = normalizeFormValue(field, value)
  if (form[field] !== nextValue) {
    form[field] = nextValue
    changedFields.push(field)
  }
}

function normalizeFormValue(field, value) {
  if (value === undefined || value === null) return ''
  if (field === 'canal') return String(value).trim().toUpperCase()
  if (typeof value === 'string') return value.trim()
  return value
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === ''
}

function isDecimalValue(value) {
  if (typeof value === 'number') return Number.isFinite(value)
  return typeof value === 'string' && /^\s*\d+(?:[.,]\d+)?\s*$/.test(value)
}

function dedupeMessages(messages) {
  if (!Array.isArray(messages)) return []
  return [...new Set(messages.map((message) => String(message ?? '').trim()).filter(Boolean))]
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key)
}
