import api from './api'
import { BACKEND_EDIT_FIELDS } from './campaignRuleArtifacts'
import { normalizeInterpretationError } from './campaignInterpretationService'
import { createCampaignLifecycleApi } from './campaignLifecycleApi'
import { proposalToBackend } from './campaignProposalMappers'

export const PROPOSAL_INTERPRETATION_TIMEOUT = 75000
export const PROPOSAL_VALIDATION_TIMEOUT = 30000

function referenceDate() {
  const now = new Date()
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')
}

export function createCampaignProposalApiClient(http = api) {
  async function post(path, payload, signal, timeout) {
    try {
      return (await http.post('/interpretador/' + path, payload, { signal, timeout })).data
    } catch (error) {
      if (signal?.aborted || error?.code === 'ERR_CANCELED') throw error
      const normalized = normalizeInterpretationError(error)
      throw new Error(normalized.message, { cause: error })
    }
  }
  const lifecycle = createCampaignLifecycleApi(http)
  return {
    saveDraft: ({ id, payload }) => lifecycle.save(id, payload),
    simulateCampaign: ({ campanhaId, competencia }) => lifecycle.simulate(campanhaId, competencia),
    interpretCampaign(input, { signal } = {}) {
      return post('extrair-propostas', { texto: input.descricao, contexto: { dataReferencia: referenceDate() } }, signal, PROPOSAL_INTERPRETATION_TIMEOUT)
    },
    reinterpretRule(input, { signal } = {}) {
      const contexto = { dataReferencia: referenceDate() }
      if (input.campanha.dataInicio && input.campanha.dataFim) contexto.vigenciaCampanha = { inicio: input.campanha.dataInicio, fim: input.campanha.dataFim }
      return post('extrair-propostas', { texto: input.texto, contexto }, signal, PROPOSAL_INTERPRETATION_TIMEOUT)
    },
    updateArtifacts({ proposal, campaign }, { signal } = {}) {
      return post('atualizar-artefatos', { proposta: proposalToBackend(proposal, campaign), camposEditados: proposal.camposManuais.map((field) => BACKEND_EDIT_FIELDS[field] || field) }, signal, PROPOSAL_VALIDATION_TIMEOUT)
    },
    validateCampaign({ proposal, campaign, rate }, { signal } = {}) {
      const dto = proposalToBackend(proposal, campaign)
      return post('validar-proposta', { campanhaId: campaign.id || null, ...dto.filtros, taxa: rate === undefined ? dto.taxaFinal : rate,
        dataInicio: dto.vigencia.dataInicio, dataFim: dto.vigencia.dataFim }, signal, PROPOSAL_VALIDATION_TIMEOUT)
    }
  }
}
