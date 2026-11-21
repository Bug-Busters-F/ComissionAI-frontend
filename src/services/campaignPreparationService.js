import api from './api'

export function createCampaignPreparationService(http = api) {
  return {
    /**
     * Lista os lotes de preparação criados para a campanha (BACK-5).
     */
    async listBatches(campanhaId, { tipoBase = null, competencia = null, status = null } = {}) {
      if (!campanhaId) return []
      const params = {}
      if (tipoBase) params.tipoBase = tipoBase
      if (competencia) params.competencia = competencia
      if (status) params.status = status
      const res = await http.get(`/campanhas/${campanhaId}/preparacao-bases`, { params })
      return res.data || []
    },

    /**
     * Abre em preparação um lote já importado no sistema para correção de suas inconsistências.
     */
    async openFromBatch(campanhaId, reportId, responsavel = null) {
      if (!campanhaId || !reportId) throw new Error('campanhaId e reportId são obrigatórios.')
      const params = responsavel ? { responsavel } : {}
      const res = await http.post(`/campanhas/${campanhaId}/preparacao-bases/a-partir-de-lote/${reportId}`, null, {
        params
      })
      return res.data
    },

    /**
     * Consulta o resumo do lote de preparação (contagens, status, validações).
     */
    async getBatchSummary(campanhaId, preparacaoId) {
      if (!campanhaId || !preparacaoId) return null

      const res = await http.get(`/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}`)
      return res.data
    },

    /**
     * Consulta as linhas do lote de preparação de forma paginada e filtrada.
     */
    async listBatchLines(
      campanhaId,
      preparacaoId,
      {
        valida = null,
        severidade = null,
        campoErro = null,
        matricula = null,
        dataInicio = null,
        dataFim = null,
        editada = null,
        ignorada = null,
        page = 0,
        size = 20
      } = {}
    ) {
      if (!campanhaId || !preparacaoId) return { content: [], totalElements: 0, totalPages: 0 }


      const params = { page, size }
      if (valida != null) params.valida = valida
      if (severidade) params.severidade = severidade
      if (campoErro) params.campoErro = campoErro
      if (matricula) params.matricula = matricula
      if (dataInicio) params.dataInicio = dataInicio
      if (dataFim) params.dataFim = dataFim
      if (editada != null) params.editada = editada
      if (ignorada != null) params.ignorada = ignorada

      const res = await http.get(`/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}/linhas`, { params })
      return res.data
    },

    // The backend has a paged collection, not a GET endpoint for a single line.
    async getBatchLine(campanhaId, preparacaoId, numeroLinha) {
      let page = 0
      let totalPages = 1
      while (page < totalPages) {
        const result = await this.listBatchLines(campanhaId, preparacaoId, { page, size: 200 })
        const line = result.content?.find(item => item.numeroLinha === numeroLinha)
        if (line) return line
        totalPages = result.totalPages || 1
        page++
      }
      throw new Error('A linha atual não foi encontrada. Atualize o lote antes de continuar.')
    },

    /**
     * Edita uma linha do lote de preparação com bloqueio otimista via versão e revalidação imediata.
     */
    async editBatchLine(campanhaId, preparacaoId, numeroLinha, payload) {
      if (!campanhaId || !preparacaoId || numeroLinha == null) {
        throw new Error('Parâmetros obrigatórios ausentes para edição de linha.')
      }
      if (payload?.versao == null) {
        throw new Error('A versão da linha é obrigatória para controle de concorrência.')
      }


      const res = await http.patch(
        `/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}/linhas/${numeroLinha}`,
        payload
      )
      return res.data
    },

    /**
     * Consulta o histórico de edições de uma linha (comparação antes vs. depois).
     */
    async getLineHistory(campanhaId, preparacaoId, numeroLinha) {
      if (!campanhaId || !preparacaoId || numeroLinha == null) return []

      const res = await http.get(
        `/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}/linhas/${numeroLinha}/historico`
      )
      return res.data || []
    },

    /**
     * Revalida todas as linhas do lote de preparação.
     */
    async revalidateBatch(campanhaId, preparacaoId, responsavel = null) {
      if (!campanhaId || !preparacaoId) return null

      const params = responsavel ? { responsavel } : {}
      const res = await http.post(
        `/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}/revalidar`,
        null,
        { params }
      )
      return res.data
    },

    /**
     * Consulta a prévia de impacto da correção antes de confirmar a efetivação (BACK-5 / BACK-6).
     */
    async getImpactPreview(campanhaId, preparacaoId) {
      if (!campanhaId || !preparacaoId) return null

      const res = await http.get(
        `/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}/previa-impacto`
      )
      return res.data
    },

    /**
     * Efetiva o lote de preparação na base geral corporativa.
     */
    async commitBatch(campanhaId, preparacaoId, { responsavel = null, motivo = null, confirmarPropagacaoImpacto = true } = {}) {
      if (!campanhaId || !preparacaoId) throw new Error('campanhaId e preparacaoId são obrigatórios.')

      const res = await http.post(
        `/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}/efetivar`,
        {
          responsavel,
          motivo,
          confirmarPropagacaoImpacto: Boolean(confirmarPropagacaoImpacto)
        }
      )
      return res.data
    },

    /**
     * Descarta o lote de preparação.
     */
    async discardBatch(campanhaId, preparacaoId, { motivo = null, responsavel = null } = {}) {
      if (!campanhaId || !preparacaoId) return false

      const params = {}
      if (motivo) params.motivo = motivo
      if (responsavel) params.responsavel = responsavel
      await http.delete(`/campanhas/${campanhaId}/preparacao-bases/${preparacaoId}`, { params })
      return true
    },

    /**
     * Registra o aceite formal rastreável de uma pendência/risco (BACK-7).
     * Bloqueia severidade IMPEDITIVO (apenas ADVERTENCIA/AVISO pode ser aceito).
     */
    async acceptRisk(campanhaId, { pendenciaIdentificador, codigo, campo, mensagem, severidade, motivo, aceitoPor = null }) {
      if (!campanhaId) throw new Error('campanhaId é obrigatório.')
      if (!['ADVERTENCIA', 'AVISO'].includes(String(severidade).toUpperCase())) {
        throw new Error('Erros impeditivos exigem correção do dado e não admitem aceite de risco.')
      }
      if (!motivo || motivo.trim().length < 5) {
        throw new Error('A justificativa do aceite é obrigatória (mínimo de 5 caracteres).')
      }

      const res = await http.post(`/campanhas/${campanhaId}/pendencias/aceite`, {
          pendenciaIdentificador: String(pendenciaIdentificador || codigo || campo),
          codigo: codigo || 'PENDENCIA_GERAL',
          campo: campo || 'geral',
          mensagem: mensagem || 'Pendência aceita sob justificativa',
          severidade: severidade || 'ADVERTENCIA',
          motivo: motivo.trim(),
          aceitoPor
        })
      return res.data
    },

    /**
     * Revoga um aceite formal de risco previamente concedido (BACK-7).
     */
    async revokeRisk(campanhaId, aceiteId, { motivo, revogadoPor = null } = {}) {
      if (!campanhaId || !aceiteId) throw new Error('campanhaId e aceiteId são obrigatórios.')
      if (!motivo || motivo.trim().length < 5) {
        throw new Error('A justificativa da revogação é obrigatória (mínimo de 5 caracteres).')
      }

      const res = await http.post(`/campanhas/${campanhaId}/pendencias/${aceiteId}/revogar`, {
          motivo: motivo.trim(),
          revogadoPor
        })
      return res.data
    }
  }
}

