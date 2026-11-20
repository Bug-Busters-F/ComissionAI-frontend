import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia } from 'pinia'
import Home from './HomeView.vue'
import { useAccountStore } from '../stores/accountStore'
import { indicatorsFixture } from '../services/homeDashboardTestFixtures'

let state
vi.mock('../services/homeDashboardState', () => ({ createHomeDashboardState: () => state }))

beforeEach(() => {
  state = {
    indicators: ref(indicatorsFixture()), campaigns: ref([{ id: 8, titulo: 'Campanha real', estado: 'DRAFT', dataInicio: '2025-07-01', dataFim: '2025-07-31' }]),
    indicatorsLoading: ref(false), campaignsLoading: ref(false), indicatorsError: ref(''), campaignsError: ref(''),
    refresh: vi.fn(), reset: vi.fn(), dispose: vi.fn(), loadIndicators: vi.fn(), loadCampaigns: vi.fn()
  }
})

async function render(role = 'ADMINISTRADOR') {
  const pinia = createPinia()
  useAccountStore(pinia).user = { id: 1, role, permissions: role === 'ADMINISTRADOR' ? ['ACESSO_COMPLETO'] : ['EDITAR_CAMPANHAS'] }
  const app = createSSRApp(Home)
  app.use(pinia)
  app.component('RouterLink', defineComponent({ props: ['to'], setup: (props, { slots }) => () => h('a', { 'data-destination': JSON.stringify(props.to) }, slots.default?.()) }))
  return renderToString(app)
}

describe('Home real: apresentação', () => {
  it('mostra totais do resumo, campanhas e alertas reais, sem aviso fixo de dezembro', async () => {
    const html = await render()
    expect(html).toContain('6</p>')
    expect(html).toContain('12</p>')
    expect(html).toContain('9</p>')
    expect(html).toContain('Campanha real')
    expect(html).toContain('Orçamento a confirmar')
    expect(html).toContain('2 execução(ões) de cálculo com falha.')
    expect(html).not.toContain('Dezembro tem pendências')
    expect(html).not.toContain('/api/v1/')
    expect(state.refresh).toHaveBeenCalledOnce()
  })
  it('não mostra métricas ou ações como disponíveis enquanto carrega', async () => {
    state.indicatorsLoading.value = true; state.campaignsLoading.value = true
    const html = await render()
    expect(html).toContain('Carregando indicadores')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Orçamento a confirmar')
    expect(html).not.toContain('Campanha real')
    expect(html).not.toContain('Nenhuma campanha cadastrada')
  })
  it('falha nos indicadores não oculta campanhas nem mostra totais antigos como atuais', async () => {
    state.indicatorsError.value = 'Não foi possível carregar os indicadores. Tente novamente.'
    const html = await render()
    expect(html).toContain('Tentar novamente')
    expect(html).toContain('Campanha real')
    expect(html).not.toContain('Orçamento a confirmar')
    expect(html).not.toContain('Atualizado em')
    expect(html).not.toContain('Sem alertas operacionais')
  })
  it('distingue ausência de campanhas de erro e não oferece ações ao auditor', async () => {
    state.campaigns.value = []
    const html = await render('AUDITOR')
    expect(html).toContain('Nenhuma campanha cadastrada')
    expect(html).toContain('Nenhuma ação disponível para o seu perfil')
    expect(html).not.toContain('Nova campanha')
    expect(html).not.toContain('Revisar código')
    state.campaignsError.value = 'Não foi possível carregar as campanhas recentes.'
    const failed = await render('AUDITOR')
    expect(failed).not.toContain('Nenhuma campanha cadastrada')
    expect(failed).toContain('Tentar novamente')
  })
  it('zero legítimo não é substituído por exemplo e processamento não aparece como falha', async () => {
    const raw = indicatorsFixture()
    for (const group of ['competencias', 'campanhas', 'pendencias', 'alertas']) {
      for (const key of Object.keys(raw[group])) raw[group][key] = 0
    }
    raw.alertas.fechamentosEmProcessamento = 1
    raw.aguardandoAcao = []
    state.indicators.value = raw
    const html = await render()
    expect(html).toContain('0</p>')
    expect(html).toContain('Sem alertas operacionais')
    expect(html).toContain('1 fechamento(s) em processamento.')
    expect(html).not.toContain('Pontos de atenção')
  })
})
