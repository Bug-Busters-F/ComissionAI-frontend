import { defineStore } from 'pinia'
import { dataService, TIPOS_BASE } from '@/services/dataService'

export const useDataStore = defineStore('data', {
  state: () => ({
    // Lista de competências cadastradas no sistema
    competencias: [
      {
        name: 'Dezembro',
        status: 'Carga rejeitada',
        tone: 'warning',
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Não importado' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Não importado' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Não importado' }
        ]
      },
      {
        name: 'Novembro',
        status: 'Disponível',
        tone: 'success',
        bases: [
          { tipo: 'RH', label: 'RH', value: '5 registros' },
          { tipo: 'VENDAS', label: 'Vendas', value: '5 registros' },
          { tipo: 'COMISS', label: 'Comissão', value: '1 taxa' }
        ]
      },
      {
        name: 'Outubro',
        status: 'Disponível',
        tone: 'success',
        bases: [
          { tipo: 'RH', label: 'RH', value: '5 registros' },
          { tipo: 'VENDAS', label: 'Vendas', value: '5 registros' },
          { tipo: 'COMISS', label: 'Comissão', value: '1 taxa' }
        ]
      }
    ],

    // Estado do Modal de Upload
    uploadModal: {
      isOpen: false,
      tipoBase: 'RH',
      competencia: '12/2025',
      dataInicio: '2025-12-01',
      dataFim: '2025-12-31',
      file: null,
      isLoading: false,
      errorMessage: null,
      report: null,
      cenarioTeste: 'real' // 'real' | 'cenario_impeditivo' | 'cenario_avisos' | 'cenario_sucesso'
    }
  }),

  getters: {
    tipoAtualConfig: (state) => TIPOS_BASE[state.uploadModal.tipoBase] || TIPOS_BASE.RH,
    temErroImpeditivo: (state) => {
      const rep = state.uploadModal.report
      if (!rep) return false
      return rep.rejeicaoIntegral === true || rep.status === 'REJEITADO' || rep.inconsistencias?.some(i => i.severidade === 'IMPEDITIVO')
    },
    podeConcluir: (state) => {
      const rep = state.uploadModal.report
      if (!rep) return false
      const temImpeditivo = rep.rejeicaoIntegral === true || rep.status === 'REJEITADO' || rep.inconsistencias?.some(i => i.severidade === 'IMPEDITIVO')
      return !temImpeditivo && (rep.status === 'SUCESSO' || rep.status === 'PROCESSADO_COM_AVISOS')
    }
  },

  actions: {
    openUploadModal(tipo = 'RH', nomeCompetencia = 'Dezembro') {
      this.uploadModal.isOpen = true
      this.uploadModal.tipoBase = tipo
      this.uploadModal.competencia = nomeCompetencia === 'Dezembro' ? '12/2025' : '11/2025'
      this.uploadModal.dataInicio = '2025-12-01'
      this.uploadModal.dataFim = '2025-12-31'
      this.uploadModal.file = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
    },

    closeUploadModal() {
      this.uploadModal.isOpen = false
      this.uploadModal.file = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
    },

    setTipoBase(tipo) {
      this.uploadModal.tipoBase = tipo
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
    },

    setFile(file) {
      this.uploadModal.file = file
      this.uploadModal.errorMessage = null
    },

    setCenarioTeste(cenario) {
      this.uploadModal.cenarioTeste = cenario
    },

    resetReportParaReenvio() {
      this.uploadModal.report = null
      this.uploadModal.file = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
    },

    async enviarPlanilha() {
      if (!this.uploadModal.file) {
        this.uploadModal.errorMessage = 'Selecione um arquivo .xlsx ou .xls para prosseguir.'
        return
      }

      // Validação de Vigência para COMISS (data fim obrigatória e coerente)
      if (this.uploadModal.tipoBase === 'COMISS') {
        if (!this.uploadModal.dataInicio || !this.uploadModal.dataFim) {
          this.uploadModal.errorMessage = 'As datas de início e término da vigência são obrigatórias para a base de comissões.'
          return
        }
        if (new Date(this.uploadModal.dataFim) < new Date(this.uploadModal.dataInicio)) {
          this.uploadModal.errorMessage = 'A data de término da vigência não pode ser anterior à data de início.'
          return
        }
      }

      // Validação de Competência para RH e VENDAS
      if (this.tipoAtualConfig.precisaCompetencia && !this.uploadModal.competencia) {
        this.uploadModal.errorMessage = 'Informe a competência (MM/AAAA) correspondente aos registros.'
        return
      }

      this.uploadModal.isLoading = true
      this.uploadModal.errorMessage = null

      try {
        const response = await dataService.uploadBase({
          tipoBase: this.uploadModal.tipoBase,
          file: this.uploadModal.file,
          competencia: this.uploadModal.competencia,
          dataInicio: this.uploadModal.dataInicio,
          dataFim: this.uploadModal.dataFim,
          simulacao: this.uploadModal.cenarioTeste
        })

        this.uploadModal.report = response
      } catch (err) {
        console.error('Falha ao enviar arquivo:', err)
        this.uploadModal.errorMessage = err.response?.data?.message || err.message || 'Erro inesperado ao processar a planilha.'
      } finally {
        this.uploadModal.isLoading = false
      }
    },

    concluirCarga() {
      const rep = this.uploadModal.report
      if (!rep) return

      // Atualiza a competência correspondente
      const comp = this.competencias.find(c => c.name === 'Dezembro')
      if (comp) {
        const baseItem = comp.bases.find(b => b.tipo === this.uploadModal.tipoBase)
        if (baseItem) {
          baseItem.value = `${rep.linhasValidas} registros`
          baseItem.statusTone = 'success'
        }

        // Se todas as bases tiverem sido importadas
        const todasOk = comp.bases.every(b => b.value !== 'Não importado' && b.value !== 'Pendente')
        if (todasOk) {
          comp.status = 'Disponível'
          comp.tone = 'success'
        } else {
          comp.status = 'Em andamento'
          comp.tone = 'warning'
        }
      }

      this.closeUploadModal()
    }
  }
})
