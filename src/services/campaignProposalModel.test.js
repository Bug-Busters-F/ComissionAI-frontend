import { describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { clonePlain, createCampaignProposal, createCampaignProposalForm, isProposalBlank } from './campaignProposalModel'

describe('campaign proposal model', () => {
  it('creates distinct stable client identities and keeps matricula as text', () => {
    const first = createCampaignProposal({ campos: { matricula: '001234' } })
    const second = createCampaignProposal()
    expect(first.clientId).not.toBe(second.clientId)
    expect(first.campos.matricula).toBe('001234')
    first.revisaoLocal += 1
    expect(first.clientId).not.toBe('')
  })

  it('deep-copies Vue reactive metadata before creating the integration snapshot', () => {
    const source = reactive({ operations: [{ type: 'fixed', value: '100.00' }] })
    const copy = clonePlain(source)
    expect(copy).toEqual({ operations: [{ type: 'fixed', value: '100.00' }] })
    expect(copy).not.toBe(source)
    expect(copy.operations[0]).not.toBe(source.operations[0])
  })

  it('starts with an empty campaign collection and detects only truly empty proposals', () => {
    const campaign = createCampaignProposalForm()
    const blank = createCampaignProposal()
    expect(campaign.propostas).toEqual([])
    expect(isProposalBlank(blank)).toBe(true)
    expect(isProposalBlank(createCampaignProposal({ campos: { taxaPercentual: '5' } }))).toBe(false)
  })
})
