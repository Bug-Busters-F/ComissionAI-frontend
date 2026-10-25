import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Review from '../components/campaigns/CampaignProposalReviewSummary.vue'
import Progress from '../components/common/CampaignStepNav.vue'
import Impact from '../components/campaigns/CampaignImpactSummary.vue'
import { campaignFixture, savedResponse } from './campaignLifecycleTestFixtures'
import { campaignToDraftRequest, persistedCampaignToProposal } from './campaignProposalPersistence'
import { validateCampaignProposalSet } from './campaignProposalValidation'
import { ruleArtifactSignature, ruleArtifactsCurrent } from './campaignRuleArtifacts'
import { describeFieldOrigin } from './campaignFieldOrigins'
const render = (component, props) => renderToString(createSSRApp(component, props))

describe('review artifacts and traceability', () => {
  it('preserves real origins, manual values, references, warnings and audience consent across a reload', () => {
    const c = campaignFixture(), p = c.propostas[0]
    p.campos.publicoTodasVendas = true
    p.camposManuais = ['taxaPercentual']
    p.metadadosRecebidos.origensPorCampo = { canal: 'TEXTO', dataInicio: 'CONTEXTO' }
    p.metadadosRecebidos.referenciasConsultadas = [{ tipo: 'BASE_COMISS', identificador: '10/100', descricao: 'Base julho' }]
    p.pendenciasRemotas = [{ id: 'artefatos:AVISO:one', campo: 'canal', codigo: 'AVISO', mensagem: 'Verifique', severidade: 'AVISO', origem: 'BACKEND' }]
    const reloaded = persistedCampaignToProposal(savedResponse(c)).propostas[0]
    expect(reloaded.camposManuais).toEqual(['taxaPercentual'])
    expect(reloaded.campos.publicoTodasVendas).toBe(true)
    expect(describeFieldOrigin(reloaded, 'canal')).toBe('Texto informado.')
    expect(describeFieldOrigin(reloaded, 'dataInicio')).toContain('Vigência herdada')
    expect(describeFieldOrigin(reloaded, 'taxaPercentual')).toContain('Edição manual')
    expect(reloaded.metadadosRecebidos.referenciasConsultadas).toHaveLength(1)
    expect(reloaded.pendenciasRemotas[0]).toMatchObject({ id: 'artefatos:AVISO:one', severidade: 'AVISO', campo: 'canal' })
  })
  it('never displays or persists artifacts for a different set of fields, even if an invalidation flag was missed', async () => {
    const c = campaignFixture(), p = c.propostas[0]
    p.metadadosRecebidos.pythonAtualizado = 'def regra_atual(): return 35'
    p.metadadosRecebidos.assinaturaArtefatos = ruleArtifactSignature(p, c)
    let html = await render(Review, { campaign: c, validation: validateCampaignProposalSet(c), showPython: true })
    expect(html).toContain('def regra_atual(): return 35')
    expect(html).not.toContain('Código da campanha'); expect(html).not.toContain('EXEMPLO FIXO')
    p.campos.taxaPercentual = '8'
    expect(ruleArtifactsCurrent(p, c)).toBe(false)
    expect(campaignToDraftRequest(c).regras[0]).toMatchObject({ pythonEquivalente: null, explicacao: null, completa: false })
    html = await render(Review, { campaign: c, validation: validateCampaignProposalSet(c), showPython: true })
    expect(html).not.toContain('def regra_atual()'); expect(html).toContain('código anterior foi ocultado')
    expect(html).not.toContain('Explicação atual')
  })
  it('distinguishes a visited step from the current and future steps after going back', async () => {
    const html = await render(Progress, { steps: [{ key: 'dados', number: 1, label: 'Proposta' }, { key: 'propostas', number: 2, label: 'Interpretação' }, { key: 'simulacao', number: 3, label: 'Simulação' }, { key: 'conferencia', number: 4, label: 'Conferência' }], currentStep: 'propostas', currentStepNumber: 2, reachedStep: 3 })
    expect(html).toContain('aria-current="step"')
    expect(html).not.toContain('Você está aqui'); expect(html).not.toContain('Concluída')
    expect(html).not.toContain('Já visitada'); expect(html).not.toContain('Não iniciada')
    expect(html).not.toContain('bg-brand-dark')
    const buttons = html.match(/<button[\s\S]*?<\/button>/g)
    expect(buttons[1]).not.toContain('disabled')
    expect(buttons[2]).not.toMatch(/disabled(?:[\s=>])/)
    expect(buttons[3]).toMatch(/ disabled(?:[\s=>])/)
  })
  it('shows actual reference and projected comparisons separately and has no fake empty totals', async () => {
    const noResult = await render(Impact, {})
    expect(noResult).toContain('Não há uma simulação aceita'); expect(noResult).not.toContain('R$')
    const html = await render(Impact, { impact: { competencia: '2025-07', protocolo: 'teste-real', totals: { totalVendasConsideradas: 589, duracaoCampanhaDias: 31, fatorDuracaoTexto: '1.033333', historico: { comissaoBase: 100, comissaoProposta: 120, diferenca: 20 }, projetado: { comissaoBase: 103.33, comissaoProposta: 124, diferenca: 20.67 } } } })
    expect(html).toContain('589 vendas'); expect(html).toContain('20,00'); expect(html).toContain('20,67'); expect(html).toContain('2025-07'); expect(html).toContain('teste-real')
  })
})
