const DEMO_CAMPAIGNS = [
  {
    id: 'demo-1',
    titulo: 'Incentivo de novembro',
    textoOriginal: 'Aumentar a comissão dos vendedores da Aurora para 2,5% e pagar um bônus de R$ 100 para quem atingir R$ 40.000 no mês.',
    estado: 'CONCLUIDA',
    dataInicio: '2025-11-01',
    dataFim: '2025-11-30',
    criadoEm: '2025-10-30T09:15:00-03:00',
    atualizadoEm: '2025-10-31T14:32:00-03:00',
    regra: {
      id: 'demo-rule-1',
      nome: 'Regra - Incentivo de novembro',
      canal: null,
      codMarca: 10,
      descrMarca: 'Aurora',
      codLoja: null,
      codCargo: null,
      descriCargo: 'Vendedores',
      matricula: null,
      taxa: 0.025,
      dataInicio: '2025-11-01',
      dataFim: '2025-11-30',
      status: 'ATIVA'
    }
  },
  {
    id: 'demo-2',
    titulo: 'Campanha de dezembro',
    textoOriginal: 'Aumentar a comissão dos vendedores da Aurora e oferecer um bônus para quem atingir a faixa de vendas.',
    estado: 'DRAFT',
    dataInicio: '2025-12-01',
    dataFim: '2025-12-31',
    criadoEm: '2025-11-28T10:00:00-03:00',
    atualizadoEm: '2025-11-28T10:00:00-03:00',
    regra: {
      id: 'demo-rule-2',
      nome: 'Regra - Campanha de dezembro',
      canal: null,
      codMarca: 10,
      descrMarca: 'Aurora',
      codLoja: null,
      codCargo: null,
      descriCargo: 'Vendedores',
      matricula: null,
      taxa: 0.03,
      dataInicio: '2025-12-01',
      dataFim: '2025-12-31',
      status: 'DRAFT'
    }
  }
]

export const campaignDemo = {
  list() {
    return clone(DEMO_CAMPAIGNS)
  },

  get(id) {
    const campaign = DEMO_CAMPAIGNS.find((item) => String(item.id) === String(id))
    return campaign ? clone(campaign) : null
  },

  remove(id) {
    const index = DEMO_CAMPAIGNS.findIndex((item) => String(item.id) === String(id))
    if (index >= 0) {
      DEMO_CAMPAIGNS.splice(index, 1)
    }
  },

  create(payload) {
    const id = `demo-${Date.now()}`
    const campaign = fromPayload(id, payload)
    DEMO_CAMPAIGNS.unshift(campaign)
    return clone(campaign)
  },

  update(id, payload) {
    const index = DEMO_CAMPAIGNS.findIndex((item) => String(item.id) === String(id))
    if (index < 0) return null
    const current = DEMO_CAMPAIGNS[index]
    const campaign = fromPayload(id, payload, current)
    DEMO_CAMPAIGNS[index] = campaign
    return clone(campaign)
  },

  updateStatus(id, estado) {
    const index = DEMO_CAMPAIGNS.findIndex((item) => String(item.id) === String(id))
    if (index < 0) return null
    const campaign = clone(DEMO_CAMPAIGNS[index])
    campaign.estado = estado
    if (campaign.regra) {
      campaign.regra.status = estado === 'ATIVA' ? 'ATIVA' : estado === 'DRAFT' ? 'DRAFT' : 'INATIVA'
    }
    campaign.atualizadoEm = new Date().toISOString()
    DEMO_CAMPAIGNS[index] = campaign
    return clone(campaign)
  }
}

export const isCampaignDemoEnabled = import.meta.env.VITE_CAMPAIGN_DEMO === 'true'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function fromPayload(id, payload, current = {}) {
  const estado = payload.estado || current.estado || 'DRAFT'
  return {
    ...current,
    id,
    titulo: payload.titulo,
    textoOriginal: payload.textoOriginal,
    estado,
    dataInicio: payload.dataInicio || current.dataInicio || '2026-01-01',
    dataFim: payload.dataFim || current.dataFim || '2026-01-31',
    criadoEm: current.criadoEm || new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    regra: {
      ...(current.regra || {}),
      id: current.regra?.id || `demo-rule-${id}`,
      nome: `Regra - ${payload.titulo}`,
      canal: payload.canal,
      codMarca: payload.codMarca,
      descrMarca: payload.descrMarca,
      codLoja: payload.codLoja,
      codCargo: payload.codCargo,
      descriCargo: payload.descriCargo,
      matricula: payload.matricula,
      taxa: payload.taxa,
      dataInicio: payload.dataInicio || current.regra?.dataInicio || '2026-01-01',
      dataFim: payload.dataFim || current.regra?.dataFim || '2026-01-31',
      status: estado === 'ATIVA' ? 'ATIVA' : estado === 'DRAFT' ? 'DRAFT' : 'INATIVA'
    }
  }
}
