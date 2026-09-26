import api from './api'

export const campaignService = {
  async list() {
    const response = await api.get('/campanhas')
    return response.data
  },

  async get(id) {
    const response = await api.get(`/campanhas/${id}`)
    return response.data
  },

  async create(payload) {
    const response = await api.post('/campanhas', payload)
    return response.data
  },

  async update(id, payload) {
    const response = await api.put(`/campanhas/${id}`, payload)
    return response.data
  },

  async updateStatus(id, estado) {
    const response = await api.patch(`/campanhas/${id}/estado`, { estado })
    return response.data
  },

  async remove(id) {
    await api.delete(`/campanhas/${id}`)
  }
}

export function normalizeCampaignError(error) {
  const responseData = error?.response?.data || {}
  const fieldErrors = {}

  for (const validation of responseData.validacoes || []) {
    if (validation?.campo && validation?.motivo) {
      fieldErrors[validation.campo] = validation.motivo
    }
  }

  return {
    status: error?.response?.status || null,
    fieldErrors,
    message:
      responseData.message ||
      (error?.code === 'CAMPAIGN_FLOW' ? error.message : '') ||
      (error?.response?.status === 404
        ? 'Campanha não encontrada ou já removida.'
        : error?.response?.status === 500
          ? 'Não foi possível concluir a operação agora. Tente novamente sem perder os dados preenchidos.'
          : error?.response?.status
            ? `Não foi possível concluir a operação (erro ${error.response.status}).`
            : 'Não foi possível conectar ao serviço. Verifique se ele está disponível.')
  }
}

export function mapCampaignFieldErrors(fieldErrors) {
  const mapped = {}
  const aliases = {
    taxa: 'taxaPercentual',
    data_inicio: 'dataInicio',
    data_fim: 'dataFim',
    texto_original: 'textoOriginal',
    cod_marca: 'codMarca',
    descr_marca: 'descrMarca',
    cod_loja: 'codLoja',
    cod_cargo: 'codCargo',
    descri_cargo: 'descriCargo'
  }

  for (const [field, message] of Object.entries(fieldErrors || {})) {
    mapped[aliases[field] || field] = message
  }

  return mapped
}
