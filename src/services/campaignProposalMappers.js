import {
  CAMPAIGN_PROPOSAL_SCHEMA_VERSION,
  clonePlain,
  createClientId,
  createCampaignProposal,
  createCampaignProposalForm,
  createPending
} from './campaignProposalModel'
import { decimalFractionToPercent, percentToDecimalFraction, parseDecimalToMinor } from './campaignProposalValidation'

const FILTER_FIELDS = ['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula']

function textValue(value) {
  return value === null || value === undefined ? '' : String(value)
}

function canonicalCode(value) {
  const text = textValue(value).trim()
  return text ? Number(text) : null
}

function nullableText(value) {
  const text = textValue(value)
  return text.trim() ? text : null
}

function normalizeExternalPending(raw, clientId = null) {
  if (!raw || typeof raw !== 'object') {
    return createPending({
      codigo: 'PENDENCIA_EXTERNA_INVALIDA',
      mensagem: 'O serviço retornou uma pendência sem formato reconhecido.',
      clientId,
      origem: 'BACKEND'
    })
  }

  const knownFields = new Set(['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula', 'taxaPercentual', 'valorMinimo', 'minimoInclusivo', 'valorMaximo', 'maximoInclusivo'])
  const mappedField = backendFieldName(raw.campo)
  const field = knownFields.has(mappedField) || ['dataInicio', 'dataFim'].includes(mappedField) ? mappedField : null
  const pendingClientId = raw.clientId || clientId
  const knownSeverity = raw.severidade === 'AVISO' || ['IMPEDITIVO', 'IMPEDIMENTO'].includes(raw.severidade)
  const message = typeof raw.mensagem === 'string' && raw.mensagem.trim()
    ? raw.mensagem
    : 'O serviço retornou uma pendência que precisa de classificação.'

  return createPending({
    id: raw.id ? textValue(raw.id) + (pendingClientId && !textValue(raw.id).endsWith(':' + pendingClientId) ? ':' + pendingClientId : '') : undefined,
    codigo: textValue(raw.codigo) || 'PENDENCIA_EXTERNA_SEM_CLASSIFICACAO',
    mensagem: message,
    clientId: pendingClientId,
    campo: field,
    severidade: knownSeverity && raw.severidade === 'AVISO' ? 'AVISO' : 'IMPEDITIVO',
    escopo: ['CAMPO', 'PROPOSTA', 'CAMPANHA'].includes(raw.escopo) ? raw.escopo : field ? 'CAMPO' : clientId ? 'PROPOSTA' : 'CAMPANHA',
    origem: raw.origem === 'IA' ? 'IA' : 'BACKEND',
    camposRelacionados: Array.isArray(raw.camposRelacionados) ? raw.camposRelacionados.map(backendFieldName).filter((item) => knownFields.has(item)) : field ? [field] : [],
    exigeValidacaoRemota: Boolean(raw.exigeValidacaoRemota || !knownSeverity || (raw.campo && !field))
  })
}

