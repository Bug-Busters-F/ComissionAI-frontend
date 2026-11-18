import defaultHttp from './api'
import {
  buildAlertQueryParams,
  isNewCase48h,
  TIPO_ALERTA
} from './statisticalAlertsLogic'

/**
 * Cria o cliente de serviços de alertas estatísticos e detecção de anomalias (FRONT-6).
 *
 * @param {import('axios').AxiosInstance} [http=defaultHttp]
 */
export function createStatisticalAlertsApi(http = defaultHttp) {
  return {
    /**
     * Consulta a lista paginada de alertas estatísticos com filtros aplicados.
     *
     * @param {Object} [filters={}]
     * @returns {Promise<{ content: Array, totalElements: number, totalPages: number, number: number, size: number }>}
     */
    async listAlerts(filters = {}) {
      const params = buildAlertQueryParams(filters)
      const res = await http.get('/alertas-estatisticos', { params })
      return res.data
    },

    /**
     * Obtém contadores agregados por tipo de alerta executando consultas ultraleves com size=1.
     * Respeita os filtros ativos de competência, matrícula e lote da consulta.
     *
     * @param {Object} [baseFilters={}]
     * @returns {Promise<{ totalOutliers: number, totalInconsistencias: number, totalSemAmostra: number, totalGeral: number }>}
     */
    async countAlertsByType(baseFilters = {}) {
      const cleanFilters = { ...baseFilters }
      delete cleanFilters.tipo
      delete cleanFilters.page
      delete cleanFilters.size

      const [resOutliers, resInconsistencias, resSemAmostra, resGeral] = await Promise.all([
        this.listAlerts({ ...cleanFilters, tipo: TIPO_ALERTA.OUTLIER_VENDA, size: 1, page: 0 }),
        this.listAlerts({ ...cleanFilters, tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH, size: 1, page: 0 }),
        this.listAlerts({ ...cleanFilters, tipo: TIPO_ALERTA.AMOSTRA_INSUFICIENTE, size: 1, page: 0 }),
        this.listAlerts({ ...cleanFilters, size: 1, page: 0 })
      ])

      const totalOutliers = resOutliers?.totalElements ?? 0
      const totalInconsistencias = resInconsistencias?.totalElements ?? 0
      const totalSemAmostra = resSemAmostra?.totalElements ?? 0
      const totalGeral = resGeral?.totalElements ?? (totalOutliers + totalInconsistencias + totalSemAmostra)

      return {
        totalOutliers,
        totalInconsistencias,
        totalSemAmostra,
        totalGeral
      }
    },

    /**
     * Verifica se existem novos alertas estatísticos gerados nas últimas 48 horas.
     * Executa consulta otimizada ordenada por geradoEm desc com size=1 e verifica o primeiro registro.
     *
     * @param {string} [competencia]
     * @returns {Promise<{ hasNewCases48h: boolean, latestAlert: Object|null }>}
     */
    async checkNewCases48h(competencia) {
      const params = { size: 1, page: 0, sort: 'geradoEm,desc' }
      if (competencia) params.competencia = competencia

      const res = await this.listAlerts(params)
      const latestAlert = res?.content?.[0] || null
      const hasNewCases48h = latestAlert ? isNewCase48h(latestAlert.geradoEm) : false

      return {
        hasNewCases48h,
        latestAlert
      }
    }
  }
}

export default createStatisticalAlertsApi()
