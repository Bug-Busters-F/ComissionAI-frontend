export const CAMPAIGN_PROPOSAL_SCHEMA_VERSION = 'frontend-s2-provisional-1'

export const PROPOSAL_FIELD_NAMES = Object.freeze([
  'codMarca',
  'descrMarca',
  'codCargo',
  'descriCargo',
  'codLoja',
  'canal',
  'matricula',
  'publicoTodasVendas',
  'taxaPercentual',
  'valorMinimo',
  'minimoInclusivo',
  'valorMaximo',
  'maximoInclusivo'
])

let localIdSequence = 0

export function createClientId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  localIdSequence += 1
  return 'proposal-' + Date.now().toString(36) + '-' + localIdSequence.toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

export function createCampaignProposal(fields = {}) {
  return {
    clientId: fields.clientId || createClientId(),
    serverId: fields.serverId ?? null,
    origem: fields.origem || 'manual',
    textoOrigem: fields.textoOrigem || '',
    trechoOriginal: fields.trechoOriginal ?? fields.textoOrigem ?? '',
    resumo: fields.resumo || '',
    campos: {
      codMarca: '',
      descrMarca: '',
      codCargo: '',
      descriCargo: '',
      codLoja: '',
      canal: '',
      matricula: '',
      publicoTodasVendas: false,
      taxaPercentual: '',
      valorMinimo: '',
      minimoInclusivo: null,
      valorMaximo: '',
      maximoInclusivo: null,
      ...(fields.campos || {})
    },
    camposManuais: [...(fields.camposManuais || [])],
    pendenciasRemotas: clonePlain(fields.pendenciasRemotas || []),
    metadadosRecebidos: clonePlain(fields.metadadosRecebidos || {}),
    revisaoLocal: Number.isInteger(fields.revisaoLocal) ? fields.revisaoLocal : 0,
    artefatosDesatualizados: Boolean(fields.artefatosDesatualizados)
  }
}

export function createCampaignProposalForm() {
  return {
    titulo: '',
    tituloSugerido: '',
    textoOriginal: '',
    dataInicio: '',
    dataFim: '',
    propostas: [],
    pendenciasCampanha: [],
    revisaoLocal: 0
  }
}

export function createPending({
  codigo,
  mensagem,
  clientId = null,
  campo = null,
  severidade = 'IMPEDITIVO',
  escopo = campo ? 'CAMPO' : clientId ? 'PROPOSTA' : 'CAMPANHA',
  origem = 'LOCAL',
  camposRelacionados = campo ? [campo] : [],
  exigeValidacaoRemota = false,
  id
}) {
  return {
    id: id || [origem, codigo, clientId || 'campaign', campo || 'general'].join(':'),
    codigo: codigo || 'PENDENCIA_SEM_CLASSIFICACAO',
    severidade: severidade === 'AVISO' ? 'AVISO' : 'IMPEDITIVO',
    escopo,
    clientId,
    campo,
    mensagem: String(mensagem || 'Esta pendência precisa ser revisada.'),
    origem,
    camposRelacionados: [...camposRelacionados],
    exigeValidacaoRemota: Boolean(exigeValidacaoRemota)
  }
}

export function clonePlain(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value)) return seen.get(value)

  const copy = Array.isArray(value) ? [] : {}
  seen.set(value, copy)
  Object.keys(value).forEach((key) => {
    copy[key] = clonePlain(value[key], seen)
  })
  return copy
}

export function isProposalBlank(proposal) {
  if (!proposal || proposal.origem !== 'manual' || proposal.serverId || Object.keys(proposal.metadadosRecebidos || {}).length) return false
  const values = Object.entries(proposal?.campos || {})
    .filter(([key]) => key !== 'publicoTodasVendas' && !key.endsWith('Inclusivo'))
    .map(([, value]) => String(value ?? '').trim())
  return values.every((value) => value === '') &&
    !proposal?.campos?.publicoTodasVendas &&
    !(proposal?.pendenciasRemotas || []).length &&
    !proposal?.textoOrigem
}

export function hasCampaignContent(campaign) {
  return Boolean(
    String(campaign?.titulo || '').trim() ||
    String(campaign?.textoOriginal || '').trim() ||
    campaign?.dataInicio ||
    campaign?.dataFim ||
    (campaign?.propostas || []).length
  )
}
