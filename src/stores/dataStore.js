import { defineStore } from 'pinia'
import { dataService, TIPOS_BASE } from '@/services/dataService'

export const useDataStore = defineStore('data', {
  state: () => ({
    // Lista de competências cadastradas no sistema
    competencias: [
      {
        name: 'Dezembro',
        competenciaCodigo: '12/2025',
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: '1 taxa ativa' }
        ]
      },
      {
        name: 'Novembro',
        competenciaCodigo: '11/2025',
        status: 'Ciclo Fechado',
        tone: 'success',
        cicloFechado: true,
        bases: [
          { tipo: 'RH', label: 'RH', value: '120 registros' },
          { tipo: 'VENDAS', label: 'Vendas', value: '184 registros' },
          { tipo: 'COMISS', label: 'Comissão', value: '1 taxa ativa' }
        ]
      },
      {
        name: 'Outubro',
        competenciaCodigo: '10/2025',
        status: 'Ciclo Fechado',
        tone: 'success',
        cicloFechado: true,
        bases: [
          { tipo: 'RH', label: 'RH', value: '115 registros' },
          { tipo: 'VENDAS', label: 'Vendas', value: '172 registros' },
          { tipo: 'COMISS', label: 'Comissão', value: '1 taxa ativa' }
        ]
      }
    ],

    // Estado do Modal de Upload
    uploadModal: {
      isOpen: false,
      modo: 'CICLO', // 'CICLO' (RH + Vendas juntos) | 'COMISS' (Taxas com vigência)
      tipoBase: 'CICLO',
      competenciaNome: 'Dezembro',
      competencia: '12/2025',
      // Arquivos do Ciclo
      rhFile: null,
      vendasFile: null,
      // Arquivo de Comissão
      comissFile: null,
      dataInicio: '2025-12-01',
      dataFim: '2025-12-31',
      // Estados de processamento
      isLoading: false,
      errorMessage: null,
      report: null,
      cenarioTeste: 'real' // 'real' | 'cenario_cruzamento' | 'cenario_impeditivo' | 'cenario_avisos' | 'cenario_sucesso'
    }
  }),

  getters: {
    tipoAtualConfig: (state) => TIPOS_BASE[state.uploadModal.tipoBase] || TIPOS_BASE.CICLO,

    podeEnviar: (state) => {
      if (state.uploadModal.modo === 'CICLO') {
        return !!(state.uploadModal.rhFile && state.uploadModal.vendasFile && state.uploadModal.competencia)
      }
      return !!(state.uploadModal.comissFile && state.uploadModal.dataInicio && state.uploadModal.dataFim)
    },

    temErroImpeditivo: (state) => {
      const rep = state.uploadModal.report
      if (!rep) return false
      return (
        rep.rejeicaoIntegral === true ||
        rep.status === 'REJEITADO' ||
        rep.inconsistencias?.some((i) => i.severidade === 'IMPEDITIVO')
      )
    },

    podeConcluir: (state) => {
      const rep = state.uploadModal.report
      if (!rep) return false
      const temImpeditivo =
        rep.rejeicaoIntegral === true ||
        rep.status === 'REJEITADO' ||
        rep.inconsistencias?.some((i) => i.severidade === 'IMPEDITIVO')
      return !temImpeditivo && (rep.status === 'SUCESSO' || rep.status === 'PROCESSADO_COM_AVISOS')
    }
  },

  actions: {
    openCicloModal(nomeCompetencia = 'Dezembro') {
      const codigoMap = {
        Dezembro: '12/2025',
        Novembro: '11/2025',
        Outubro: '10/2025'
      }

      this.uploadModal.isOpen = true
      this.uploadModal.modo = 'CICLO'
      this.uploadModal.tipoBase = 'CICLO'
      this.uploadModal.competenciaNome = nomeCompetencia
      this.uploadModal.competencia = codigoMap[nomeCompetencia] || '12/2025'
      this.uploadModal.rhFile = null
      this.uploadModal.vendasFile = null
      this.uploadModal.comissFile = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
      this.uploadModal.cenarioTeste = 'real'
    },

    openComissModal(nomeCompetencia = 'Dezembro') {
      this.uploadModal.isOpen = true
      this.uploadModal.modo = 'COMISS'
      this.uploadModal.tipoBase = 'COMISS'
      this.uploadModal.competenciaNome = nomeCompetencia
      this.uploadModal.dataInicio = '2025-12-01'
      this.uploadModal.dataFim = '2025-12-31'
      this.uploadModal.rhFile = null
      this.uploadModal.vendasFile = null
      this.uploadModal.comissFile = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
      this.uploadModal.cenarioTeste = 'real'
    },

    openUploadModal(tipo = 'CICLO', nomeCompetencia = 'Dezembro') {
      if (tipo === 'COMISS') {
        this.openComissModal(nomeCompetencia)
      } else {
        this.openCicloModal(nomeCompetencia)
      }
    },

    closeUploadModal() {
      this.uploadModal.isOpen = false
      this.uploadModal.rhFile = null
      this.uploadModal.vendasFile = null
      this.uploadModal.comissFile = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
    },

    setModo(modo) {
      this.uploadModal.modo = modo
      this.uploadModal.tipoBase = modo === 'CICLO' ? 'CICLO' : 'COMISS'
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
    },

    setRhFile(file) {
      this.uploadModal.rhFile = file
      this.uploadModal.errorMessage = null
    },

    setVendasFile(file) {
      this.uploadModal.vendasFile = file
      this.uploadModal.errorMessage = null
    },

    setComissFile(file) {
      this.uploadModal.comissFile = file
      this.uploadModal.errorMessage = null
    },

    setCenarioTeste(cenario) {
      this.uploadModal.cenarioTeste = cenario
    },

    resetReportParaReenvio() {
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
    },

    async enviarDados() {
      this.uploadModal.errorMessage = null

      if (this.uploadModal.modo === 'CICLO') {
        if (!this.uploadModal.rhFile || !this.uploadModal.vendasFile) {
          this.uploadModal.errorMessage =
            'Para fechar o ciclo da competência, o envio de ambas as planilhas (RH e Vendas) é obrigatório.'
          return
        }

        if (!this.uploadModal.competencia) {
          this.uploadModal.errorMessage = 'Informe a competência no formato MM/AAAA (ex: 12/2025).'
          return
        }

        this.uploadModal.isLoading = true

        try {
          const response = await dataService.uploadCiclo({
            rhFile: this.uploadModal.rhFile,
            vendasFile: this.uploadModal.vendasFile,
            competencia: this.uploadModal.competencia,
            simulacao: this.uploadModal.cenarioTeste
          })
          this.uploadModal.report = response
        } catch (err) {
          console.error('Falha ao processar ciclo de bases:', err)
          this.uploadModal.errorMessage =
            err.response?.data?.message || err.message || 'Erro inesperado ao processar o ciclo de planilhas.'
        } finally {
          this.uploadModal.isLoading = false
        }
      } else {
        // Modo COMISS
        if (!this.uploadModal.comissFile) {
          this.uploadModal.errorMessage = 'Selecione a planilha de comissões para prosseguir.'
          return
        }

        if (!this.uploadModal.dataInicio || !this.uploadModal.dataFim) {
          this.uploadModal.errorMessage = 'As datas de início e término da vigência são obrigatórias.'
          return
        }

        if (new Date(this.uploadModal.dataFim) < new Date(this.uploadModal.dataInicio)) {
          this.uploadModal.errorMessage = 'A data de término não pode ser anterior à data de início.'
          return
        }

        this.uploadModal.isLoading = true

        try {
          const response = await dataService.uploadBase({
            tipoBase: 'COMISS',
            file: this.uploadModal.comissFile,
            dataInicio: this.uploadModal.dataInicio,
            dataFim: this.uploadModal.dataFim,
            simulacao: this.uploadModal.cenarioTeste
          })
          this.uploadModal.report = response
        } catch (err) {
          console.error('Falha ao enviar taxas de comissão:', err)
          this.uploadModal.errorMessage =
            err.response?.data?.message || err.message || 'Erro ao processar planilha de comissões.'
        } finally {
          this.uploadModal.isLoading = false
        }
      }
    },

    concluirCarga() {
      const rep = this.uploadModal.report
      if (!rep) return

      const comp = this.competencias.find(
        (c) => c.name === this.uploadModal.competenciaNome || c.competenciaCodigo === this.uploadModal.competencia
      )

      if (comp) {
        if (this.uploadModal.modo === 'CICLO') {
          const rhBase = comp.bases.find((b) => b.tipo === 'RH')
          const vendasBase = comp.bases.find((b) => b.tipo === 'VENDAS')

          if (rhBase) rhBase.value = `${rep.rh?.linhasValidas || 120} registros`
          if (vendasBase) vendasBase.value = `${rep.vendas?.linhasValidas || 184} registros`

          comp.cicloFechado = true
          comp.status = 'Ciclo Fechado'
          comp.tone = 'success'
        } else {
          const comissBase = comp.bases.find((b) => b.tipo === 'COMISS')
          if (comissBase) comissBase.value = `${rep.linhasValidas || 1} taxa ativa`
        }
      }

      this.closeUploadModal()
    }
  }
})
