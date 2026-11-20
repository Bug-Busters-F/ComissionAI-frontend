import { describe, it, expect, vi } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignAnomaliesSection from './CampaignAnomaliesSection.vue'
import { TIPO_ALERTA, GRUPO_SEM_VENDAS, METODO_LEAVE_ONE_OUT } from '@/services/statisticalAlertsLogic'

// Fixtures no formato real de AlertaEstatisticoResponse (AlertaEstatisticoService.java)
const mockAlerts = {
  content: [
    {
      id: 'alerta-1',
      lotePreparacaoId: 'lote-vendas-1',
      tipo: TIPO_ALERTA.OUTLIER_VENDA,
      dataReferencia: '2025-08-15',
      matricula: '1001',
      grupoComparavel: '2025-08|loja=1|cargo=10|marca=100',
      tamanhoAmostra: 10,
      valorObservado: 15000,
      mediaGrupo: 4000,
      desvioPadrao: 1000,
      score: 11.0,
      metodo: METODO_LEAVE_ONE_OUT
    },
    {
      id: 'alerta-2',
      lotePreparacaoId: 'lote-rh-1',
      tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH,
      dataReferencia: '2025-08-01',
      matricula: '2002',
      grupoComparavel: GRUPO_SEM_VENDAS,
      tamanhoAmostra: 0,
      valorObservado: null,
      mediaGrupo: null,
      desvioPadrao: null,
      score: null,
      metodo: METODO_LEAVE_ONE_OUT
    },
    {
      id: 'alerta-3',
      lotePreparacaoId: 'lote-vendas-1',
      tipo: TIPO_ALERTA.AMOSTRA_INSUFICIENTE,
      dataReferencia: '2025-08-10',
      matricula: '3003',
      grupoComparavel: '2025-08|loja=3|cargo=30|marca=300',
      valorObservado: 800,
      mediaGrupo: null,
      desvioPadrao: null,
      score: null,
      tamanhoAmostra: 2,
      metodo: METODO_LEAVE_ONE_OUT
    }
  ],
  totalElements: 3,
  totalPages: 1,
  number: 0,
  size: 20
}

const effectiveLots = [
  { id: 'lote-vendas-1', tipoBase: 'SALES', status: 'EFETIVADO', nomeArquivo: 'vendas_ago.xlsx', efetivadoEm: '2025-09-02T13:30:00Z' },
  { id: 'lote-rascunho', tipoBase: 'SALES', status: 'EM_PREPARACAO', nomeArquivo: 'rascunho.xlsx' }
]

const campaign = { id: 1, titulo: 'Campanha Teste', dataInicio: '2025-08-01', dataFim: '2025-08-31' }

function render(props) {
  return renderToString(createSSRApp(CampaignAnomaliesSection, props))
}

