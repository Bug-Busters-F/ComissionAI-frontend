import { createCampaignProposal, createCampaignProposalForm, createPending, clonePlain } from './campaignProposalModel'
import { proposalToBackend, normalizeExternalPending } from './campaignProposalMappers'
import { ruleArtifactsCurrent, ruleArtifactSignature } from './campaignRuleArtifacts'
import { decimalFractionToPercent, parseDecimalToMinor, validateCampaignCommon, validateCampaignProposalSet } from './campaignProposalValidation'

const codes = ['codMarca', 'codCargo', 'codLoja']
const text = (value) => value == null ? '' : String(value)
const present = (value) => value !== '' && value !== null && value !== undefined

// Business incompleteness may be persisted; an invalid numeric value must never become null.
export function validateDraftForPersistence(campaign) {
  const problems = validateCampaignCommon({ ...campaign, pendenciasCampanha: [] }).pending.map((p) => p.mensagem)
  if (!campaign.propostas.length) problems.push('Adicione ao menos uma regra para salvar o rascunho.')
  for (const [index, p] of campaign.propostas.entries()) {
    const f = p.campos
    for (const key of codes) if (present(f[key]) && (!/^\d+$/.test(String(f[key])) || Number(f[key]) > 2147483647)) problems.push(`Regra ${index + 1}: código inválido em ${key}.`)
    for (const key of ['taxaPercentual', 'valorMinimo', 'valorMaximo']) {
      if (present(f[key]) && !Number.isFinite(parseDecimalToMinor(f[key], 2))) problems.push(`Regra ${index + 1}: corrija o número em ${key} antes de salvar.`)
    }
    if (present(f.valorMinimo) && present(f.valorMaximo) && parseDecimalToMinor(f.valorMinimo) > parseDecimalToMinor(f.valorMaximo)) problems.push(`Regra ${index + 1}: o mínimo não pode superar o máximo.`)
  }
  const periods = campaign.propostas.map((p) => p.metadadosRecebidos.vigenciaRecebida).filter(Boolean)
  const hasDivergentPeriods = ['dataInicio', 'dataFim'].some((field) => new Set(periods.map((p) => p[field]).filter(Boolean)).size > 1)
  if (hasDivergentPeriods) problems.push('As regras têm vigências divergentes. Corrija o texto e interprete novamente antes de salvar.')
  return [...new Set(problems)]
}

function pendingMessage(p, campaign = false) {
  return `[${campaign ? 'Campanha ' : ''}${p.severidade === 'AVISO' ? 'Aviso' : 'Impeditiva'}] ${p.mensagem}`
}

