import { percentToDecimal } from './campaignMappers'

export function validateCampaignForm(form) {
  const errors = {}

  if (!String(form.titulo ?? '').trim()) {
    errors.titulo = 'Informe o título da campanha.'
  }

  if (!String(form.textoOriginal ?? '').trim()) {
    errors.textoOriginal = 'Informe o texto original da campanha.'
  }

  const taxaText = String(form.taxaPercentual ?? '').trim()
  const taxa = percentToDecimal(taxaText)
  if (!taxaText) {
    errors.taxaPercentual = 'Informe uma taxa positiva.'
  } else if (taxa === null || taxa <= 0) {
    errors.taxaPercentual = 'Informe uma taxa decimal positiva.'
  }

  if (form.dataInicio && form.dataFim && form.dataFim < form.dataInicio) {
    errors.dataFim = 'A data final não pode ser anterior à data inicial.'
  }

  for (const field of ['dataInicio', 'dataFim']) {
    const value = String(form[field] ?? '').trim()
    if (value && !isValidDate(value)) {
      errors[field] = 'Informe uma data válida.'
    }
  }

  for (const field of ['codMarca', 'codLoja', 'codCargo']) {
    const value = String(form[field] ?? '').trim()
    if (value && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)))) {
      errors[field] = 'Use apenas números neste campo.'
    }
  }

  return errors
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0
}
