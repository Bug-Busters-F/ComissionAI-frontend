import { createPending } from './campaignProposalModel'
import { normalizeExternalPending } from './campaignProposalMappers'

export const RATE_MAX_DECIMALS = 2
export const MONEY_MAX_DECIMALS = 2

export function parseDecimalToMinor(value, maxDecimals = MONEY_MAX_DECIMALS) {
  const text = String(value ?? '').trim()
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) return Number.NaN
  const parts = text.replace(',', '.').split('.')
  const fraction = parts[1] || ''
  if (fraction.length > maxDecimals) return Number.NaN
  const scale = 10 ** maxDecimals
  const amount = Number(parts[0]) * scale + Number((fraction + '0'.repeat(maxDecimals)).slice(0, maxDecimals) || 0)
  return Number.isSafeInteger(amount) ? amount : Number.NaN
}

export function percentToDecimalFraction(value) {
  const minor = parseDecimalToMinor(value, RATE_MAX_DECIMALS)
  if (!Number.isFinite(minor)) return null
  const whole = Math.trunc(minor / 10000)
  const remainder = String(minor % 10000).padStart(4, '0').replace(/0+$/, '')
  return String(whole) + (remainder ? '.' + remainder : '')
}

export function decimalFractionToPercent(value) {
  const text = String(value ?? '').trim()
  const match = text.match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!match) return text
  const sign = match[1]
  const fraction = match[3] || ''
  const digits = match[2] + fraction
  const decimalPosition = match[2].length + 2
  let whole
  let remainder
  if (decimalPosition >= digits.length) {
    whole = digits + '0'.repeat(decimalPosition - digits.length)
    remainder = ''
  } else {
    whole = digits.slice(0, decimalPosition)
    remainder = digits.slice(decimalPosition)
  }
  whole = whole.replace(/^0+(?=\d)/, '')
  remainder = remainder.replace(/0+$/, '')
  return sign + (whole || '0') + (remainder ? '.' + remainder : '')
}

function isCivilDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false
  const date = new Date(value + 'T00:00:00.000Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateCampaignCommon(campaign) {
  const pending = []
  const errors = {}
  const add = (codigo, campo, mensagem) => {
    pending.push(createPending({ codigo, campo, mensagem, escopo: campo ? 'CAMPO' : 'CAMPANHA' }))
    if (campo) errors[campo] = mensagem
  }

  if (!String(campaign.titulo || '').trim()) add('TITULO_AUSENTE', 'titulo', 'Informe o título da campanha.')
  if (!String(campaign.textoOriginal || '').trim()) add('DESCRICAO_AUSENTE', 'textoOriginal', 'Informe a descrição da campanha.')
  if (String(campaign.dataInicio || '').trim() && !isCivilDate(campaign.dataInicio)) add('DATA_INICIO_INVALIDA', 'dataInicio', 'Informe uma data de início válida.')
  if (String(campaign.dataFim || '').trim() && !isCivilDate(campaign.dataFim)) add('DATA_FIM_INVALIDA', 'dataFim', 'Informe uma data de fim válida.')
  if (isCivilDate(campaign.dataInicio) && isCivilDate(campaign.dataFim) && campaign.dataFim < campaign.dataInicio) {
    add('VIGENCIA_INVERTIDA', 'dataFim', 'A data de fim não pode anteceder a data de início.')
  }

  const remote = (campaign.pendenciasCampanha || []).map((item) => normalizeExternalPending(item))
  return { pending: [...pending, ...remote], errors }
}

function addBlocker(pending, proposal, codigo, campo, mensagem) {
  pending.push(createPending({
    codigo,
    clientId: proposal.clientId,
    campo,
    mensagem,
    escopo: campo ? 'CAMPO' : 'PROPOSTA'
  }))
}

function validateIntegerCode(value, proposal, field, label, pending) {
  const text = String(value ?? '').trim()
  if (!text) return
  if (!/^\d+$/.test(text) || !Number.isSafeInteger(Number(text))) {
    addBlocker(pending, proposal, 'CODIGO_INVALIDO', field, 'Informe um código numérico inteiro válido para ' + label + '.')
  }
}

function validateMoney(value, proposal, field, label, pending) {
  const text = String(value ?? '').trim()
  if (!text) return null
  const parsed = parseDecimalToMinor(text, MONEY_MAX_DECIMALS)
  if (!Number.isFinite(parsed)) {
    addBlocker(pending, proposal, 'VALOR_INVALIDO', field, 'Informe ' + label + ' sem separador de milhar e com até duas casas decimais.')
    return null
  }
  return parsed
}

