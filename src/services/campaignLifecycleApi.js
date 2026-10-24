import api from './api'

export function createCampaignLifecycleApi(http = api) {
  const config = { timeout: 30000 }
  return {
    async load(id) { return (await http.get(`/campanhas/${id}`, config)).data },
    async save(id, payload) { return (await (id ? http.put(`/campanhas/${id}`, payload, config) : http.post('/campanhas', payload, config))).data },
    async competences() { return (await http.get('/referencias/competencias', config)).data },
    async cut(campanhaId, competencia) { return (await http.post('/referencias/recortar-publico', { campanhaId, competencia, limite: 1, pagina: 0 }, config)).data },
    async simulate(campanhaId, competencia) { return (await http.post('/simulacoes', { campanhaId, competencia, limite: 10, pagina: 0 }, { timeout: 300000 })).data },
    async simulation(id) { return (await http.get(`/simulacoes/${id}`, config)).data },
    async sales(id, page, size) { return (await http.get(`/simulacoes/${id}/vendas`, { ...config, params: { page: page - 1, size, sort: 'id,asc' } })).data },
    async accept(id, payload) { return (await http.post(`/simulacoes/${id}/aceite`, payload, config)).data },
    async readiness(id) { return (await http.get(`/campanhas/${id}/conferencia-simulacao`, config)).data },
    async activate(id) { return (await http.post(`/campanhas/${id}/ativar`, {}, config)).data }
  }
}
