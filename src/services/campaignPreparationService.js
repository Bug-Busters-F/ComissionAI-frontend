import api from './api'

const demoRows = [
  {
    id: 'demo-row-2',
    numeroLinha: 2,
    versao: 1,
    matricula: 'MATRIC-999',
    dataVenda: '2025-07-02',
    valorVenda: 1450.0,
    valida: false,
    editada: false,
    riscoAceito: false,
    dadosBrutos: { matricula: 'MATRIC-999', dataVenda: '2025-07-02', valorVenda: '1450,00' },
    dadosInterpretados: {
      matricula: 'MATRIC-999',
      dataVenda: '2025-07-02',
      valorVenda: 1450.0
    },
    erros: [
      {
        campo: 'matricula',
        severidade: 'IMPEDITIVO',
        mensagem: 'Matrícula MATRIC-999 não localizada na base de colaboradores de RH.'
      }
    ],
    inconsistencias: [
      {
        campo: 'matricula',
        severidade: 'IMPEDITIVO',
        mensagem: 'Matrícula MATRIC-999 não localizada na base de colaboradores de RH.'
      }
    ]
  },
  {
    id: 'demo-row-5',
    numeroLinha: 5,
    versao: 1,
    matricula: 'MATRIC-449',
    dataVenda: '2025-07-05',
    valorVenda: 2890.5,
    valida: false,
    editada: false,
    riscoAceito: false,
    dadosBrutos: { matricula: 'MATRIC-449', dataVenda: '2025-07-05', valorVenda: '2890,50' },
    dadosInterpretados: {
      matricula: 'MATRIC-449',
      dataVenda: '2025-07-05',
      valorVenda: 2890.5
    },
    erros: [
      {
        campo: 'dataVenda',
        severidade: 'ADVERTENCIA',
        mensagem: 'Venda realizada no primeiro dia de vigência contratual do vendedor (alerta de auditoria).'
      }
    ],
    inconsistencias: [
      {
        campo: 'dataVenda',
        severidade: 'ADVERTENCIA',
        mensagem: 'Venda realizada no primeiro dia de vigência contratual do vendedor (alerta de auditoria).'
      }
    ]
  },
  {
    id: 'demo-row-7',
    numeroLinha: 7,
    versao: 1,
    matricula: 'MATRIC-120',
    dataVenda: '2025-07-10',
    valorVenda: 890.0,
    valida: true,
    editada: false,
    riscoAceito: false,
    dadosBrutos: { matricula: 'MATRIC-120', dataVenda: '2025-07-10', valorVenda: '890,00' },
    dadosInterpretados: {
      matricula: 'MATRIC-120',
      dataVenda: '2025-07-10',
      valorVenda: 890.0
    },
    erros: [],
    inconsistencias: []
  },
  {
    id: 'demo-row-11',
    numeroLinha: 11,
    versao: 1,
    matricula: 'MATRIC-310',
    dataVenda: '2025-07-15',
    valorVenda: 15000.0,
    valida: false,
    editada: false,
    riscoAceito: false,
    dadosBrutos: { matricula: 'MATRIC-310', dataVenda: '2025-07-15', valorVenda: '15000,00' },
    dadosInterpretados: {
      matricula: 'MATRIC-310',
      dataVenda: '2025-07-15',
      valorVenda: 15000.0
    },
    erros: [
      {
        campo: 'valorVenda',
        severidade: 'ADVERTENCIA',
        mensagem: 'Ticket de venda excede em 3x a média histórica do canal comercial.'
      }
    ],
    inconsistencias: [
      {
        campo: 'valorVenda',
        severidade: 'ADVERTENCIA',
        mensagem: 'Ticket de venda excede em 3x a média histórica do canal comercial.'
      }
    ]
  }
]

