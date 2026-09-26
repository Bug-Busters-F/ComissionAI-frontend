export const CAMPAIGN_FORM_FIELDS = [
  'canal',
  'codMarca',
  'descrMarca',
  'codLoja',
  'codCargo',
  'descriCargo',
  'matricula',
  'dataInicio',
  'dataFim',
  'taxaPercentual'
]

export function createEmptyCampaignForm() {
  return {
    titulo: '',
    textoOriginal: '',
    dataInicio: '',
    dataFim: '',
    canal: '',
    codMarca: '',
    descrMarca: '',
    codLoja: '',
    codCargo: '',
    descriCargo: '',
    matricula: '',
    taxaPercentual: ''
  }
}

function emptyToNull(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null
  }

  return value
}

function integerOrNull(value) {
  const normalized = emptyToNull(value)
  return normalized === null ? null : Number(normalized)
}

export function percentToDecimal(value) {
  const normalized = emptyToNull(value)
  if (normalized === null) {
    return null
  }

  const text = String(normalized).trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(text)) {
    return null
  }

  const decimal = Number(text) / 100
  return Number.isFinite(decimal) ? decimal : null
}

export function decimalToPercent(value) {
  const normalized = emptyToNull(value)
  if (normalized === null) {
    return ''
  }

  const percent = Number(normalized) * 100
  if (!Number.isFinite(percent)) {
    return ''
  }

  return String(Number(percent.toFixed(10)))
}

export function campaignResponseToForm(response) {
  const regra = response?.regra || {}

  return {
    titulo: response?.titulo ?? '',
    textoOriginal: response?.textoOriginal ?? '',
    dataInicio: response?.dataInicio ?? '',
    dataFim: response?.dataFim ?? '',
    canal: regra.canal ?? '',
    codMarca: regra.codMarca ?? '',
    descrMarca: regra.descrMarca ?? '',
    codLoja: regra.codLoja ?? '',
    codCargo: regra.codCargo ?? '',
    descriCargo: regra.descriCargo ?? '',
    matricula: regra.matricula ?? '',
    taxaPercentual: decimalToPercent(regra.taxa)
  }
}

export function campaignFormToPayload(form, options = {}) {
  const payload = {
    titulo: String(form.titulo ?? '').trim(),
    textoOriginal: String(form.textoOriginal ?? '').trim(),
    canal: emptyToNull(form.canal),
    codMarca: integerOrNull(form.codMarca),
    descrMarca: emptyToNull(form.descrMarca),
    codLoja: integerOrNull(form.codLoja),
    codCargo: integerOrNull(form.codCargo),
    descriCargo: emptyToNull(form.descriCargo),
    matricula: emptyToNull(form.matricula),
    taxa: percentToDecimal(form.taxaPercentual),
    dataInicio: emptyToNull(form.dataInicio),
    dataFim: emptyToNull(form.dataFim)
  }

  if (options.estado) {
    payload.estado = options.estado
  }

  return payload
}

export function formatDate(value, fallback = 'Não informado') {
  if (!value) {
    return fallback
  }

  const [year, month, day] = String(value).split('-')
  if (!year || !month || !day) {
    return fallback
  }

  return `${day}/${month}/${year}`
}

export function formatPeriod(start, end) {
  return `${formatDate(start)} até ${formatDate(end)}`
}

export function formatPeriodArrow(start, end) {
  return `${formatDate(start)} → ${formatDate(end)}`
}

export const CAMPAIGN_CHANNEL_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'LOJA_FISICA', label: 'Loja física' },
  { value: 'ECOMMERCE', label: 'E-commerce' }
]

export function formatCampaignChannel(value) {
  if (!value) {
    return 'Todos'
  }

  const normalized = String(value).toUpperCase()
  return CAMPAIGN_CHANNEL_OPTIONS.find((option) => option.value === normalized)?.label || value
}

export function formatCampaignState(state) {
  const labels = {
    DRAFT: 'Rascunho',
    ATIVA: 'Ativa',
    INATIVA: 'Inativa',
    CONCLUIDA: 'Finalizada',
    ARQUIVADA: 'Arquivada',
    CANCELADA: 'Cancelada'
  }

  return labels[state] || state || 'Não informado'
}

export function campaignStateTone(state) {
  const tones = {
    DRAFT: 'warning',
    ATIVA: 'success',
    INATIVA: 'neutral',
    CONCLUIDA: 'success',
    ARQUIVADA: 'neutral',
    CANCELADA: 'danger',
    PENDENTE_APROVACAO: 'warning'
  }

  return tones[state] || 'neutral'
}