function normalizeProposal(raw, index) {
  const malformed = !raw || typeof raw !== 'object' || Array.isArray(raw)
  const source = malformed ? {} : raw
  const clientId = typeof source.clientId === 'string' && source.clientId ? source.clientId : undefined
  const filters = source.filtros && typeof source.filtros === 'object' ? source.filtros : {}
  const typedFields = source.campos && typeof source.campos === 'object' ? source.campos : {}
  const range = source.condicaoValor && typeof source.condicaoValor === 'object' ? source.condicaoValor : {}
  const external = Array.isArray(source.pendenciasRemotas)
    ? source.pendenciasRemotas.map((item) => normalizeExternalPending(item, clientId || null))
    : []
  const campos = {}

  FILTER_FIELDS.forEach((field) => {
    campos[field] = textValue(Object.prototype.hasOwnProperty.call(typedFields, field) ? typedFields[field] : filters[field])
  })
  campos.publicoTodasVendas = Boolean(Object.prototype.hasOwnProperty.call(typedFields, 'publicoTodasVendas')
    ? typedFields.publicoTodasVendas
    : filters.publicoTodasVendas)

  const rawRate = Object.prototype.hasOwnProperty.call(typedFields, 'taxaPercentual')
    ? typedFields.taxaPercentual
    : source.taxa
  if (rawRate === null || rawRate === undefined || rawRate === '') {
    campos.taxaPercentual = ''
  } else if (Object.prototype.hasOwnProperty.call(typedFields, 'taxaPercentual')) {
    campos.taxaPercentual = textValue(rawRate)
  } else {
    campos.taxaPercentual = decimalFractionToPercent(rawRate)
  }

  campos.valorMinimo = textValue(Object.prototype.hasOwnProperty.call(typedFields, 'valorMinimo') ? typedFields.valorMinimo : range.minimo)
  campos.minimoInclusivo = Object.prototype.hasOwnProperty.call(typedFields, 'minimoInclusivo') ? typedFields.minimoInclusivo : (range.minimo === null || range.minimo === undefined || range.minimo === '' ? null : (typeof range.minimoInclusivo === 'boolean' ? range.minimoInclusivo : null))
  campos.valorMaximo = textValue(Object.prototype.hasOwnProperty.call(typedFields, 'valorMaximo') ? typedFields.valorMaximo : range.maximo)
  campos.maximoInclusivo = Object.prototype.hasOwnProperty.call(typedFields, 'maximoInclusivo') ? typedFields.maximoInclusivo : (range.maximo === null || range.maximo === undefined || range.maximo === '' ? null : (typeof range.maximoInclusivo === 'boolean' ? range.maximoInclusivo : null))

  const receivedValidity = source.vigencia && typeof source.vigencia === 'object'
    ? source.vigencia
    : (Object.prototype.hasOwnProperty.call(source, 'dataInicio') || Object.prototype.hasOwnProperty.call(source, 'dataFim'))
      ? { dataInicio: source.dataInicio ?? null, dataFim: source.dataFim ?? null }
      : null
  const receivedMetadata = source.metadados && typeof source.metadados === 'object'
    ? clonePlain(source.metadados)
    : source.metadadosRecebidos && typeof source.metadadosRecebidos === 'object' ? clonePlain(source.metadadosRecebidos) : {}
  if (receivedValidity) receivedMetadata.vigenciaRecebida = clonePlain(receivedValidity)

  const proposal = createCampaignProposal({
    clientId,
    serverId: source.serverId ?? null,
    origem: ['manual', 'interpretacao', 'demonstracao'].includes(source.origem) ? source.origem : 'interpretacao',
    textoOrigem: textValue(source.textoOrigem),
    trechoOriginal: textValue(source.trechoOriginal ?? source.textoOrigem),
    resumo: textValue(source.resumo),
    campos,
    camposManuais: Array.isArray(source.camposManuais) ? source.camposManuais : [],
    pendenciasRemotas: external,
    metadadosRecebidos: receivedMetadata,
    revisaoLocal: 0
  })

  if (malformed || !source.filtros && !source.campos) {
    proposal.pendenciasRemotas.push(createPending({
      codigo: 'PROPOSTA_MALFORMADA',
      mensagem: malformed
        ? 'A regra recebida não contém um objeto válido. Revise e complete este bloco antes de continuar.'
        : 'A regra recebida não informa os filtros em um formato reconhecido. Revise este bloco antes de continuar.',
      clientId: proposal.clientId,
      origem: 'BACKEND',
      exigeValidacaoRemota: true,
      id: 'BACKEND:PROPOSTA_MALFORMADA:' + proposal.clientId + ':' + index
    }))
    proposal.metadadosRecebidos.indiceOriginal = index
  }

  if (source.taxa !== undefined && source.taxa !== null && source.taxa !== '' && !Number.isFinite(parseDecimalToMinor(textValue(source.taxa), 4))) {
    proposal.pendenciasRemotas.push(createPending({
      codigo: 'TAXA_CONTRATO_NAO_RECONHECIDA',
      mensagem: 'A taxa recebida não pôde ser convertida com precisão. Confirme o valor no contrato de integração.',
      clientId: proposal.clientId,
      campo: 'taxaPercentual',
      origem: 'BACKEND',
      exigeValidacaoRemota: true
    }))
  }

  return proposal
}