export const campaignPreparationService = createCampaignPreparationService()

const MAX_COMMIT_ERROR_DETAILS = 10

/**
 * Traduz o erro da efetivação em mensagem + lista de linhas afetadas.
 * O back responde 409 com `validacoes: [{ campo: 'linha:12', motivo }]` quando a chave de uma venda é ambígua
 * (mais de uma venda candidata na base geral): a efetivação é bloqueada para não duplicar vendas.
 *
 * @param {any} err
 * @param {string} [fallback]
 * @returns {{ message: string, details: string[] }}
 */
export function describeCommitError(err, fallback = 'Falha ao efetivar lote na base geral.') {
  const data = err?.response?.data
  const message = (typeof data?.message === 'string' && data.message.trim()) || err?.message || fallback
  const validacoes = Array.isArray(data?.validacoes) ? data.validacoes : []
  const lines = validacoes
    .filter(v => v && typeof v.motivo === 'string' && v.motivo.trim())
    .map(v => {
      const linha = /^linha:(\d+)$/i.exec(String(v.campo || '').trim())
      return linha ? `Linha ${linha[1]}: ${v.motivo.trim()}` : v.motivo.trim()
    })
  return { message, details: limitDetails(lines) }
}

function limitDetails(lines) {
  const details = lines.slice(0, MAX_COMMIT_ERROR_DETAILS)
  if (lines.length > MAX_COMMIT_ERROR_DETAILS) details.push(`… e mais ${lines.length - MAX_COMMIT_ERROR_DETAILS} linha(s).`)
  return details
}

function cleanList(list) {
  return Array.isArray(list) ? list.filter(b => typeof b === 'string' && b.trim()).map(b => b.trim()) : []
}

/**
 * Lê os bloqueios da prévia de impacto (`GET .../previa-impacto`).
 * Além do fechamento, o back informa as linhas com chave de venda ambígua
 * (`possuiBloqueioChaveAmbigua` + `bloqueiosChaveAmbigua`), que a efetivação recusaria com 409.
 * Compatível com versões do back que ainda não enviam os campos de chave ambígua.
 *
 * @param {any} preview
 * @returns {{ fechamento: string[], chaveAmbigua: string[], totalChaveAmbigua: number, bloqueado: boolean }}
 */
export function describePreviewBlockers(preview) {
  const fechamentoLines = cleanList(preview?.bloqueiosFechamento)
  const ambiguaLines = cleanList(preview?.bloqueiosChaveAmbigua)
  const temFechamento = Boolean(preview?.possuiBloqueioFechamento) || fechamentoLines.length > 0
  const temAmbigua = Boolean(preview?.possuiBloqueioChaveAmbigua) || ambiguaLines.length > 0
  return {
    fechamento: fechamentoLines,
    chaveAmbigua: limitDetails(ambiguaLines),
    totalChaveAmbigua: ambiguaLines.length,
    bloqueado: temFechamento || temAmbigua
  }
}