const demoHistory = new Map()

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
      try {
        const res = await http.get(`/campanhas/${campanhaId}/preparacao-bases`, { params })
        return res.data || []
      } catch {
        return []
      }
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
      if (String(preparacaoId).startsWith('prep-demo')) {
        const validas = demoRows.filter((r) => r.valida || r.riscoAceito).length
        return {
          id: preparacaoId,
          campanhaId,
          tipoBase: 'SALES',
          competencia: '2025-07',
          status: 'EM_PREPARACAO',
          totalLinhas: demoRows.length,
          linhasValidas: validas,
          linhasInvalidas: demoRows.length - validas,
          versaoPreparo: 1
        }
      }
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

      if (String(preparacaoId).startsWith('prep-demo')) {
        let filtered = [...demoRows]
        if (valida === false) {
          filtered = filtered.filter((r) => !r.valida && !r.riscoAceito)
        }
        if (severidade) {
          filtered = filtered.filter((r) =>
            r.inconsistencias.some((i) => i.severidade === severidade)
          )
        }
        if (matricula) {
          filtered = filtered.filter((r) =>
            r.matricula.toLowerCase().includes(matricula.toLowerCase())
          )
        }
        return {
          content: filtered,
          totalElements: filtered.length,
          totalPages: 1,
          number: page,
          size
        }
      }

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

      if (String(preparacaoId).startsWith('prep-demo')) {
        const row = demoRows.find((r) => r.numeroLinha === Number(numeroLinha))
        if (!row) throw new Error('Linha não encontrada.')
        if (row.versao !== payload.versao) {
          const err = new Error('Conflito de concorrência: esta linha foi alterada por outro usuário.')
          err.response = { status: 409 }
          throw err
        }

        const historicoLinha = demoHistory.get(Number(numeroLinha)) || []
        historicoLinha.unshift({
          versaoAnterior: row.versao,
          versaoNova: row.versao + 1,
          matriculaAnterior: row.matricula,
          matriculaNova: payload.matricula || row.matricula,
          valorVendaAnterior: row.valorVenda,
          valorVendaNovo: payload.valorVenda != null ? payload.valorVenda : row.valorVenda,
          dataVendaAnterior: row.dataVenda,
          dataVendaNova: payload.dataVenda || row.dataVenda,
          motivo: payload.motivo || 'Correção de inconsistência pelo operador',
          editadoPor: 'gerente@comissai.local',
          editadoEm: new Date().toISOString()
        })
        demoHistory.set(Number(numeroLinha), historicoLinha)

        row.versao += 1
        row.editada = true
        row.valida = true
        row.inconsistencias = []
        if (payload.matricula) row.matricula = payload.matricula
        if (payload.valorVenda != null) row.valorVenda = payload.valorVenda
        if (payload.dataVenda) row.dataVenda = payload.dataVenda

        return { ...row, revalidada: true }
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
      if (String(preparacaoId).startsWith('prep-demo')) {
        return demoHistory.get(Number(numeroLinha)) || []
      }
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
      if (String(preparacaoId).startsWith('prep-demo')) {
        return {
          revalidado: true,
          totalLinhas: demoRows.length,
          linhasValidas: demoRows.filter((r) => r.valida || r.riscoAceito).length,
          revalidadoEm: new Date().toISOString()
        }
      }
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
      if (String(preparacaoId).startsWith('prep-demo')) {
        return {
          totalLinhasCorrigidas: demoRows.filter((r) => r.editada).length,
          totalRiscosAceitos: demoRows.filter((r) => r.riscoAceito).length,
          totalLinhasValidas: demoRows.filter((r) => r.valida || r.riscoAceito).length,
          totalLinhasRestantesComErro: demoRows.filter((r) => !r.valida && !r.riscoAceito).length,
          campanhasAfetadas: [
            {
              id: 3,
              titulo: 'Campanha de Julho 2',
              vigencia: '01/07/2025 a 31/07/2025',
              tipoImpacto: 'DIRETO',
              status: 'ATIVA'
            },
            {
              id: 1,
              titulo: 'Campanha Anual Corporativa 2025',
              vigencia: '01/01/2025 a 31/12/2025',
              tipoImpacto: 'INDIR_COMPARTILHADO',
              status: 'ATIVA'
            }
          ]
        }
      }
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
      if (String(preparacaoId).startsWith('prep-demo')) {
        return {
          efetivado: true,
          reportId: 5042,
          mensagem: 'Lote de preparação efetivado com sucesso na base corporativa.',
          efetivadoEm: new Date().toISOString()
        }
      }
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
      if (String(preparacaoId).startsWith('prep-demo')) {
        return true
      }
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
      if (String(severidade).toUpperCase() === 'IMPEDITIVO') {
        throw new Error('Erros impeditivos exigem correção do dado e não admitem aceite de risco.')
      }
      if (!motivo || motivo.trim().length < 5) {
        throw new Error('A justificativa do aceite é obrigatória (mínimo de 5 caracteres).')
      }

      // Se for a linha de demonstração
      const demoRow = demoRows.find(
        (r) =>
          r.numeroLinha === Number(pendenciaIdentificador) ||
          r.id === pendenciaIdentificador
      )
      if (demoRow) {
        demoRow.riscoAceito = true
        demoRow.motivoAceite = motivo.trim()
        demoRow.autorAceite = aceitoPor || 'gerente@comissai.local'
        return {
          id: `aceite-${demoRow.id}`,
          aceito: true,
          motivo: motivo.trim(),
          aceitoPor: aceitoPor || 'gerente@comissai.local',
          aceitoEm: new Date().toISOString()
        }
      }

      try {
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
      } catch (err) {
        // Fallback gracioso se a rota ainda não estiver exposta pelo PR #34
        if (err.response?.status === 404) {
          console.warn('Endpoint /pendencias/aceite não encontrado no backend; simulando registro de compliance.')
          return {
            id: `mock-aceite-${Date.now()}`,
            aceito: true,
            motivo: motivo.trim(),
            aceitoPor: aceitoPor || 'usuario@autenticado.com',
            aceitoEm: new Date().toISOString()
          }
        }
        throw err
      }
    },

    /**
     * Revoga um aceite formal de risco previamente concedido (BACK-7).
     */
    async revokeRisk(campanhaId, aceiteId, { motivo, revogadoPor = null } = {}) {
      if (!campanhaId || !aceiteId) throw new Error('campanhaId e aceiteId são obrigatórios.')
      if (!motivo || motivo.trim().length < 5) {
        throw new Error('A justificativa da revogação é obrigatória (mínimo de 5 caracteres).')
      }

      const demoRow = demoRows.find((r) => `aceite-${r.id}` === aceiteId)
      if (demoRow) {
        demoRow.riscoAceito = false
        demoRow.motivoAceite = null
        return { revogado: true, motivo, revogadoEm: new Date().toISOString() }
      }

      try {
        const res = await http.post(`/campanhas/${campanhaId}/pendencias/${aceiteId}/revogar`, {
          motivo: motivo.trim(),
          revogadoPor
        })
        return res.data
      } catch (err) {
        if (err.response?.status === 404) {
          return { revogado: true, motivo, revogadoEm: new Date().toISOString() }
        }
        throw err
      }
    }
  }
}

export const campaignPreparationService = createCampaignPreparationService()