export function campaignToDraftRequest(campaign) {
  const validation = validateCampaignProposalSet(campaign)
  return {
    titulo: campaign.titulo.trim(), textoOriginal: campaign.textoOriginal, dataInicio: campaign.dataInicio || null, dataFim: campaign.dataFim || null, estado: 'DRAFT',
    regras: campaign.propostas.map((p, index) => {
      const dto = proposalToBackend(p, campaign)
      const m = p.metadadosRecebidos
      const operation = dto.operacaoBase || {}
      const base = operation.referenciaBase || {}
      const currentArtifacts = ruleArtifactsCurrent(p, campaign)
      return {
        blocoId: p.clientId, trechoOrigem: p.textoOrigem || null, nome: m.nomePersistido || `Regra ${index + 1}`,
        ...dto.filtros, ...dto.condicaoValor,
        tipoOperacao: operation.tipoOperacao || 'DEFINIR_TAXA', valorAjuste: operation.valorAjuste ?? null,
        tipoBaseReferencia: base.tipoBase ?? null, taxaBaseConsultada: base.taxaBaseConsultada ?? null, descricaoReferencia: base.descricao ?? null,
        taxa: dto.taxaFinal, explicacao: currentArtifacts ? m.explicacao || null : null,
        // Only artifacts matching the current fields may be persisted.
        pythonEquivalente: currentArtifacts ? m.pythonAtualizado || null : null,
        pendencias: [...p.pendenciasRemotas.map((item) => pendingMessage(item)), ...campaign.pendenciasCampanha.filter((item) => !(item.codigo === 'VIGENCIA_NAO_CONSOLIDADA' && (!campaign.dataInicio || !campaign.dataFim))).map((item) => pendingMessage(item, true))],
        completa: currentArtifacts && dto.taxaFinal !== null && !validation.blockers.some((item) => !item.clientId || item.clientId === p.clientId),
        rastreabilidade: { origensPorCampo: m.origensDesatualizadas ? {} : m.origensPorCampo || {},
          referenciasConsultadas: m.origensDesatualizadas ? [] : m.referenciasConsultadas || [],
          camposManuais: p.camposManuais, publicoTodasVendas: p.campos.publicoTodasVendas, artefatosAtualizados: currentArtifacts,
          pendencias: p.pendenciasRemotas.map((item) => ({ ...item, severidade: item.severidade === 'AVISO' ? 'AVISO' : 'IMPEDIMENTO' })),
          pendenciasCampanha: campaign.pendenciasCampanha.map((item) => ({ ...item, severidade: item.severidade === 'AVISO' ? 'AVISO' : 'IMPEDIMENTO' })) },
        status: 'DRAFT', bonusPercentual: dto.bonusPercentual, bonusValorFixo: dto.bonusValorFixo
      }
    })
  }
}

export function draftFingerprint(campaign) {
  // Include the explicit audience confirmation even though today's backend has no column for it.
  return JSON.stringify({ payload: campaignToDraftRequest(campaign), audiences: campaign.propostas.map((p) => [p.clientId, p.campos.publicoTodasVendas]) })
}

