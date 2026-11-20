import { describe, it, expect, vi } from 'vitest'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import HomeAnomaliesCard from './HomeAnomaliesCard.vue'
import { pickActiveCampaignCompetence, currentCompetence } from '@/services/statisticalAlertsLogic'
import { loadHomeAnomalySummary } from '@/services/statisticalAlertsApi'

function render(props) {
  const app = createSSRApp(HomeAnomaliesCard, props)
  app.component('RouterLink', defineComponent({ props: ['to'], setup: (p, { slots }) => () => h('a', { href: p.to }, slots.default?.()) }))
  return renderToString(app)
}

describe('HomeAnomaliesCard — sinalização de alertas estatísticos na Home (FRONT-6)', () => {
  it('mostra contadores, limiar |Z| ≥ 3, link para campanhas e selo de novos casos em 48h', async () => {
    const html = await render({
      initialSummary: { competencia: '2025-08', hasNewCases48h: true, totalOutliers: 3, totalInconsistencias: 1, totalGeral: 4, loading: false, error: '' }
    })
    expect(html).toContain('Alertas Estatísticos e Anomalias de Vendas')
    expect(html).toContain('href="/campanhas"')
    expect(html).toContain('08/2025')
    expect(html).toContain('|Z| ≥ 3')
    expect(html).toContain('>3</strong> anomalia(s)')
    expect(html).toContain('>1</strong> inconsistência(s)')
    expect(html).toContain('Novos casos nas últimas 48h')
  })

  it('erro nunca aparece como contador zerado e oferece nova tentativa', async () => {
    const html = await render({ initialSummary: { competencia: '2025-08', loading: false, error: 'Serviço indisponível' } })
    expect(html).toContain('Não foi possível carregar os alertas: Serviço indisponível')
    expect(html).toContain('Tentar novamente')
    expect(html).not.toContain('anomalia(s) estatística(s)')
    expect(html).not.toContain('Novos casos nas últimas 48h')
  })

  it('mostra estado de carregamento sem selo antes de consultar a API', async () => {
    const apiClient = { listAlerts: vi.fn(), checkNewCases48h: vi.fn(), countAlertsByType: vi.fn() }
    const html = await render({ apiClient, campaignsLoading: true })
    expect(html).toContain('Carregando alertas estatísticos')
    expect(html).toContain('aria-busy="true"')
    expect(html).not.toContain('Novos casos nas últimas 48h')
    expect(apiClient.countAlertsByType).not.toHaveBeenCalled()
  })

})

describe('loadHomeAnomalySummary — escolha da competência e consulta', () => {
  const makeApi = (latest = null) => ({
    listAlerts: vi.fn().mockResolvedValue({ content: latest ? [latest] : [] }),
    checkNewCases48h: vi.fn().mockResolvedValue({ hasNewCases48h: true }),
    countAlertsByType: vi.fn().mockResolvedValue({ totalOutliers: 2, totalInconsistencias: 1, totalGeral: 5 })
  })

  it('usa a campanha ATIVA mais recente sem consultar o último alerta', async () => {
    const api = makeApi()
    const res = await loadHomeAnomalySummary(api, { campaigns: [{ estado: 'ATIVA', dataInicio: '2025-09-01' }] })
    expect(api.listAlerts).not.toHaveBeenCalled()
    expect(api.countAlertsByType).toHaveBeenCalledWith({ competencia: '2025-09' })
    expect(api.checkNewCases48h).toHaveBeenCalledWith('2025-09')
    expect(res).toEqual({ competencia: '2025-09', hasNewCases48h: true, totalOutliers: 2, totalInconsistencias: 1, totalGeral: 5 })
  })

  it('sem campanha ativa usa a competência do último alerta registrado', async () => {
    const api = makeApi({ dataReferencia: '2025-07-14' })
    const res = await loadHomeAnomalySummary(api, { campaigns: [{ estado: 'DRAFT', dataInicio: '2025-12-01' }] })
    expect(api.listAlerts).toHaveBeenCalledWith({ size: 1, sort: 'dataReferencia,desc' })
    expect(res.competencia).toBe('2025-07')
  })

  it('sem campanha ativa nem alertas usa o mês corrente; competência informada tem prioridade', async () => {
    expect((await loadHomeAnomalySummary(makeApi(), { now: new Date(2026, 10, 20) })).competencia).toBe('2026-11')
    const api = makeApi()
    expect((await loadHomeAnomalySummary(api, { competence: '2025-08', campaigns: [{ estado: 'ATIVA', dataInicio: '2025-09-01' }] })).competencia).toBe('2025-08')
  })
})

describe('competência do card da Home', () => {
  it('prioriza a campanha ATIVA de início mais recente e ignora outros estados', () => {
    expect(pickActiveCampaignCompetence([
      { estado: 'ATIVA', dataInicio: '2025-07-01' },
      { estado: 'ATIVA', dataInicio: '2025-09-15' },
      { estado: 'DRAFT', dataInicio: '2025-12-01' }
    ])).toBe('2025-09')
    expect(pickActiveCampaignCompetence([{ estado: 'DRAFT', dataInicio: '2025-12-01' }])).toBe('')
    expect(pickActiveCampaignCompetence(null)).toBe('')
  })

  it('usa o mês corrente como último recurso', () => {
    expect(currentCompetence(new Date(2026, 10, 20))).toBe('2026-11')
    expect(currentCompetence(new Date(2026, 0, 5))).toBe('2026-01')
  })
})
