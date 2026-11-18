import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CommissionReportCollaboratorTab from './CommissionReportCollaboratorTab.vue'
import CommissionReportRuleTab from './CommissionReportRuleTab.vue'

describe('CommissionReportCollaboratorTab', () => {
  const mockItems = [
    {
      matricula: 'MATRIC-193',
      nomeColaborador: 'João da Silva',
      cargo: 'Vendedor Loja',
      loja: 'Loja 14',
      quantidadeVendas: 116,
      valorTotalVendas: 256804.77,
      valorTotalComissao: 10272.11,
      valorTotalBonus: 0,
      valorTotalAPagar: 10272.11,
      taxaMediaEfetiva: 0.04,
      rowKey: 'MATRIC-193-14-100-0'
    },
    {
      matricula: 'MATRIC-200',
      nomeColaborador: 'Maria Souza',
      cargo: 'Vendedor Balcão',
      loja: 'Loja 28',
      quantidadeVendas: 50,
      valorTotalVendas: 100000.0,
      valorTotalComissao: 2500.0,
      valorTotalBonus: 300.0,
      valorTotalAPagar: 2800.0,
      taxaMediaEfetiva: 0.025,
      rowKey: 'MATRIC-200-28-200-1'
    }
  ]

  it('renders collaborator table with items, formatting and totals', async () => {
    const app = createSSRApp(CommissionReportCollaboratorTab, {
      items: mockItems,
      loading: false
    })

    const html = await renderToString(app)
    expect(html).toContain('Relatório Consolidado por Colaborador')
    expect(html).toContain('MATRIC-193')
    expect(html).toContain('João da Silva')
    expect(html).toContain('Loja 14')
    expect(html).toContain('Vendedor Loja')
    expect(html).toContain('116')
    expect(html).toContain('10.272,11')
    expect(html).toContain('MATRIC-200')
    expect(html).toContain('Maria Souza')
    expect(html).toContain('300,00')
    expect(html).toContain('2.800,00')
  })

  it('renders empty state when no collaborators are provided', async () => {
    const app = createSSRApp(CommissionReportCollaboratorTab, {
      items: [],
      loading: false
    })

    const html = await renderToString(app)
    expect(html).toContain('Nenhum colaborador encontrado')
  })
})

describe('CommissionReportRuleTab', () => {
  const mockRules = [
    {
      idRegra: 1,
      nomeRegra: 'Campanha Vendedores Loja 14',
      tipoOperacao: 'DEFINIR_TAXA',
      quantidadeVendas: 116,
      valorTotalVendas: 256804.77,
      valorTotalComissao: 10272.11
    },
    {
      idRegra: null,
      nomeRegra: 'Taxa Base Contratual (Padrão)',
      tipoOperacao: 'BASE_COMISS',
      quantidadeVendas: 4000,
      valorTotalVendas: 5000000.0,
      valorTotalComissao: 125000.0
    }
  ]

  it('renders rules table with operation badges and reconciliation indicator', async () => {
    const totalGeral = 10272.11 + 125000.0
    const app = createSSRApp(CommissionReportRuleTab, {
      rules: mockRules,
      totalGeraisComissao: totalGeral,
      loading: false
    })

    const html = await renderToString(app)
    expect(html).toContain('Relatório Consolidado por Grupo de Regra')
    expect(html).toContain('Campanha Promocional')
    expect(html).toContain('Campanha Vendedores Loja 14')
    expect(html).toContain('Substituição de Taxa')
    expect(html).toContain('Taxa Base Contratual')
    expect(html).toContain('Reconciliação Auditada')
    expect(html).toContain('135.272,11')
  })

  it('renders empty state when rules array is empty', async () => {
    const app = createSSRApp(CommissionReportRuleTab, {
      rules: [],
      totalGeraisComissao: 0,
      loading: false
    })

    const html = await renderToString(app)
    expect(html).toContain('Nenhuma regra consolidada encontrada')
  })
})