export function persistedCampaignToProposal(raw, previous = null) {
  if (!raw?.id || !Array.isArray(raw.regras)) throw new Error('O backend não retornou uma campanha com a coleção de regras. Os dados atuais foram preservados.')
  if (!raw.dataInicio || !raw.dataFim || validateCampaignCommon({ titulo: raw.titulo, textoOriginal: raw.textoOriginal, dataInicio: raw.dataInicio, dataFim: raw.dataFim }).pending.length) throw new Error('O backend não confirmou o título, o texto e a vigência persistida. Os dados atuais foram preservados.')
  const dbIds = raw.regras.map((r) => r.id)
  if (new Set(dbIds).size !== dbIds.length) throw new Error('A resposta repetiu o identificador de uma regra persistida. Os dados atuais foram preservados.')
  const clientIds = new Set()
  const result = { ...createCampaignProposalForm(), id: raw.id, estado: raw.estado, titulo: raw.titulo || '', textoOriginal: raw.textoOriginal || '', dataInicio: raw.dataInicio || '', dataFim: raw.dataFim || '' }
  const general = new Map()
  result.propostas = raw.regras.map((r) => {
    if (!r.id) throw new Error('Uma regra persistida veio sem identificador. Consulte a campanha antes de repetir o salvamento.')
    const prior = previous?.propostas.find((p) => p.clientId === r.blocoId)
    const evidence = r.rastreabilidade
    let clientId = prior?.clientId || r.blocoId || `persisted-${r.id}`
    if (clientIds.has(clientId)) clientId = `persisted-${r.id}`
    clientIds.add(clientId)
    const changedDates = previous && (previous.dataInicio !== result.dataInicio || previous.dataFim !== result.dataFim)
    const fields = Object.fromEntries(['codMarca', 'descrMarca', 'codCargo', 'descriCargo', 'codLoja', 'canal', 'matricula'].map((key) => [key, text(r[key])]))
    Object.assign(fields, { taxaPercentual: r.taxa == null ? '' : decimalFractionToPercent(r.taxa).replace('.', ','), valorMinimo: text(r.valorMinimo), minimoInclusivo: r.minInclusivo ?? null, valorMaximo: text(r.valorMaximo), maximoInclusivo: r.maxInclusivo ?? null, publicoTodasVendas: evidence?.publicoTodasVendas ?? prior?.campos.publicoTodasVendas ?? false })
    const pending = evidence ? evidence.pendencias.map((p) => normalizeExternalPending({ ...p, origem: 'BACKEND' }, clientId)) : prior ? clonePlain(prior.pendenciasRemotas) : []
    for (const p of evidence?.pendenciasCampanha || []) general.set(p.codigo + ':' + p.mensagem, normalizeExternalPending({ ...p, origem: 'BACKEND' }))
    if (!evidence && !prior && r.pendencias) {
      const messages = Array.isArray(r.pendencias) ? r.pendencias : String(r.pendencias).split(/; (?=\[(?:Campanha )?(?:Aviso|Impeditiva)\])/)
      for (const [index, value] of messages.entries()) {
        const match = value.match(/^\[(Campanha )?(Aviso|Impeditiva)\]\s*([\s\S]*)$/)
        const p = createPending({ clientId: match?.[1] ? null : clientId, codigo: 'PERSISTIDA_NAO_REAVALIADA', id: `persisted:${r.id}:${index}`, origem: 'BACKEND', severidade: match?.[2] === 'Aviso' ? 'AVISO' : 'IMPEDITIVO', mensagem: match?.[3] || value })
        if (match?.[1]) general.set(p.mensagem, p)
        else pending.push(p)
      }
    }
    const proposal = createCampaignProposal({ ...(prior ? clonePlain(prior) : {}), clientId, serverId: r.id, origem: prior?.origem || 'interpretacao', textoOrigem: r.trechoOrigem || '', campos: fields,
      camposManuais: evidence?.camposManuais || prior?.camposManuais || [],
      pendenciasRemotas: pending, artefatosDesatualizados: Boolean(changedDates || prior?.artefatosDesatualizados || (evidence && !evidence.artefatosAtualizados)),
      metadadosRecebidos: { ...(prior ? clonePlain(prior.metadadosRecebidos) : {}), nomePersistido: r.nome,
        origensPorCampo: evidence?.origensPorCampo || prior?.metadadosRecebidos.origensPorCampo || {},
        referenciasConsultadas: evidence?.referenciasConsultadas || prior?.metadadosRecebidos.referenciasConsultadas || [],
        origensDesatualizadas: false, artefatosLegados: !evidence,
        explicacao: r.explicacao || '', pythonAtualizado: r.pythonEquivalente || null, completa: r.completa,
        validacaoPendente: changedDates ? true : evidence ? !evidence.artefatosAtualizados : prior ? prior.metadadosRecebidos.validacaoPendente : true,
        bonusPercentual: r.bonusPercentual ?? null, bonusValorFixo: r.bonusValorFixo ?? null,
        operacaoBase: { tipoOperacao: r.tipoOperacao || 'DEFINIR_TAXA', valorAjuste: r.valorAjuste ?? r.taxa, referenciaBase: r.tipoBaseReferencia || r.taxaBaseConsultada != null || r.descricaoReferencia ? { tipoBase: r.tipoBaseReferencia, taxaBaseConsultada: r.taxaBaseConsultada, descricao: r.descricaoReferencia } : null }
      }
    })
    if (evidence?.artefatosAtualizados) proposal.metadadosRecebidos.assinaturaArtefatos = ruleArtifactSignature(proposal, result)
    return proposal
  })
  result.pendenciasCampanha = previous ? clonePlain(previous.pendenciasCampanha) : [...general.values()]
  if (previous && (!previous.dataInicio || !previous.dataFim) && result.dataInicio && result.dataFim) {
    result.pendenciasCampanha = result.pendenciasCampanha.filter((p) => p.codigo !== 'VIGENCIA_NAO_CONSOLIDADA')
  }
  return result
}