export function normalizeCampaignProposalResponse(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new TypeError('A resposta não contém uma campanha no formato esperado.')
  }

  if (Array.isArray(raw.pendenciasGerais) || raw.propostas?.some((p) => p && Object.hasOwn(p, 'blocoId'))) return normalizeBackendCampaignResponse(raw)

  const campaignData = raw.campanha && typeof raw.campanha === 'object' ? raw.campanha : raw
  let rawProposals
  let legacy = false
  if (Array.isArray(raw.propostas)) {
    rawProposals = raw.propostas
  } else if (raw.regra && typeof raw.regra === 'object') {
    rawProposals = [raw.regra]
    legacy = true
  } else {
    throw new TypeError('A resposta não contém uma lista de regras reconhecida.')
  }

  const campaign = createCampaignProposalForm()
  campaign.titulo = textValue(campaignData.titulo)
  campaign.textoOriginal = textValue(Object.prototype.hasOwnProperty.call(campaignData, 'descricao') ? campaignData.descricao : campaignData.textoOriginal)
  campaign.dataInicio = textValue(campaignData.dataInicio)
  campaign.dataFim = textValue(campaignData.dataFim)
  const rawCampaignPendings = Array.isArray(raw.pendenciasCampanha) ? raw.pendenciasCampanha : []
  campaign.pendenciasCampanha = rawCampaignPendings.map((item) => normalizeExternalPending(item))

  // Every source entry becomes a block, even if it is incomplete or malformed.
  campaign.propostas = rawProposals.map((proposal, index) => normalizeProposal(proposal, index))
  const seenClientIds = new Set()
  campaign.propostas.forEach((proposal) => {
    if (seenClientIds.has(proposal.clientId)) {
      const originalClientId = proposal.clientId
      proposal.metadadosRecebidos.clientIdOriginal = originalClientId
      proposal.clientId = createClientId()
      proposal.pendenciasRemotas.forEach((pending) => {
        pending.clientId = proposal.clientId
        pending.id = pending.id + ':duplicate-client-id:' + proposal.clientId
      })
      proposal.pendenciasRemotas.push(createPending({
        codigo: 'CLIENT_ID_DUPLICADO',
        mensagem: 'A resposta repetiu a identidade local de outra regra. Este bloco recebeu uma identidade local própria; confirme a correlação antes de continuar.',
        clientId: proposal.clientId,
        origem: 'BACKEND',
        exigeValidacaoRemota: true
      }))
    }
    seenClientIds.add(proposal.clientId)
  })

  campaign.propostas.forEach((proposal) => {
    const received = proposal.metadadosRecebidos.vigenciaRecebida
    if (!received || typeof received !== 'object') return
    const differs = (received.dataInicio !== undefined && received.dataInicio !== null && String(received.dataInicio) !== campaign.dataInicio) ||
      (received.dataFim !== undefined && received.dataFim !== null && String(received.dataFim) !== campaign.dataFim)
    if (differs) {
      proposal.pendenciasRemotas.push(createPending({
        codigo: 'VIGENCIA_DIVERGENTE',
        mensagem: 'A vigência recebida para esta regra diverge da vigência comum da campanha. Confirme o contrato antes de continuar.',
        clientId: proposal.clientId,
        origem: 'BACKEND',
        exigeValidacaoRemota: true
      }))
    }
  })

  const duplicateIds = new Map()
  campaign.propostas.forEach((proposal) => {
    if (!proposal.serverId) return
    const serverId = String(proposal.serverId)
    duplicateIds.set(serverId, (duplicateIds.get(serverId) || 0) + 1)
  })
  campaign.propostas.forEach((proposal) => {
    if (proposal.serverId && duplicateIds.get(String(proposal.serverId)) > 1) {
      proposal.pendenciasRemotas.push(createPending({
        codigo: 'ID_SERVIDOR_DUPLICADO',
        mensagem: 'Mais de uma regra recebeu o mesmo identificador do serviço. Confirme a correlação antes de continuar.',
        clientId: proposal.clientId,
        origem: 'BACKEND',
        exigeValidacaoRemota: true
      }))
    }
    if (legacy) {
      proposal.pendenciasRemotas.push(createPending({
        codigo: 'CONTRATO_LEGADO_SINGULAR',
        mensagem: 'Esta resposta contém apenas uma regra e não confirma a interpretação de todas as regras da campanha.',
        clientId: proposal.clientId,
        severidade: 'AVISO',
        origem: 'BACKEND'
      }))
    }
  })

  return { campaign, legacy }
}

