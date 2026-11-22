import api from './api'

export function createCampaignLifecycleApi(http = api) {
  const config = { timeout: 30000 }
  const revisionConfig = (revision) => revision == null ? config : { ...config, headers: { 'X-Campanha-Revisao': revision } }
  return {
    async load(id) { return (await http.get(`/campanhas/${id}`, config)).data },
    async save(id, payload, revision) { return (await (id ? http.put(`/campanhas/${id}`, payload, revisionConfig(revision)) : http.post('/campanhas', payload, config))).data },
    async progress(id, payload) { return (await http.patch(`/campanhas/${id}/progresso`, payload, config)).data },
    async competences() { return (await http.get('/referencias/competencias', config)).data },
    async cut(campanhaId, competencia) { return (await http.post('/referencias/recortar-publico', { campanhaId, competencia, limite: 1, pagina: 0 }, config)).data },
    async simulate(campanhaId, competencia) { return (await http.post('/simulacoes', { campanhaId, competencia, limite: 10, pagina: 0 }, { timeout: 300000 })).data },
    async program(id) { return (await http.get(`/campanhas/${id}/programa-python`, config)).data },
    async programHistory(id) { return (await http.get(`/campanhas/${id}/programa-python/historico`, config)).data },
    async saveProgram(id, payload) { return (await http.put(`/campanhas/${id}/programa-python`, payload, config)).data },
    async approveProgram(id, payload) { return (await http.post(`/campanhas/${id}/programa-python/aprovar`, payload, config)).data },
    async rejectProgram(id, payload) { return (await http.post(`/campanhas/${id}/programa-python/rejeitar`, payload, config)).data },
    async simulatePython(id, payload) { return (await http.post(`/campanhas/${id}/simulacao-python`, payload, { timeout: 300000 })).data },
    async applyCalibration(id, payload) { return (await http.post(`/simulacoes/${id}/calibracoes/aplicar`, payload, config)).data },
    async simulation(id) { return (await http.get(`/simulacoes/${id}`, config)).data },
    async sales(id, page, size) { return (await http.get(`/simulacoes/${id}/vendas`, { ...config, params: { page: page - 1, size, sort: 'id,asc' } })).data },
    async accept(id, payload) { return (await http.post(`/simulacoes/${id}/aceite`, payload, config)).data },
    async readiness(id) { return (await http.get(`/campanhas/${id}/conferencia-simulacao`, config)).data },
    async activate(id, versaoEsperada = null, revision = null) { return (await http.post(`/campanhas/${id}/ativar`, versaoEsperada == null ? {} : { versaoEsperada }, revisionConfig(revision))).data },
    async startProposal(id, revision) { return (await http.post(`/campanhas/${id}/proposta`, {}, revisionConfig(revision))).data },
    async cancelProposal(id, revision) { await http.delete(`/campanhas/${id}/proposta`, revisionConfig(revision)) },
    async history(id) { return (await http.get(`/campanhas/${id}/versoes`, config)).data },
    async version(id, numero) { return (await http.get(`/campanhas/${id}/versoes/${numero}`, config)).data },
    async approveCode(id, payload) { return (await http.post(`/campanhas/${id}/aprovacao-codigo`, payload, config)).data },
    async getCodeApproval(id) { return (await http.get(`/campanhas/${id}/aprovacao-codigo`, config)).data },
    async forwardToManager(id, payload = {}) { return (await http.post(`/campanhas/${id}/encaminhar-gerente`, payload, config)).data },
    async compareVersions(id, versaoBase, versaoComparada) { return (await http.get(`/campanhas/${id}/versoes/comparacao`, { ...config, params: { versaoBase, versaoComparada } })).data },
    async updateBudget(id, payload) { return (await http.patch(`/campanhas/${id}/orcamento`, payload, config)).data },
    async returnProposal(id, payload) { return (await http.post(`/campanhas/${id}/devolver`, payload, config)).data }
  }
}
