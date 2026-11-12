import api from './api'

export function createCampaignCoverageService(http = api) {
  return {
    /**
     * Consulta o diagnóstico consolidado de cobertura da campanha para fechamento (BACK-6).
     * Avalia competências da vigência, RH, Vendas, Taxas e bloqueios impeditivos.
     */
    async getCoverage(campanhaId) {
      if (!campanhaId) return null
      const res = await http.get(`/campanhas/${campanhaId}/cobertura-fechamento`)
      return res.data
    },

    /**
     * Valida bloqueantemente a prontidão para fechamento. Retorna 200 se 100% coberta ou 422 se pendente.
     */
    async validateCoverage(campanhaId) {
      if (!campanhaId) return null
      const res = await http.post(`/campanhas/${campanhaId}/cobertura-fechamento/validar`)
      return res.data
    },

    /**
     * Lista os anexos de bases gerais atualmente vinculados à campanha.
     */
    async listAttachments(campanhaId) {
      if (!campanhaId) return []
      const res = await http.get(`/campanhas/${campanhaId}/anexos-base`)
      return res.data || []
    },

    /**
     * Associa um lote geral concluído (reportId) à campanha sem duplicar cargas de planilhas.
     */
    async attachBase(campanhaId, { reportId, responsavel = null }) {
      if (!campanhaId || !reportId) throw new Error('campanhaId e reportId são obrigatórios.')
      const res = await http.post(`/campanhas/${campanhaId}/anexos-base`, {
        reportId: Number(reportId),
        responsavel
      })
      return res.data
    },

    /**
     * Desvincula logicamente o lote anexado da campanha.
     */
    async detachBase(campanhaId, anexoId, responsavel = null) {
      if (!campanhaId || !anexoId) throw new Error('campanhaId e anexoId são obrigatórios.')
      const params = responsavel ? { responsavel } : {}
      await http.delete(`/campanhas/${campanhaId}/anexos-base/${anexoId}`, { params })
      return true
    },

    /**
     * Lista as pendências/inconsistências dos lotes anexados à campanha de forma paginada.
     */
    async listPendencies(campanhaId, { competencia = null, tipoBase = null, page = 0, size = 20 } = {}) {
      if (!campanhaId) return { content: [], totalElements: 0 }
      const params = { page, size }
      if (competencia) params.competencia = competencia
      if (tipoBase) params.tipoBase = tipoBase
      const res = await http.get(`/campanhas/${campanhaId}/cobertura-fechamento/pendencias`, { params })
      return res.data
    }
  }
}

export const campaignCoverageService = createCampaignCoverageService()
