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
  const field = knownFields.has(raw.campo) ? raw.campo : null
  const pendingClientId = raw.clientId || clientId
  const knownSeverity = raw.severidade === 'AVISO' || raw.severidade === 'IMPEDITIVO'
  const message = typeof raw.mensagem === 'string' && raw.mensagem.trim()
    ? raw.mensagem
    : 'O serviço retornou uma pendência que precisa de classificação.'

  return createPending({
    id: raw.id ? textValue(raw.id) + (pendingClientId ? ':' + pendingClientId : '') : undefined,
    codigo: textValue(raw.codigo) || 'PENDENCIA_EXTERNA_SEM_CLASSIFICACAO',
    mensagem: message,
    clientId: pendingClientId,
    campo: field,
    severidade: knownSeverity && raw.severidade === 'AVISO' ? 'AVISO' : 'IMPEDITIVO',
    escopo: ['CAMPO', 'PROPOSTA', 'CAMPANHA'].includes(raw.escopo) ? raw.escopo : field ? 'CAMPO' : clientId ? 'PROPOSTA' : 'CAMPANHA',
    origem: raw.origem === 'IA' ? 'IA' : 'BACKEND',
    camposRelacionados: Array.isArray(raw.camposRelacionados) ? raw.camposRelacionados.filter((item) => knownFields.has(item)) : field ? [field] : [],
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
