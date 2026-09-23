import { defineStore } from 'pinia'
import { dataService, TIPOS_BASE } from '@/services/dataService'
import { useNotificationStore } from '@/stores/notificationStore'

export const MESES_NOMES = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
}

/**
 * Converte um código como "08/2025" ou "8/2025" no nome correspondente do mês ("Agosto")
 */
export function formatarNomeCompetencia(codigo) {
  if (!codigo) return 'Competência'
  const parts = String(codigo).trim().split('/')
  if (parts.length === 2) {
    const mes = parts[0].padStart(2, '0')
    const nomeMes = MESES_NOMES[mes]
    if (nomeMes) return nomeMes
  }
  return codigo
}

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
    },

    // Processamento assíncrono em segundo plano (desacoplado do modal)
    activeJob: {
      isActive: false,
      modo: 'CICLO',
      competencia: '',
      competenciaNome: '',
      stage: '',
      progress: 0,
      message: '',
      status: 'IDLE', // 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'
      report: null,
      error: null,
      rhFileName: '',
      vendasFileName: '',
      comissFileName: '',
      startTime: null
    }
  }),

  getters: {
    tipoAtualConfig: (state) => TIPOS_BASE[state.uploadModal.tipoBase] || TIPOS_BASE.CICLO,

    nomeCompetenciaFormatada: (state) => {
      return formatarNomeCompetencia(state.uploadModal.competencia)
    },

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
    },

    temJobAtivo: (state) => state.activeJob.isActive
  },

  actions: {
    /**
     * Localiza a competência pelo código (ex: '08/2025') ou cria um novo card no grid
     * caso o usuário esteja fechando um ciclo de uma competência ainda não listada
     */
    obterOuCriarCompetencia(codigo) {
      if (!codigo) return null
      const codTrim = String(codigo).trim()

      // 1. Procura primeiro pelo código exato (ex: '08/2025')
      let comp = this.competencias.find((c) => c.competenciaCodigo === codTrim)
      if (comp) return comp

      // 2. Se não existir, extrai o nome do mês e cria uma nova competência
      const nomeMes = formatarNomeCompetencia(codTrim)

      comp = {
        name: nomeMes,
        competenciaCodigo: codTrim,
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
        ]
      }

      // 3. Adiciona no início da lista para visualização imediata
      this.competencias.unshift(comp)
      return comp
    },

    onCompetenciaChange(valor) {
      this.uploadModal.competencia = valor
      if (valor && valor.includes('/')) {
        this.uploadModal.competenciaNome = formatarNomeCompetencia(valor)
      }
    },

    openCicloModal(param = null) {
      let compCodigo = '12/2025'
      let compNome = 'Dezembro'

      if (param) {
        if (param.includes('/')) {
          compCodigo = param
          compNome = formatarNomeCompetencia(param)
        } else {
          const codigoMap = {
            Dezembro: '12/2025',
            Novembro: '11/2025',
            Outubro: '10/2025',
            Setembro: '09/2025',
            Agosto: '08/2025',
            Julho: '07/2025'
          }
          compNome = param
          compCodigo = codigoMap[param] || '12/2025'
        }
      } else {
        // Se chamado sem parâmetro (botão superior "+ Enviar ciclo"), sugere agosto ou mês livre
        compCodigo = '08/2025'
        compNome = 'Agosto'
      }

      this.uploadModal.isOpen = true
      this.uploadModal.modo = 'CICLO'
      this.uploadModal.tipoBase = 'CICLO'
      this.uploadModal.competenciaNome = compNome
      this.uploadModal.competencia = compCodigo

      // Se houver um job ativo para esta competência específica, exibe o progresso em tempo real
      if (this.activeJob.isActive && this.activeJob.competencia === compCodigo) {
        this.uploadModal.isLoading = this.activeJob.status === 'PROCESSING'
        this.uploadModal.report = this.activeJob.report
        this.uploadModal.errorMessage = this.activeJob.error
        return
      }

      this.uploadModal.rhFile = null
      this.uploadModal.vendasFile = null
      this.uploadModal.comissFile = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
      this.uploadModal.cenarioTeste = 'real'
    },

    openComissModal(param = null) {
      let compCodigo = '12/2025'
      let compNome = 'Dezembro'

      if (param) {
        if (param.includes('/')) {
          compCodigo = param
          compNome = formatarNomeCompetencia(param)
        } else {
          compNome = param
        }
      }

      this.uploadModal.isOpen = true
      this.uploadModal.modo = 'COMISS'
      this.uploadModal.tipoBase = 'COMISS'
      this.uploadModal.competenciaNome = compNome
      this.uploadModal.competencia = compCodigo
      this.uploadModal.dataInicio = '2025-12-01'
      this.uploadModal.dataFim = '2025-12-31'

      if (this.activeJob.isActive && this.activeJob.modo === 'COMISS') {
        this.uploadModal.isLoading = this.activeJob.status === 'PROCESSING'
        this.uploadModal.report = this.activeJob.report
        this.uploadModal.errorMessage = this.activeJob.error
        return
      }

      this.uploadModal.rhFile = null
      this.uploadModal.vendasFile = null
      this.uploadModal.comissFile = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
      this.uploadModal.cenarioTeste = 'real'
    },

    openUploadModal(tipo = 'CICLO', param = null) {
      if (tipo === 'COMISS') {
        this.openComissModal(param)
      } else {
        this.openCicloModal(param)
      }
    },

    closeUploadModal() {
      const notifStore = useNotificationStore()

      // Se um processo estiver ativo em background, apenas minimiza sem cancelar
      if (this.activeJob.isActive && this.activeJob.status === 'PROCESSING') {
        this.uploadModal.isOpen = false
        notifStore.info(
          'Processamento em Segundo Plano',
          `O ciclo ${this.activeJob.competencia} continua sendo processado. Acompanhe o progresso no topo da tela.`
        )
        return
      }

      this.uploadModal.isOpen = false
      this.uploadModal.rhFile = null
      this.uploadModal.vendasFile = null
      this.uploadModal.comissFile = null
      this.uploadModal.report = null
      this.uploadModal.errorMessage = null
      this.uploadModal.isLoading = false
    },

    minimizarModal() {
      const notifStore = useNotificationStore()
      this.uploadModal.isOpen = false
      notifStore.info(
        'Modo Segundo Plano Ativado',
        `A validação do ciclo ${this.activeJob.competencia} prossegue no servidor. Você pode continuar trabalhando normalmente.`
      )
    },

    reabrirModalComStatus() {
      this.uploadModal.isOpen = true
      if (this.activeJob.modo === 'COMISS') {
        this.uploadModal.modo = 'COMISS'
        this.uploadModal.tipoBase = 'COMISS'
      } else {
        this.uploadModal.modo = 'CICLO'
        this.uploadModal.tipoBase = 'CICLO'
      }
      this.uploadModal.competenciaNome = this.activeJob.competenciaNome || this.uploadModal.competenciaNome
      this.uploadModal.competencia = this.activeJob.competencia || this.uploadModal.competencia
      this.uploadModal.isLoading = this.activeJob.status === 'PROCESSING'
      this.uploadModal.report = this.activeJob.report || this.uploadModal.report
      this.uploadModal.errorMessage = this.activeJob.error || this.uploadModal.errorMessage
    },

    limparJobConcluido() {
      this.activeJob = {
        isActive: false,
        modo: 'CICLO',
        competencia: '',
        competenciaNome: '',
        stage: '',
        progress: 0,
        message: '',
        status: 'IDLE',
        report: null,
        error: null,
        rhFileName: '',
        vendasFileName: '',
        comissFileName: '',
        startTime: null
      }
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
      this.limparJobConcluido()
    },

    async enviarDados() {
      const notifStore = useNotificationStore()
      this.uploadModal.errorMessage = null

      if (this.uploadModal.modo === 'CICLO') {
        if (!this.uploadModal.rhFile || !this.uploadModal.vendasFile) {
          this.uploadModal.errorMessage =
            'Para fechar o ciclo da competência, o envio de ambas as planilhas (RH e Vendas) é obrigatório.'
          return
        }

        if (!this.uploadModal.competencia) {
          this.uploadModal.errorMessage = 'Informe a competência no formato MM/AAAA (ex: 08/2025).'
          return
        }

        const compCodigo = this.uploadModal.competencia.trim()
        const compNome = formatarNomeCompetencia(compCodigo)
        this.uploadModal.competenciaNome = compNome

        const rhFile = this.uploadModal.rhFile
        const vendasFile = this.uploadModal.vendasFile
        const cenario = this.uploadModal.cenarioTeste

        this.uploadModal.isLoading = true

        // Inicializa o Job Ativo em Segundo Plano
        this.activeJob = {
          isActive: true,
          modo: 'CICLO',
          competencia: compCodigo,
          competenciaNome: compNome,
          stage: 'INICIO',
          progress: 5,
          message: `Iniciando validação sequencial do ciclo ${compCodigo}...`,
          status: 'PROCESSING',
          report: null,
          error: null,
          rhFileName: rhFile.name,
          vendasFileName: vendasFile.name,
          comissFileName: '',
          startTime: Date.now()
        }

        // Obtém a competência existente ou CRIA UM NOVO CARD no grid
        const comp = this.obterOuCriarCompetencia(compCodigo)
        if (comp) {
          comp.status = 'Processando bases...'
          comp.tone = 'warning'
        }

        notifStore.info(
          'Upload do Ciclo Iniciado',
          `Processamento iniciado para a competência ${compCodigo}. As bases de RH e Vendas estão sendo validadas.`,
          {
            duration: 5000,
            actionLabel: 'Ver Andamento',
            onAction: () => this.reabrirModalComStatus()
          }
        )

        try {
          const response = await dataService.uploadCicloSequencial({
            rhFile,
            vendasFile,
            competencia: compCodigo,
            simulacao: cenario,
            onProgress: (p) => {
              if (this.activeJob.isActive) {
                this.activeJob.stage = p.stage
                this.activeJob.progress = p.progress
                this.activeJob.message = p.message
              }
            }
          })

          this.uploadModal.report = response
          this.activeJob.report = response

          if (response.status === 'SUCESSO') {
            this.activeJob.status = 'SUCCESS'
            this.activeJob.progress = 100
            this.activeJob.message = 'Ciclo mensal validado e fechado com sucesso!'

            // Atualiza a competência específica (criada ou existente) com os dados reais
            const targetComp = this.obterOuCriarCompetencia(compCodigo)
            if (targetComp) {
              const rhBase = targetComp.bases.find((b) => b.tipo === 'RH')
              const vendasBase = targetComp.bases.find((b) => b.tipo === 'VENDAS')
              if (rhBase) rhBase.value = `${response.rh?.totalLinhas || response.rh?.linhasValidas || 0} registros`
              if (vendasBase) vendasBase.value = `${response.vendas?.totalLinhas || response.vendas?.linhasValidas || 0} registros`

              targetComp.cicloFechado = true
              targetComp.status = 'Ciclo Fechado'
              targetComp.tone = 'success'
            }

            notifStore.success(
              'Ciclo Fechado com Sucesso!',
              `Competência ${compCodigo}: ${response.rh?.totalLinhas || 0} colaboradores e ${response.vendas?.totalLinhas || 0} vendas persistidos.`,
              {
                duration: 9000,
                actionLabel: 'Ver Relatório',
                onAction: () => this.reabrirModalComStatus()
              }
            )
          } else {
            this.activeJob.status = 'ERROR'
            this.activeJob.progress = 100
            this.activeJob.message = 'Inconsistências encontradas nas bases enviadas.'

            const targetComp = this.obterOuCriarCompetencia(compCodigo)
            if (targetComp) {
              targetComp.status = 'Ciclo com pendências'
              targetComp.tone = 'danger'
            }

            notifStore.error(
              'Inconsistências no Ciclo',
              `O envio da competência ${compCodigo} foi rejeitado devido a falhas estruturais ou relacionais.`,
              {
                duration: 10000,
                actionLabel: 'Ver Diagnóstico',
                onAction: () => this.reabrirModalComStatus()
              }
            )
          }
        } catch (err) {
          console.error('Falha ao processar ciclo de bases:', err)
          const msg = err.response?.data?.message || err.message || 'Erro inesperado ao processar o ciclo de planilhas.'
          this.uploadModal.errorMessage = msg
          this.activeJob.status = 'ERROR'
          this.activeJob.error = msg
          this.activeJob.message = 'Erro durante o processamento do ciclo.'

          const targetComp = this.obterOuCriarCompetencia(compCodigo)
          if (targetComp) {
            targetComp.status = 'Ciclo com pendências'
            targetComp.tone = 'danger'
          }

          notifStore.error(
            'Falha no Processamento',
            msg,
            {
              duration: 9000,
              actionLabel: 'Ver Detalhes',
              onAction: () => this.reabrirModalComStatus()
            }
          )
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

        const comissFile = this.uploadModal.comissFile
        const dataInicio = this.uploadModal.dataInicio
        const dataFim = this.uploadModal.dataFim
        const cenario = this.uploadModal.cenarioTeste

        this.uploadModal.isLoading = true

        this.activeJob = {
          isActive: true,
          modo: 'COMISS',
          competencia: '',
          competenciaNome: this.uploadModal.competenciaNome,
          stage: 'ENVIO',
          progress: 15,
          message: `Enviando taxas de comissão (${comissFile.name})...`,
          status: 'PROCESSING',
          report: null,
          error: null,
          rhFileName: '',
          vendasFileName: '',
          comissFileName: comissFile.name,
          startTime: Date.now()
        }

        notifStore.info(
          'Upload de Taxas Iniciado',
          `Planilha de comissões enviada para processamento em segundo plano.`,
          {
            duration: 4000,
            actionLabel: 'Ver Andamento',
            onAction: () => this.reabrirModalComStatus()
          }
        )

        try {
          const response = await dataService.uploadBase({
            tipoBase: 'COMISS',
            file: comissFile,
            dataInicio,
            dataFim,
            simulacao: cenario,
            onProgress: (p) => {
              if (this.activeJob.isActive) {
                this.activeJob.stage = p.stage
                this.activeJob.progress = p.progress
                this.activeJob.message = p.message
              }
            }
          })

          this.uploadModal.report = response
          this.activeJob.report = response

          if (response.status === 'SUCESSO') {
            this.activeJob.status = 'SUCCESS'
            this.activeJob.progress = 100
            this.activeJob.message = 'Taxas de comissão salvas com sucesso!'

            const comp = this.competencias.find(
              (c) => c.name === this.uploadModal.competenciaNome
            )
            if (comp) {
              const comissBase = comp.bases.find((b) => b.tipo === 'COMISS')
              if (comissBase) comissBase.value = `${response.totalLinhas || 1} taxas ativas`
            }

            notifStore.success(
              'Taxas de Comissão Processadas',
              `${response.totalLinhas || 0} regras de comissão válidas persistidas no backend.`,
              {
                duration: 8000,
                actionLabel: 'Ver Relatório',
                onAction: () => this.reabrirModalComStatus()
              }
            )
          } else {
            this.activeJob.status = 'ERROR'
            this.activeJob.progress = 100
            this.activeJob.message = 'Falha ao processar taxas de comissão.'

            notifStore.error(
              'Falha nas Taxas de Comissão',
              'O arquivo enviado contém erros estruturais.',
              {
                duration: 9000,
                actionLabel: 'Ver Diagnóstico',
                onAction: () => this.reabrirModalComStatus()
              }
            )
          }
        } catch (err) {
          console.error('Falha ao enviar taxas de comissão:', err)
          const msg = err.response?.data?.message || err.message || 'Erro ao processar planilha de comissões.'
          this.uploadModal.errorMessage = msg
          this.activeJob.status = 'ERROR'
          this.activeJob.error = msg

          notifStore.error('Falha no Envio', msg)
        } finally {
          this.uploadModal.isLoading = false
        }
      }
    },

    concluirCarga() {
      const rep = this.uploadModal.report
      if (!rep) return

      const compCodigo = this.uploadModal.competencia?.trim()
      const comp = this.obterOuCriarCompetencia(compCodigo)

      if (comp) {
        if (this.uploadModal.modo === 'CICLO') {
          const rhBase = comp.bases.find((b) => b.tipo === 'RH')
          const vendasBase = comp.bases.find((b) => b.tipo === 'VENDAS')

          if (rhBase) rhBase.value = `${rep.rh?.linhasValidas || rep.rh?.totalLinhas || 0} registros`
          if (vendasBase) vendasBase.value = `${rep.vendas?.linhasValidas || rep.vendas?.totalLinhas || 0} registros`

          comp.cicloFechado = true
          comp.status = 'Ciclo Fechado'
          comp.tone = 'success'
        } else {
          const comissBase = comp.bases.find((b) => b.tipo === 'COMISS')
          if (comissBase) comissBase.value = `${rep.linhasValidas || rep.totalLinhas || 1} taxa ativa`
        }
      }

      this.limparJobConcluido()
      this.closeUploadModal()
    }
  }
})