function validateProposal(proposal) {
  const pending = []
  const fields = proposal.campos || {}

  if (String(fields.taxaPercentual ?? '').trim() === '') {
    addBlocker(pending, proposal, 'TAXA_AUSENTE', 'taxaPercentual', 'Informe a taxa percentual final.')
  } else {
    const rate = parseDecimalToMinor(fields.taxaPercentual, RATE_MAX_DECIMALS)
    if (!Number.isFinite(rate) || rate <= 0 || rate > 10000) {
      addBlocker(pending, proposal, 'TAXA_INVALIDA', 'taxaPercentual', 'Informe uma taxa percentual maior que zero e até 100%, com até duas casas decimais.')
    }
  }

  validateIntegerCode(fields.codMarca, proposal, 'codMarca', 'marca', pending)
  validateIntegerCode(fields.codCargo, proposal, 'codCargo', 'cargo', pending)
  validateIntegerCode(fields.codLoja, proposal, 'codLoja', 'loja', pending)

  if (String(fields.descrMarca || '').trim() && !String(fields.codMarca || '').trim()) {
    addBlocker(pending, proposal, 'MARCA_SEM_CODIGO', 'descrMarca', 'A descrição da marca precisa de um código confirmado.')
  }
  if (String(fields.descriCargo || '').trim() && !String(fields.codCargo || '').trim()) {
    addBlocker(pending, proposal, 'CARGO_SEM_CODIGO', 'descriCargo', 'A descrição do cargo precisa de um código confirmado.')
  }

  const hasAudienceIdentifier = Boolean(
    String(fields.codMarca || '').trim() ||
    String(fields.codCargo || '').trim() ||
    String(fields.codLoja || '').trim() ||
    String(fields.canal || '').trim() ||
    String(fields.matricula || '').trim()
  )
  if (!fields.publicoTodasVendas && !hasAudienceIdentifier) {
    addBlocker(pending, proposal, 'PUBLICO_AUSENTE', null, 'Defina o público ou selecione “Aplicar a todas as vendas”.')
  }
  const hasSpecificFilters = ['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula']
    .some((field) => String(fields[field] || '').trim())
  if (fields.publicoTodasVendas && hasSpecificFilters) {
    addBlocker(pending, proposal, 'PUBLICO_AMPLA_COM_FILTROS', null, '“Aplicar a todas as vendas” não pode estar combinado com filtros específicos. Confirme ou remova esses filtros.')
  }

  const minimum = validateMoney(fields.valorMinimo, proposal, 'valorMinimo', 'o valor mínimo', pending)
  const maximum = validateMoney(fields.valorMaximo, proposal, 'valorMaximo', 'o valor máximo', pending)
  const hasMinimum = String(fields.valorMinimo ?? '').trim() !== ''
  const hasMaximum = String(fields.valorMaximo ?? '').trim() !== ''

  if (hasMinimum && typeof fields.minimoInclusivo !== 'boolean') {
    addBlocker(pending, proposal, 'OPERADOR_MINIMO_AUSENTE', 'minimoInclusivo', 'Escolha se o valor mínimo será incluído ou excluído.')
  }
  if (hasMaximum && typeof fields.maximoInclusivo !== 'boolean') {
    addBlocker(pending, proposal, 'OPERADOR_MAXIMO_AUSENTE', 'maximoInclusivo', 'Escolha se o valor máximo será incluído ou excluído.')
  }
  if (hasMinimum && hasMaximum && Number.isFinite(minimum) && Number.isFinite(maximum)) {
    if (minimum > maximum) {
      addBlocker(pending, proposal, 'FAIXA_INVERTIDA', 'valorMinimo', 'O mínimo não pode ser maior que o máximo.')
      pending[pending.length - 1].camposRelacionados = ['valorMinimo', 'valorMaximo']
    } else if (minimum === maximum && (fields.minimoInclusivo !== true || fields.maximoInclusivo !== true)) {
      addBlocker(pending, proposal, 'FAIXA_VAZIA', 'valorMinimo', 'Com este valor, pelo menos um limite exclusivo deixaria a faixa vazia.')
      pending[pending.length - 1].camposRelacionados = ['valorMinimo', 'minimoInclusivo', 'valorMaximo', 'maximoInclusivo']
    }
  }

  return pending
}

function publicSignature(proposal) {
  const fields = proposal.campos || {}
  if (fields.publicoTodasVendas) return 'all'
  const canonicalCode = (value) => String(value || '').trim() ? String(Number(String(value).trim())) : ''
  return JSON.stringify([
    canonicalCode(fields.codMarca),
    canonicalCode(fields.codCargo),
    canonicalCode(fields.codLoja),
    String(fields.canal || '').trim(),
    String(fields.matricula || '').trim()
  ])
}

function hasInvalidAudienceDefinition(proposal, pending) {
  return pending.some((item) => item.clientId === proposal.clientId && ['PUBLICO_AUSENTE', 'PUBLICO_AMPLA_COM_FILTROS', 'MARCA_SEM_CODIGO', 'CARGO_SEM_CODIGO', 'CODIGO_INVALIDO'].includes(item.codigo))
}

