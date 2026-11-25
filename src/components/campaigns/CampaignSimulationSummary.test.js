import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, createRenderer, nextTick, ssrContextKey, reactive } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignSimulationSummary from './CampaignSimulationSummary.vue'
import CampaignAcceptedSimulation from './CampaignAcceptedSimulation.vue'

const { simulation } = vi.hoisted(() => ({ simulation: vi.fn() }))
vi.mock('@/services/campaignLifecycleApi', () => ({ createCampaignLifecycleApi: () => ({ simulation }) }))
const fixture = () => ({ id: 'accepted', campanhaId: 5, competencia: '2025-11', totalVendasRecortadas: 336,
  dataInicioCampanha: '2025-12-01', dataFimCampanha: '2025-12-31',
  cenario100: { comissaoProjetada: 44937.23, deltaProjetado: 16473.65, totalComissaoProposta: 43487.66,
    enquadramento: { orcamentoTeto: 45000, dentroDoOrcamento: true, saldoOrcamento: 62.77 } },
  cenario80: { comissaoProjetada: 35949.78 }, cenario120: { comissaoProjetada: 53924.55, enquadramento: { dentroDoOrcamento: false } },
  cenario150: { comissaoProjetada: 67405.87 }
})

// Minimal host to exercise asynchronous loading without a browser dependency.
function mount(campaign) {
  const renderer = createRenderer({
    createElement: () => ({ children: [] }), createText: text => ({ text }), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, patchProp: () => {},
    insert: (child, parent) => { child.parent = parent; parent.children.push(child) },
    remove: node => { if (node.parent) node.parent.children = node.parent.children.filter(child => child !== node) },
    parentNode: node => node.parent, nextSibling: () => null
  })
  const app = renderer.createApp(CampaignAcceptedSimulation, { campaign })
  app.provide(ssrContextKey, { modules: new Set() })
  const vm = app.mount({ children: [] })
  return { app, state: vm.$.setupState }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await nextTick() }

describe('accepted simulation in campaign details', () => {
  it('shows saved projections, reference competence, budget and scenarios', async () => {
    const html = await renderToString(createSSRApp(CampaignSimulationSummary, { simulation: fixture() }))
    for (const value of ['11/2025', '336', '44.937,23', '28.463,58', '43.487,66', '16.473,65', '45.000,00', '62,77', '53.924,55', 'Dentro do orçamento', 'Acima do orçamento']) expect(html).toContain(value)
    expect(html).toContain('Os resultados reais podem variar')
  })
  it('does not replace missing amounts with zero', async () => {
    const html = await renderToString(createSSRApp(CampaignSimulationSummary, { simulation: { cenario100: {} } }))
    expect(html).toContain('Não informado'); expect(html).not.toContain('R$')
  })
  it('loads only the accepted simulation and rejects a result from another campaign', async () => {
    simulation.mockResolvedValueOnce(fixture())
    const first = mount({ id: 5, simulacaoAceitaId: 'accepted', versaoVigente: 1 })
    await settle()
    expect(simulation).toHaveBeenLastCalledWith('accepted')
    expect(first.state.simulation.cenario100.comissaoProjetada).toBe(44937.23)
    first.app.unmount()
    simulation.mockResolvedValueOnce({ ...fixture(), campanhaId: 6 })
    const other = mount({ id: 5, simulacaoAceitaId: 'accepted' })
    await settle()
    expect(other.state.simulation).toBeNull(); expect(other.state.error).toContain('Não foi possível consultar')
    other.app.unmount()
  })
  it('discards a delayed response when the accepted simulation changes', async () => {
    let resolveOld
    simulation.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const campaign = reactive({ id: 5, simulacaoAceitaId: 'old' })
    const view = mount(campaign)
    simulation.mockResolvedValueOnce(fixture())
    campaign.simulacaoAceitaId = 'accepted'
    await settle()
    resolveOld({ ...fixture(), id: 'old' })
    await settle()
    expect(view.state.simulation.id).toBe('accepted')
    view.app.unmount()
  })
  it('preserves an honest empty state or error instead of fabricating results', async () => {
    simulation.mockClear()
    const empty = mount({ id: 5 })
    await settle(); expect(simulation).not.toHaveBeenCalled(); expect(empty.state.simulation).toBeNull()
    empty.app.unmount()
    simulation.mockRejectedValueOnce(new Error('offline'))
    const failed = mount({ id: 5, simulacaoAceitaId: 'accepted' })
    await settle(); expect(failed.state.error).toContain('Tente novamente'); expect(failed.state.simulation).toBeNull()
    failed.app.unmount()
  })
})
