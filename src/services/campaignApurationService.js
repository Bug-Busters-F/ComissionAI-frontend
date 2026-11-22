import api from './api'

export function createCampaignApurationService(http = api) {
  const read = { timeout: 30000 }
  return {
    async history(id) { return (await http.get(`/campanhas/${id}/apuracoes`, read)).data },
    async detail(id, apurationId) { return (await http.get(`/campanhas/${id}/apuracoes/${apurationId}`, read)).data },
    async execute(id, version, payload) {
      return (await http.post(`/campanhas/${id}/calcular-definitivo`, payload, { params: { versaoNumero: version }, timeout: 900000 })).data
    },
    async exportCsv(id, apurationId) {
      return (await http.get(`/campanhas/${id}/apuracoes/${apurationId}/exportar`, { ...read, params: { tipo: 'COMPLETO' }, responseType: 'blob' })).data
    },
    async campaign(id) { return (await http.get(`/campanhas/${id}`, read)).data },
    async version(id, version) { return (await http.get(`/campanhas/${id}/versoes/${version}`, read)).data },
    async program(id, version) { return (await http.get(`/campanhas/${id}/versoes/${version}/programa-python`, read)).data },
    async coverage(id) { return (await http.get(`/campanhas/${id}/cobertura-fechamento`, read)).data },
    async closing(month) { return (await http.get(`/comissoes/fechamento/${month}/status`, read)).data }
  }
}