export function campaignProposalToCanonical(campaign) {
  return {
    schemaVersion: CAMPAIGN_PROPOSAL_SCHEMA_VERSION,
    campanha: {
      titulo: campaign.titulo,
      descricao: campaign.textoOriginal,
      dataInicio: campaign.dataInicio,
      dataFim: campaign.dataFim
    },
    propostas: campaign.propostas.map((proposal) => {
      const fields = proposal.campos
      const min = fields.valorMinimo === '' ? null : fields.valorMinimo
      const max = fields.valorMaximo === '' ? null : fields.valorMaximo
      return {
        clientId: proposal.clientId,
        serverId: proposal.serverId,
        textoOrigem: proposal.textoOrigem,
        trechoOriginal: proposal.trechoOriginal,
        resumo: proposal.resumo,
        filtros: {
          codMarca: canonicalCode(fields.codMarca),
          descrMarca: nullableText(fields.descrMarca),
          codCargo: canonicalCode(fields.codCargo),
          descriCargo: nullableText(fields.descriCargo),
          codLoja: canonicalCode(fields.codLoja),
          canal: nullableText(fields.canal),
          matricula: nullableText(fields.matricula),
          publicoTodasVendas: Boolean(fields.publicoTodasVendas)
        },
        taxa: fields.taxaPercentual === '' ? null : percentToDecimalFraction(fields.taxaPercentual),
        condicaoValor: {
          minimo: min === null ? null : decimalCurrency(min),
          minimoInclusivo: min === null ? null : fields.minimoInclusivo,
          maximo: max === null ? null : decimalCurrency(max),
          maximoInclusivo: max === null ? null : fields.maximoInclusivo
        },
        metadados: clonePlain(proposal.metadadosRecebidos)
      }
    })
  }
}

function decimalCurrency(value) {
  const minor = parseDecimalToMinor(String(value), 2)
  if (!Number.isFinite(minor)) return String(value)
  const whole = Math.trunc(minor / 100)
  const cents = String(minor % 100).padStart(2, '0')
  return String(whole) + '.' + cents
}

export { normalizeExternalPending }

// The backend DTO is isolated from demo fixtures and the presentation schema.
export const BACKEND_FIELD_MAP = Object.freeze({
  marca: 'codMarca', cargo: 'codCargo', loja: 'codLoja', taxa: 'taxaPercentual', taxaFinal: 'taxaPercentual',
  'condicaoValor.valorMinimo': 'valorMinimo', 'condicaoValor.minInclusivo': 'minimoInclusivo',
  'condicaoValor.valorMaximo': 'valorMaximo', 'condicaoValor.maxInclusivo': 'maximoInclusivo',
  'operacaoBase.valorAjuste': 'taxaPercentual', 'vigencia.dataInicio': 'dataInicio', 'vigencia.dataFim': 'dataFim'
})

export function backendFieldName(field) {
  return BACKEND_FIELD_MAP[field] || (String(field || '').startsWith('filtros.') ? field.slice(8) : field)
}

const MONTH_NAMES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

