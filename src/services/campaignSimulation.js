export const CAMPAIGN_SIMULATION_ID = 'DEMO-SIM-001'

export const CAMPAIGN_SIMULATION_PREMISES = [
  { label: 'Canal considerado', value: 'Loja física' },
  { label: 'Referência histórica', value: 'Novembro de 2025' },
  { label: 'Quadro de vendedores', value: '5 funcionários · 2 lojas' },
  { label: 'Taxa vigente fictícia', value: '2,5%' },
  { label: 'Ocorrências', value: 'Sem afastamentos no período' },
  { label: 'Abrangência do orçamento', value: 'R$ 7.500,00 mensais' }
]

const FIXTURES = {
  base: {
    label: 'Cenário base',
    scenarios: [
      { key: '80', percentage: '80%', classification: 'Abaixo', sales: 184000, withoutProposal: 3680, withProposal: 5720, impact: 2040, budget: 7500 },
      { key: '100', percentage: '100%', classification: 'Referência', sales: 230000, withoutProposal: 4600, withProposal: 7300, impact: 2700, budget: 7500 },
      { key: '120', percentage: '120%', classification: 'Acima', sales: 276000, withoutProposal: 5520, withProposal: 8780, impact: 3260, budget: 7500 }
    ],
    employees: [
      { name: 'Ana Martins', registration: '1001', sales: 50000, commission: 1350, status: 'Dentro do orçamento' },
      { name: 'Bruno Lima', registration: '1002', sales: 46000, commission: 1242, status: 'Dentro do orçamento' },
      { name: 'Carla Souza', registration: '1003', sales: 42000, commission: 1134, status: 'Dentro do orçamento' },
      { name: 'Diego Alves', registration: '1004', sales: 51000, commission: 1377, status: 'Dentro do orçamento' },
      { name: 'Eva Rocha', registration: '1005', sales: 41000, commission: 1107, status: 'Dentro do orçamento' }
    ]
  },
  adjusted: {
    label: 'Sugestão demonstrativa aplicada',
    scenarios: [
      { key: '80', percentage: '80%', classification: 'Abaixo', sales: 184000, withoutProposal: 3680, withProposal: 5010, impact: 1330, budget: 7500 },
      { key: '100', percentage: '100%', classification: 'Referência', sales: 230000, withoutProposal: 4600, withProposal: 6400, impact: 1800, budget: 7500 },
      { key: '120', percentage: '120%', classification: 'Acima', sales: 276000, withoutProposal: 5520, withProposal: 7680, impact: 2160, budget: 7500 }
    ],
    employees: [
      { name: 'Ana Martins', registration: '1001', sales: 50000, commission: 1180, status: 'Dentro do orçamento' },
      { name: 'Bruno Lima', registration: '1002', sales: 46000, commission: 1086, status: 'Dentro do orçamento' },
      { name: 'Carla Souza', registration: '1003', sales: 42000, commission: 992, status: 'Dentro do orçamento' },
      { name: 'Diego Alves', registration: '1004', sales: 51000, commission: 1204, status: 'Dentro do orçamento' },
      { name: 'Eva Rocha', registration: '1005', sales: 41000, commission: 968, status: 'Dentro do orçamento' }
    ]
  }
}

export function getCampaignSimulationFixture(variant = 'base') {
  return FIXTURES[variant] || FIXTURES.base
}

export function formatSimulationCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatSimulationPercent(value) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`
}

export function simulationUsage(scenario) {
  return (scenario.withProposal / scenario.budget) * 100
}