function rangesOverlap(left, right) {
  const a = left.campos
  const b = right.campos
  const aMin = a.valorMinimo === '' ? null : parseDecimalToMinor(a.valorMinimo, MONEY_MAX_DECIMALS)
  const aMax = a.valorMaximo === '' ? null : parseDecimalToMinor(a.valorMaximo, MONEY_MAX_DECIMALS)
  const bMin = b.valorMinimo === '' ? null : parseDecimalToMinor(b.valorMinimo, MONEY_MAX_DECIMALS)
  const bMax = b.valorMaximo === '' ? null : parseDecimalToMinor(b.valorMaximo, MONEY_MAX_DECIMALS)
  if ([aMin, aMax, bMin, bMax].some((value) => value !== null && !Number.isFinite(value))) return false

  if (aMax !== null && bMin !== null) {
    if (aMax < bMin) return false
    if (aMax === bMin && !(a.maximoInclusivo === true && b.minimoInclusivo === true)) return false
  }
  if (bMax !== null && aMin !== null) {
    if (bMax < aMin) return false
    if (bMax === aMin && !(b.maximoInclusivo === true && a.minimoInclusivo === true)) return false
  }
  return true
}

function findLocalConflicts(proposals, localById) {
  const conflicts = []
  for (let leftIndex = 0; leftIndex < proposals.length; leftIndex += 1) {
    const left = proposals[leftIndex]
    if (hasInvalidAudienceDefinition(left, localById[left.clientId] || [])) continue
    for (let rightIndex = leftIndex + 1; rightIndex < proposals.length; rightIndex += 1) {
      const right = proposals[rightIndex]
      if (hasInvalidAudienceDefinition(right, localById[right.clientId] || [])) continue
      if (publicSignature(left) !== publicSignature(right)) continue
      const leftRangeValid = !(localById[left.clientId] || []).some((item) => ['VALOR_INVALIDO', 'OPERADOR_MINIMO_AUSENTE', 'OPERADOR_MAXIMO_AUSENTE', 'FAIXA_INVERTIDA', 'FAIXA_VAZIA'].includes(item.codigo))
      const rightRangeValid = !(localById[right.clientId] || []).some((item) => ['VALOR_INVALIDO', 'OPERADOR_MINIMO_AUSENTE', 'OPERADOR_MAXIMO_AUSENTE', 'FAIXA_INVERTIDA', 'FAIXA_VAZIA'].includes(item.codigo))
      if (leftRangeValid && rightRangeValid && rangesOverlap(left, right)) {
        conflicts.push({ left: left.clientId, right: right.clientId })
      }
    }
  }
  return conflicts
}

export function validateCampaignProposalSet(campaign) {
  const common = validateCampaignCommon(campaign)
  const byProposal = {}
  const pending = [...common.pending]
  const localById = {}

  campaign.propostas.forEach((proposal) => {
    const local = validateProposal(proposal)
    localById[proposal.clientId] = local
    const remote = (proposal.pendenciasRemotas || []).map((item) => normalizeExternalPending(item, proposal.clientId))
    byProposal[proposal.clientId] = [...local, ...remote]
    pending.push(...local, ...remote)
  })

  const conflicts = findLocalConflicts(campaign.propostas, localById)
  conflicts.forEach(({ left, right }) => {
    const message = 'Esta regra se sobrepõe a outra do mesmo público. Revise os limites ou o público.'
    const conflictId = 'LOCAL:FAIXA_SOBREPOSTA:' + left + ':' + right
    const first = createPending({ codigo: 'FAIXA_SOBREPOSTA', clientId: left, mensagem: message, id: conflictId })
    const second = createPending({ codigo: 'FAIXA_SOBREPOSTA', clientId: right, mensagem: message, id: conflictId + ':' + right })
    byProposal[left].push(first)
    byProposal[right].push(second)
    pending.push(first, second)
  })

  const blockers = pending.filter((item) => item.severidade === 'IMPEDITIVO')
  const warnings = pending.filter((item) => item.severidade === 'AVISO')
  const incompleteProposalIds = [...new Set(blockers.map((item) => item.clientId).filter(Boolean))]
  return {
    pending,
    blockers,
    warnings,
    byProposal,
    common,
    conflicts,
    incompleteProposalIds,
    canInspectProposals: common.pending.every((item) => item.severidade !== 'IMPEDITIVO') && campaign.propostas.length > 0,
    canAdvanceLocally: campaign.propostas.length > 0 && blockers.length === 0
  }
}

export function getRequiredProposalStep(target, validation, campaign, { descriptionNeedsConfirmation = false, processing = false, needsValidation = false } = {}) {
  if (target === 'dados') return 'dados'
  if (descriptionNeedsConfirmation && campaign.propostas.length) return 'dados'
  if (validation.common.pending.some((item) => ['TITULO_AUSENTE', 'DESCRICAO_AUSENTE'].includes(item.codigo))) return 'dados'
  if (target === 'propostas') return 'propostas'
  if (processing || needsValidation) return 'propostas'
  if (!campaign.propostas.length) return 'propostas'
  if (validation.blockers.length) {
    const first = validation.blockers[0]
    return first.clientId || !['titulo', 'textoOriginal'].includes(first.campo) ? 'propostas' : 'dados'
  }
  return target
}
