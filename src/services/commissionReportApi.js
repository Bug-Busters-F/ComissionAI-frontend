import api from './api'

export const CLOSING_STATUS = Object.freeze({
  CONCLUIDO: 'CONCLUIDO',
  ABERTA: 'ABERTA',
  PROCESSANDO: 'PROCESSANDO',
  FALHOU: 'FALHOU'
})

export const EXPORT_REPORT_TYPES = Object.freeze({
  CONSOLIDADO_COLABORADOR: 'CONSOLIDADO_COLABORADOR',
  CONSOLIDADO_EQUIPE: 'CONSOLIDADO_EQUIPE',
  CONSOLIDADO_CANAL: 'CONSOLIDADO_CANAL',
  DETALHADO: 'DETALHADO',
  COMPLETO: 'COMPLETO'
})

/**
 * Normaliza e verifica se o payload de status indica uma competência formalmente fechada e lacrada.
 *
 * @param {Object} statusPayload
 * @returns {boolean}
 */
export function isCompetenceClosed(statusPayload) {
  if (!statusPayload || typeof statusPayload !== 'object') return false
  const status = String(statusPayload.status || '').toUpperCase()
  return status === CLOSING_STATUS.CONCLUIDO || status === 'CONCLUIDA' || statusPayload.bloqueada === true
}

/**
 * Unifica os dados detalhados individuais (com bônus e total líquido)
 * com as identificações nominais dos colaboradores de forma performática O(1).
 * Não mascara ausência de total líquido caso venha nulo da autoridade contábil.
 *
 * @param {Array} porColaborador Array de ConsolidadoColaboradorDTO
 * @param {Array} totaisPorColaborador Array de TotalPorColaboradorDTO
 * @returns {Array}
 */
export function mergeCollaboratorReport(porColaborador = [], totaisPorColaborador = []) {
  if (!Array.isArray(porColaborador)) return []
  const namesByMatricula = new Map()

  if (Array.isArray(totaisPorColaborador)) {
    for (const item of totaisPorColaborador) {
      if (item && item.matricula && item.nomeColaborador) {
        namesByMatricula.set(String(item.matricula).trim(), String(item.nomeColaborador).trim())
      }
    }
  }

  return porColaborador.map((c, index) => {
    const matricula = String(c.matricula || '').trim()
    const nomeColaborador = namesByMatricula.get(matricula) || (matricula ? `Colaborador ${matricula}` : `Colaborador #${index + 1}`)
    const valorTotalAPagar = c.valorTotalAPagar !== null && c.valorTotalAPagar !== undefined
      ? Number(c.valorTotalAPagar)
      : null

    return {
      matricula,
      nomeColaborador,
      codCargo: c.codCargo ?? null,
      cargo: c.nomeCargo || (c.codCargo != null ? `Cargo ${c.codCargo}` : 'Cargo não informado'),
      codLoja: c.codLoja ?? null,
      loja: c.nomeLoja || (c.codLoja != null ? `Loja ${c.codLoja}` : 'Loja não informada'),
      codMarca: c.codMarca ?? null,
      marca: c.nomeMarca || (c.codMarca != null ? `Marca ${c.codMarca}` : 'Marca não informada'),
      quantidadeVendas: Number(c.quantidadeVendas) || 0,
      valorTotalVendas: Number(c.valorTotalVendas) || 0,
      valorTotalComissao: Number(c.valorTotalComissao) || 0,
      valorTotalBonusPercentual: Number(c.valorTotalBonusPercentual) || 0,
      valorTotalBonusFixo: Number(c.valorTotalBonusFixo) || 0,
      valorTotalBonus: Number(c.valorTotalBonus) || 0,
      valorTotalAPagar,
      taxaMediaEfetiva: Number(c.taxaMediaEfetiva) || 0,
      rowKey: `${matricula || 'sem-mat'}-${c.codLoja ?? '0'}-${c.codCargo ?? '0'}-${index}`
    }
  })
}

/**
 * Extrai o nome de arquivo sugerido no header Content-Disposition ou fornece fallback seguro.
 *
 * @param {string} dispositionHeader
 * @param {string} competencia
 * @param {string} tipo
 * @returns {string}
 */
export function resolveFilename(dispositionHeader, competencia, tipo) {
  const fallback = `relatorio_${String(tipo || 'fechamento').toLowerCase()}_${competencia || 'competencia'}.csv`
  if (!dispositionHeader || typeof dispositionHeader !== 'string') return fallback

  const match = dispositionHeader.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i)
  if (match && match[1]) {
    return decodeURIComponent(match[1].trim())
  }
  return fallback
}

/**
 * Cria o cliente de serviços de relatórios de fechamento de comissões.
 *
 * @param {Object} httpClient
 * @returns {Object}
 */
export function createCommissionReportApi(httpClient = api) {
  return {
    async getCompetenceClosingStatus(competencia) {
      if (!competencia) throw new Error('Competência é obrigatória para consultar o status de fechamento.')
      const response = await httpClient.get(`/comissoes/fechamento/${encodeURIComponent(competencia)}/status`)
      return response.data
    },

    async getConsolidatedReport(competencia) {
      if (!competencia) throw new Error('Competência é obrigatória para buscar o relatório consolidado.')
      const response = await httpClient.get(`/comissoes/fechamento/${encodeURIComponent(competencia)}/relatorio`)
      return response.data
    },

    async exportReportCsv(competencia, tipo = EXPORT_REPORT_TYPES.CONSOLIDADO_COLABORADOR, delimitador = ';') {
      if (!competencia) throw new Error('Competência é obrigatória para exportar o relatório.')
      try {
        const response = await httpClient.get(
          `/comissoes/fechamento/${encodeURIComponent(competencia)}/relatorio/exportar`,
          {
            params: { tipo, delimitador },
            responseType: 'blob'
          }
        )

        const filename = resolveFilename(response.headers?.['content-disposition'], competencia, tipo)
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
        const urlHelper = typeof window !== 'undefined' ? (window.URL || window.webkitURL) : globalThis.URL
        const downloadUrl = urlHelper?.createObjectURL ? urlHelper.createObjectURL(blob) : 'blob:mock-url'

        if (typeof document !== 'undefined' && document.createElement) {
          const link = document.createElement('a')
          link.href = downloadUrl
          link.setAttribute('download', filename)
          document.body?.appendChild(link)
          link.click()
          document.body?.removeChild(link)
        }

        if (urlHelper?.revokeObjectURL) {
          urlHelper.revokeObjectURL(downloadUrl)
        }

        return { filename, success: true }
      } catch (error) {
        let errorMessage = 'Não foi possível exportar o relatório da competência.'
        if (error.response?.data instanceof Blob) {
          try {
            const rawText = await error.response.data.text()
            const parsed = JSON.parse(rawText)
            errorMessage = parsed.message || parsed.error || errorMessage
          } catch {
            // Mantém a mensagem padrão se o blob não for um JSON legível
          }
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        } else if (error.message) {
          errorMessage = error.message
        }
        throw new Error(errorMessage)
      }
    }
  }
}

export const commissionReportApi = createCommissionReportApi()
export default commissionReportApi
