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

export function normalizeCampaignRecord(record) {
  if (!record || typeof record !== 'object') return record
  const normalized = { ...record }
  if (Array.isArray(normalized.regras) && !normalized.regra) {
    normalized.regra = normalized.regras[0] || null
  } else if (normalized.regra && !Array.isArray(normalized.regras)) {
    normalized.regras = [normalized.regra]
  }
  return normalized
}

export function campaignResponseToForm(response) {
  const firstRule = Array.isArray(response?.regras) && response.regras.length > 0 ? response.regras[0] : null
  const regra = response?.regra || firstRule || {}

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

export function buildCampaignRulesPayload(form = {}) {
  if (Array.isArray(form?.regras) && form.regras.length > 0) {
    return form.regras.map((r, idx) => ({
      blocoId: r.blocoId || `bloco-${idx + 1}`,
      trechoOrigem: emptyToNull(r.trechoOrigem ?? form.textoOriginal),
      nome: emptyToNull(r.nome) || (form.titulo ? `Regra ${idx + 1} - ${String(form.titulo).trim()}` : `Regra ${idx + 1}`),
      canal: emptyToNull(r.canal),
      codMarca: integerOrNull(r.codMarca),
      descrMarca: emptyToNull(r.descrMarca),
      codLoja: integerOrNull(r.codLoja),
      codCargo: integerOrNull(r.codCargo),
      descriCargo: emptyToNull(r.descriCargo),
      matricula: emptyToNull(r.matricula),
      valorMinimo: r.valorMinimo !== undefined && r.valorMinimo !== null && r.valorMinimo !== '' ? Number(r.valorMinimo) : null,
      minInclusivo: typeof r.minInclusivo === 'boolean' ? r.minInclusivo : null,
      valorMaximo: r.valorMaximo !== undefined && r.valorMaximo !== null && r.valorMaximo !== '' ? Number(r.valorMaximo) : null,
      maxInclusivo: typeof r.maxInclusivo === 'boolean' ? r.maxInclusivo : null,
      tipoOperacao: r.tipoOperacao || 'DEFINIR_TAXA',
      valorAjuste: r.valorAjuste !== undefined && r.valorAjuste !== null && r.valorAjuste !== '' ? Number(r.valorAjuste) : null,
      tipoBaseReferencia: emptyToNull(r.tipoBaseReferencia),
      taxaBaseConsultada: r.taxaBaseConsultada !== undefined && r.taxaBaseConsultada !== null ? Number(r.taxaBaseConsultada) : null,
      descricaoReferencia: emptyToNull(r.descricaoReferencia),
      taxa: r.taxa !== undefined && r.taxa !== null ? Number(r.taxa) : percentToDecimal(r.taxaPercentual ?? form.taxaPercentual),
      explicacao: emptyToNull(r.explicacao),
      pythonEquivalente: emptyToNull(r.pythonEquivalente),
      pendencias: Array.isArray(r.pendencias) ? r.pendencias : [],
      completa: typeof r.completa === 'boolean' ? r.completa : (r.taxa != null || percentToDecimal(r.taxaPercentual ?? form.taxaPercentual) !== null),
      bonusPercentual: r.bonusPercentual !== undefined && r.bonusPercentual !== null && Number(r.bonusPercentual) > 0 ? Number(r.bonusPercentual) : null,
      bonusValorFixo: r.bonusValorFixo !== undefined && r.bonusValorFixo !== null && Number(r.bonusValorFixo) > 0 ? Number(r.bonusValorFixo) : null
    }))
  }

  const taxaDecimal = percentToDecimal(form.taxaPercentual)
  const tituloTrim = String(form.titulo ?? '').trim()

  return [
    {
      blocoId: 'bloco-1',
      trechoOrigem: emptyToNull(form.textoOriginal),
      nome: tituloTrim ? `Regra - ${tituloTrim}` : 'Regra Principal',
      canal: emptyToNull(form.canal),
      codMarca: integerOrNull(form.codMarca),
      descrMarca: emptyToNull(form.descrMarca),
      codLoja: integerOrNull(form.codLoja),
      codCargo: integerOrNull(form.codCargo),
      descriCargo: emptyToNull(form.descriCargo),
      matricula: emptyToNull(form.matricula),
      valorMinimo: form.valorMinimo !== undefined && form.valorMinimo !== null && form.valorMinimo !== '' ? Number(form.valorMinimo) : null,
      minInclusivo: typeof form.minInclusivo === 'boolean' ? form.minInclusivo : null,
      valorMaximo: form.valorMaximo !== undefined && form.valorMaximo !== null && form.valorMaximo !== '' ? Number(form.valorMaximo) : null,
      maxInclusivo: typeof form.maxInclusivo === 'boolean' ? form.maxInclusivo : null,
      tipoOperacao: form.tipoOperacao || 'DEFINIR_TAXA',
      valorAjuste: form.valorAjuste !== undefined && form.valorAjuste !== null && form.valorAjuste !== '' ? Number(form.valorAjuste) : null,
      taxa: taxaDecimal,
      completa: taxaDecimal !== null
    }
  ]
}

export function campaignFormToPayload(form, options = {}) {
  const payload = {
    titulo: String(form.titulo ?? '').trim(),
    textoOriginal: String(form.textoOriginal ?? ''),
    canal: emptyToNull(form.canal),
    codMarca: integerOrNull(form.codMarca),
    descrMarca: emptyToNull(form.descrMarca),
    codLoja: integerOrNull(form.codLoja),
    codCargo: integerOrNull(form.codCargo),
    descriCargo: emptyToNull(form.descriCargo),
    matricula: emptyToNull(form.matricula),
    taxa: percentToDecimal(form.taxaPercentual),
    dataInicio: emptyToNull(form.dataInicio),
    dataFim: emptyToNull(form.dataFim),
    regras: buildCampaignRulesPayload(form)
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
  { value: '', label: 'Sem restrição de canal' },
  { value: 'LOJA_FISICA', label: 'Loja física' },
  { value: 'ECOMMERCE', label: 'E-commerce' },
  { value: 'BALCAO', label: 'Balcão' },
  { value: 'QUIOSQUE', label: 'Quiosque' },
  { value: 'APP', label: 'App' },
  { value: 'PADRAO', label: 'Padrão' }
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
