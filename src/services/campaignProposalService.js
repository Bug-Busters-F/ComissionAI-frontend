import { getCampaignProposalFixture } from './campaignProposalFixtures'
import { reinterpretRuleDemo } from './ruleReinterpretationDemo'

export class CampaignProposalIntegrationUnavailableError extends Error {
  constructor(action) {
    super('Esta operação ainda não está integrada ao serviço de campanhas.')
    this.name = 'CampaignProposalIntegrationUnavailableError'
    this.code = 'CAMPAIGN_PROPOSAL_INTEGRATION_UNAVAILABLE'
    this.action = action
  }
}

function defaultMode() {
  const configured = import.meta.env?.VITE_CAMPAIGN_PROPOSALS_MODE
  return ['manual', 'demo', 'api'].includes(configured) ? configured : 'manual'
}

function unavailable(action) {
  throw new CampaignProposalIntegrationUnavailableError(action)
}

export function createCampaignProposalProvider({ mode = defaultMode(), client = null } = {}) {
  const safeMode = ['manual', 'demo', 'api'].includes(mode) ? mode : 'manual'
  const capabilities = safeMode === 'api' && client
    ? {
        interpret: typeof client.interpretCampaign === 'function',
        reinterpret: typeof client.reinterpretRule === 'function',
        validate: typeof client.validateCampaign === 'function',
        artifacts: typeof client.updateArtifacts === 'function',
        persist: typeof client.saveDraft === 'function',
        simulate: typeof client.simulateCampaign === 'function',
        examples: false
      }
    : {
        interpret: false,
        reinterpret: safeMode === 'demo',
        validate: false,
        artifacts: false,
        persist: false,
        simulate: false,
        examples: safeMode === 'demo'
      }

  return Object.freeze({
    mode: safeMode,
    capabilities,
    loadExample(key) {
      if (safeMode !== 'demo') return unavailable('loadExample')
      return getCampaignProposalFixture(key)
    },
    interpretCampaign(input, options = {}) {
      if (!capabilities.interpret) return unavailable('interpretCampaign')
      return client.interpretCampaign(input, options)
    },
    reinterpretRule(input, options = {}) {
      if (!capabilities.reinterpret) return unavailable('reinterpretRule')
      return safeMode === 'demo' ? reinterpretRuleDemo(input, options) : client.reinterpretRule(input, options)
    },
    updateArtifacts(input, options = {}) {
      if (!capabilities.artifacts) return unavailable('updateArtifacts')
      return client.updateArtifacts(input, options)
    },
    validateCampaign(input, options = {}) {
      if (!capabilities.validate) return unavailable('validateCampaign')
      return client.validateCampaign(input, options)
    },
    saveDraft(input, options = {}) {
      if (!capabilities.persist) return unavailable('saveDraft')
      return client.saveDraft(input, options)
    },
    simulateCampaign(input, options = {}) {
      if (!capabilities.simulate) return unavailable('simulateCampaign')
      return client.simulateCampaign(input, options)
    }
  })
}