// Only suppress a purely temporal clause whose dates match the common period.
// Other unparsed conditions, ambiguous dates and all blockers must stay visible.
function isRedundantValidityWarning(pending, start, end) {
  if (pending.codigo !== 'TRECHO_NAO_MAPEADO' || pending.severidade !== 'AVISO') return false
  const match = pending.mensagem.match(/^Trecho do pedido que não virou regra:\s*['"“]([\s\S]+)['"”]\.?\s*$/i)
  if (!match) return false
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(value + 'T00:00:00Z')
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }
  if (!validDate(start) || !validDate(end) || start > end) return false
  const [startYear, startMonth, startDay] = start.split('-').map(Number)
  const [endYear, endMonth] = end.split('-').map(Number)
  const datePattern = (value) => {
    const [year, month, day] = value.split('-').map(Number)
    return `(?:${value}|0?${day}/0?${month}/${year}|0?${day} de ${MONTH_NAMES[month - 1]} de ${year})`
  }
  const shortStart = startYear === endYear
    ? `|0?${startDay} de ${MONTH_NAMES[startMonth - 1]}${startMonth === endMonth ? `|0?${startDay}` : ''}` : ''
  const range = new RegExp(`(?:${datePattern(start)}${shortStart})\\s+(?:a|ate|ao|e|-)\\s+${datePattern(end)}`)
  const clause = match[1].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
  if (!/\b(?:vigencia|valida|valido|periodo)\b/.test(clause) || !range.test(clause)) return false
  const remainder = clause.replace(range, ' ').replace(/[.,:]/g, ' ').trim()
  const temporalWords = new Set('quero gostaria de criar uma a o campanha com vigencia valida valido sera ser ter entre no na periodo do da dias dia inicio fim em e para'.split(' '))
  return remainder.split(/\s+/).every((word) => temporalWords.has(word))
}

export function normalizeBackendCampaignResponse(raw) {
  if (!raw || !Array.isArray(raw.propostas) || !Array.isArray(raw.pendenciasGerais)) {
    throw new TypeError('O serviço não retornou propostas e pendências no contrato esperado. Seus dados foram preservados.')
  }
  const campaign = createCampaignProposalForm()
  campaign.tituloSugerido = textValue(raw.tituloSugerido)
  campaign.pendenciasCampanha = raw.pendenciasGerais.map((p) => normalizeExternalPending({ ...p, origem: 'IA' }))
  campaign.propostas = raw.propostas.map((rawProposal, index) => {
    const p = rawProposal && typeof rawProposal === 'object' ? rawProposal : {}
    const f = p.filtros || {}
    const r = p.condicaoValor || {}
    const proposal = createCampaignProposal({
      origem: 'interpretacao', textoOrigem: textValue(p.trechoOrigem), trechoOriginal: textValue(p.trechoOrigem),
      campos: {
        ...Object.fromEntries(FILTER_FIELDS.map((key) => [key, textValue(f[key])])),
        publicoTodasVendas: false,
        taxaPercentual: p.taxaFinal == null ? '' : decimalFractionToPercent(p.taxaFinal).replace('.', ','),
        valorMinimo: textValue(r.valorMinimo), minimoInclusivo: r.valorMinimo == null ? null : r.minInclusivo,
        valorMaximo: textValue(r.valorMaximo), maximoInclusivo: r.valorMaximo == null ? null : r.maxInclusivo
      },
      metadadosRecebidos: {
        blocoId: p.blocoId, contratoBackend: clonePlain(p), vigenciaRecebida: clonePlain(p.vigencia || {}),
        operacaoBase: clonePlain(p.operacaoBase), origensPorCampo: clonePlain(p.origensPorCampo || {}),
        pythonAtualizado: p.pythonEquivalente || null, referenciasConsultadas: clonePlain(p.referenciasConsultadas || []), explicacao: textValue(p.explicacao),
        bonusPercentual: p.bonusPercentual ?? null, bonusValorFixo: p.bonusValorFixo ?? null,
        completa: p.completa, validacaoPendente: true
      }
    })
    const validScalar = (v) => v == null || typeof v === 'string' || typeof v === 'number'
    const valid = typeof p.blocoId === 'string' && p.blocoId.trim() && typeof p.filtros === 'object' && p.filtros !== null &&
      FILTER_FIELDS.every((key) => Object.hasOwn(f, key) && validScalar(f[key])) &&
      p.condicaoValor && ['valorMinimo', 'minInclusivo', 'valorMaximo', 'maxInclusivo'].every((key) => Object.hasOwn(r, key)) &&
      ['valorMinimo', 'valorMaximo'].every((key) => validScalar(r[key])) &&
      ['minInclusivo', 'maxInclusivo'].every((key) => r[key] === null || typeof r[key] === 'boolean') &&
      Object.hasOwn(p, 'taxaFinal') && validScalar(p.taxaFinal) && p.operacaoBase && typeof p.operacaoBase.tipoOperacao === 'string' &&
      Array.isArray(p.pendencias) && typeof p.completa === 'boolean' && p.vigencia && ['dataInicio', 'dataFim'].every((key) => Object.hasOwn(p.vigencia, key))
    proposal.pendenciasRemotas = (Array.isArray(p.pendencias) ? p.pendencias : []).map((pending) => normalizeExternalPending({ ...pending, origem: 'IA' }, proposal.clientId))
    if (p.completa === false && !proposal.pendenciasRemotas.some((pending) => pending.severidade === 'IMPEDITIVO')) {
      proposal.pendenciasRemotas.push(createPending({ clientId: proposal.clientId, codigo: 'INCOMPLETA_SEM_JUSTIFICATIVA', mensagem: 'O serviço marcou esta regra como incompleta. Reinterprete para obter as pendências.', exigeValidacaoRemota: true }))
    }
    if (!valid) {
      proposal.metadadosRecebidos.contratoInvalido = true
      proposal.pendenciasRemotas.push(createPending({ clientId: proposal.clientId, codigo: 'CONTRATO_INVALIDO',
        mensagem: 'A regra ' + (index + 1) + ' retornou campos ausentes ou inválidos. Reinterprete antes de continuar.', exigeValidacaoRemota: true }))
    }
    return proposal
  })
  const periods = campaign.propostas.map((p) => p.metadadosRecebidos.vigenciaRecebida)
  const first = periods[0]
  if (first?.dataInicio && first?.dataFim && periods.every((p) => p.dataInicio === first.dataInicio && p.dataFim === first.dataFim)) {
    campaign.dataInicio = first.dataInicio
    campaign.dataFim = first.dataFim
    campaign.pendenciasCampanha = campaign.pendenciasCampanha.filter((pending) =>
      !isRedundantValidityWarning(pending, campaign.dataInicio, campaign.dataFim))
  } else if (periods.length) {
    campaign.pendenciasCampanha.push(createPending({ codigo: 'VIGENCIA_NAO_CONSOLIDADA',
      mensagem: 'As regras precisam de uma vigência comum completa. Corrija o período no texto da campanha e reinterprete.', exigeValidacaoRemota: true }))
  }
  return { campaign, legacy: false }
}

export function proposalToBackend(proposal, campaign) {
  const canonical = campaignProposalToCanonical({ ...campaign, propostas: [proposal] }).propostas[0]
  const metadata = proposal.metadadosRecebidos || {}
  return {
    ...clonePlain(metadata.contratoBackend || {}),
    blocoId: proposal.clientId, trechoOrigem: proposal.textoOrigem,
    filtros: Object.fromEntries(FILTER_FIELDS.map((field) => [field, canonical.filtros[field]])),
    condicaoValor: { valorMinimo: canonical.condicaoValor.minimo, minInclusivo: canonical.condicaoValor.minimoInclusivo,
      valorMaximo: canonical.condicaoValor.maximo, maxInclusivo: canonical.condicaoValor.maximoInclusivo },
    taxaFinal: canonical.taxa,
    operacaoBase: proposal.camposManuais.includes('taxaPercentual') || !metadata.operacaoBase
      ? { tipoOperacao: 'DEFINIR_TAXA', valorAjuste: canonical.taxa, referenciaBase: null }
      : clonePlain(metadata.operacaoBase),
    vigencia: { dataInicio: campaign.dataInicio || null, dataFim: campaign.dataFim || null },
    pendencias: [], referenciasConsultadas: metadata.origensDesatualizadas ? [] : metadata.referenciasConsultadas || [], origensPorCampo: metadata.origensPorCampo || {},
    bonusPercentual: metadata.bonusPercentual ?? null, bonusValorFixo: metadata.bonusValorFixo ?? null
  }
}