describe('CampaignAnomaliesSection Component — Tabela e Estados de UI (FRONT-6)', () => {
  it('renderiza os 3 tipos de alerta com badges distintos e explicações contextuais via SSR', async () => {
    const html = await render({ initialAlerts: mockAlerts, competence: '2025-08', campaign })

    expect(html).toContain('Anomalia Estatística')
    expect(html).toContain('Inconsistência de Carga')
    expect(html).toContain('Amostra Insuficiente')

    expect(html).toContain('1001')
    expect(html).toContain('2002')
    expect(html).toContain('3003')

    expect(html).toContain('Loja 1 · Cargo 10 · Marca 100')
    expect(html).toContain('Loja 3 · Cargo 30 · Marca 300')

    expect(html).toContain('15.000,00')
    expect(html).toContain('Faixa estimada (±3σ)')
    expect(html).toContain('Sem vendas')

    expect(html).toContain('|Z| = 11,00')
    expect(html).toContain('mínimo necessário: 4')
  })

  it('apresenta SEM_VENDAS_PARA_RH com competência, grupo amigável e método de cruzamento (contrato real)', async () => {
    const html = await render({ initialAlerts: mockAlerts, competence: '2025-08', campaign })

    expect(html).toContain('Sem vendas associadas')
    expect(html).not.toContain('SEM_VENDAS_ASSOCIADAS<')
    expect(html).toContain('Competência')
    expect(html).not.toContain('01/08/2025')
    expect(html).toContain('Cruzamento RH × Vendas')
    expect(html).toContain('Z-score Leave-One-Out')
    expect(html).toContain('Data da venda')
  })

  it('exibe faixa uniforme e explicação sem Z sentinela quando o desvio do grupo é zero', async () => {
    const html = await render({
      competence: '2025-08',
      campaign,
      initialAlerts: {
        content: [{
          id: 'alerta-zero', tipo: TIPO_ALERTA.OUTLIER_VENDA, dataReferencia: '2025-08-09', matricula: '1150',
          grupoComparavel: '2025-08|loja=7|cargo=10|marca=300', tamanhoAmostra: 5,
          valorObservado: 9800, mediaGrupo: 4500, desvioPadrao: 0, score: 3, metodo: METODO_LEAVE_ONE_OUT
        }],
        totalElements: 1, totalPages: 1, number: 0, size: 20
      }
    })

    expect(html).toContain('Valor uniforme no grupo')
    expect(html).toContain('Desvio padrão zero no grupo')
    expect(html).toContain('desvio padrão zero')
    expect(html).not.toContain('|Z| = 3,00')
  })

  it('renderiza o estado vazio quando a lista de alertas é vazia, sem botão de demonstração por padrão', async () => {
    const html = await render({
      initialAlerts: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
      competence: '2025-08'
    })
    expect(html).toContain('Nenhum alerta ou anomalia estatística encontrada')
    expect(html).toContain('|Z| ≥ 3')
    expect(html).not.toContain('Carregar Dados de Exemplo')
  })

  it('exibe o botão de demonstração apenas quando o modo demo está habilitado', async () => {
    const html = await render({
      initialAlerts: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 20 },
      competence: '2025-08',
      demoEnabled: true
    })
    expect(html).toContain('Carregar Dados de Exemplo (Demonstração)')
  })

  it('mostra orientação e não consulta a API quando não há competência definida', async () => {
    const mockApiClient = { listAlerts: vi.fn(), countAlertsByType: vi.fn() }
    const html = await render({ apiClient: mockApiClient })

    expect(html).toContain('Selecione uma competência')
    expect(html).not.toContain('2025-08')
    expect(mockApiClient.listAlerts).not.toHaveBeenCalled()
  })

  it('executa o modo real com fetch interno via apiClient quando initialAlerts é omitido', async () => {
    const mockApiClient = {
      listAlerts: vi.fn().mockResolvedValue(mockAlerts),
      countAlertsByType: vi.fn().mockResolvedValue({ totalOutliers: 1, totalInconsistencias: 1, totalSemAmostra: 1, totalGeral: 3 })
    }
    const html = await render({ competence: '2025-08', apiClient: mockApiClient })
    expect(html).toContain('Alertas Estatísticos e Anomalias de Vendas')
  })

  it('lista apenas lotes EFETIVADO no seletor, com rótulo legível do tipo de base', async () => {
    const html = await render({ competence: '2025-08', campaign, initialAlerts: mockAlerts, activeLots: effectiveLots })

    expect(html).toContain('id="anomaly-lot-filter"')
    expect(html).toContain('Todos os lotes da competência')
    expect(html).toContain('Vendas — vendas_ago.xlsx')
    expect(html).not.toContain('rascunho.xlsx')
  })

  it('oculta o seletor de lotes quando a tela não fornece lotes (ex.: perfil Auditor)', async () => {
    const html = await render({
      competence: '2025-08',
      campaign,
      initialAlerts: mockAlerts,
      activeLots: [],
      accessPolicy: { can: action => action === 'viewAnomalies', role: 'AUDITOR' }
    })
    expect(html).not.toContain('id="anomaly-lot-filter"')
    expect(html).not.toContain('<span>Reprocessar Lote</span>')
  })

  it('inclui no seletor a competência sincronizada mesmo fora da vigência da campanha', async () => {
    const html = await render({
      competence: '2025-10',
      campaign: { ...campaign, dataInicio: '2025-08-01', dataFim: '2025-09-30' },
      initialAlerts: mockAlerts
    })
    expect(html).toContain('id="anomaly-competence-filter"')
    expect(html).toContain('10/2025')
    expect(html).toContain('08/2025')
    expect(html).toContain('09/2025')
  })

  it('não renderiza o modal de reprocessamento antes da ação do usuário', async () => {
    const html = await render({
      competence: '2025-08',
      initialAlerts: mockAlerts,
      accessPolicy: { can: () => true, role: 'GERENTE_VENDAS' },
      activeLots: effectiveLots
    })
    expect(html).not.toContain('Reprocessar anomalias do lote?')
  })
})
