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
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
        ]
      },
      {
        name: 'Novembro',
        competenciaCodigo: '11/2025',
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
        ]
      },
      {
        name: 'Outubro',
        competenciaCodigo: '10/2025',
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
        ]
      },
      {
        name: 'Setembro',
        competenciaCodigo: '09/2025',
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
        ]
      },
      {
        name: 'Agosto',
        competenciaCodigo: '08/2025',
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
        ]
      },
      {
        name: 'Julho',
        competenciaCodigo: '07/2025',
        status: 'Ciclo com pendências',
        tone: 'warning',
        cicloFechado: false,
        bases: [
          { tipo: 'RH', label: 'RH', value: 'Pendente' },
          { tipo: 'VENDAS', label: 'Vendas', value: 'Pendente' },
          { tipo: 'COMISS', label: 'Comissão', value: 'Pendente' }
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
    },

    // Aba ativa no DataView: 'EFETIVADOS' | 'ENVIOS'
    tabAtiva: 'EFETIVADOS',

    // Histórico de Envios e seus relatórios de validação
    enviosHistorico: [
      {
        id: 'env-1',
        tipoBase: 'CICLO_MENSAL',
        competencia: '12/2025',
        competenciaNome: 'Dezembro',
        nomeArquivo: 'BASE_RH_2025.xlsx & BASE_VENDAS_2025.xlsx',
        criadoEm: '2026-09-22T21:40:00.000Z',
        totalLinhas: 304,
        linhasValidas: 296,
        status: 'REJEITADO',
        rejeicaoIntegral: true,
        report: {
          isCiclo: true,
          competencia: '12/2025',
          nomeArquivo: 'BASE_RH_2025.xlsx & BASE_VENDAS_2025.xlsx',
          tipoBase: 'CICLO_MENSAL',
          status: 'REJEITADO',
          totalLinhas: 304,
          linhasValidas: 296,
          rejeicaoIntegral: true,
          rh: {
            nomeArquivo: 'BASE_RH_2025.xlsx',
            totalLinhas: 120,
            linhasValidas: 120,
            status: 'SUCESSO'
          },
          vendas: {
            nomeArquivo: 'BASE_VENDAS_2025.xlsx',
            totalLinhas: 184,
            linhasValidas: 176,
            status: 'REJEITADO'
          },
          inconsistencias: [
            {
              base: 'CRUZAMENTO',
              linha: 14,
              campo: 'matricula_vendedor',
              motivo: 'Matrícula "VEND-9921" apontada na base de Vendas não foi localizada no cadastro de RH da competência 12/2025 (integridade relacional violada).',
              severidade: 'IMPEDITIVO'
            },
            {
              base: 'CRUZAMENTO',
              linha: 29,
              campo: 'cod_filial',
              motivo: 'Vendedor "VEND-8812" consta com filial "SÃO PAULO" em Vendas, mas no RH ativo da competência está lotado em "CAMPINAS".',
              severidade: 'IMPEDITIVO'
            },
            {
              base: 'VENDAS',
              linha: 45,
              campo: 'canal',
              motivo: 'Canal de venda não preenchido; atribuído canal padrão LOJA_FISICA.',
              severidade: 'AVISO'
            }
          ],
          processadoEm: '2026-09-22T21:40:00.000Z'
        }
      },
      {
        id: 'env-2',
        tipoBase: 'CICLO_MENSAL',
        competencia: '11/2025',
        competenciaNome: 'Novembro',
        nomeArquivo: 'BASE_RH_NOV2025.xlsx & BASE_VENDAS_NOV2025.xlsx',
        criadoEm: '2026-09-15T14:20:00.000Z',
        totalLinhas: 304,
        linhasValidas: 304,
        status: 'SUCESSO',
        rejeicaoIntegral: false,
        report: {
          isCiclo: true,
          competencia: '11/2025',
          nomeArquivo: 'BASE_RH_NOV2025.xlsx & BASE_VENDAS_NOV2025.xlsx',
          tipoBase: 'CICLO_MENSAL',
          status: 'SUCESSO',
          totalLinhas: 304,
          linhasValidas: 304,
          rejeicaoIntegral: false,
          rh: {
            nomeArquivo: 'BASE_RH_NOV2025.xlsx',
            totalLinhas: 120,
            linhasValidas: 120,
            status: 'SUCESSO'
          },
          vendas: {
            nomeArquivo: 'BASE_VENDAS_NOV2025.xlsx',
            totalLinhas: 184,
            linhasValidas: 184,
            status: 'SUCESSO'
          },
          inconsistencias: [],
          processadoEm: '2026-09-15T14:20:00.000Z'
        }
      },
      {
        id: 'env-3',
        tipoBase: 'TAXAS_BASE',
        competencia: '12/2025',
        competenciaNome: 'Dezembro',
        nomeArquivo: 'TAXAS_COMISSAO_2025.xlsx',
        criadoEm: '2026-09-20T10:00:00.000Z',
        totalLinhas: 5,
        linhasValidas: 5,
        status: 'SUCESSO',
        rejeicaoIntegral: false,
        report: {
          isCiclo: false,
          competencia: '12/2025',
          nomeArquivo: 'TAXAS_COMISSAO_2025.xlsx',
          tipoBase: 'TAXAS_BASE',
          status: 'SUCESSO',
          totalLinhas: 5,
          linhasValidas: 5,
          rejeicaoIntegral: false,
          inconsistencias: [],
          processadoEm: '2026-09-20T10:00:00.000Z'
        }
      }
    ],

    // Estado da Consulta de Dados Efetivados (S1-B18)
    dadosEfetivados: {
      tipoBaseAtiva: 'RH', // 'RH' | 'VENDAS' | 'COMISS'
      competenciaFiltro: 'TODAS',
      termoBusca: '',
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
      loading: false,
      itens: [],
      error: null
    },

    // Modal de confirmação de exclusão
    modalExclusao: {
      isOpen: false,
      tipo: 'REGISTRO', // 'REGISTRO' | 'BASE_COMPETENCIA' | 'ENVIO'
      titulo: '',
      mensagem: '',
      detalhes: '',
      item: null,
      loading: false
    },

    // Modal para exibição de relatório de validação de envio anterior
    modalRelatorioEnvio: {
      isOpen: false,
      envio: null
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

          // Registra no histórico de envios
          this.adicionarAoHistoricoEnvios({
            tipoBase: 'CICLO_MENSAL',
            competencia: compCodigo,
            competenciaNome: compNome,
            nomeArquivo: `${rhFile.name} & ${vendasFile.name}`,
            totalLinhas: response.totalLinhas || (response.rh?.totalLinhas || 0) + (response.vendas?.totalLinhas || 0),
            linhasValidas: response.linhasValidas || (response.rh?.linhasValidas || 0) + (response.vendas?.linhasValidas || 0),
            status: response.status,
            rejeicaoIntegral: response.rejeicaoIntegral === true,
            report: response
          })

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

          // Registra no histórico de envios
          this.adicionarAoHistoricoEnvios({
            tipoBase: 'TAXAS_BASE',
            competencia: this.uploadModal.competencia || '12/2025',
            competenciaNome: this.uploadModal.competenciaNome || 'Dezembro',
            nomeArquivo: comissFile.name,
            totalLinhas: response.totalLinhas || 1,
            linhasValidas: response.linhasValidas || 1,
            status: response.status,
            rejeicaoIntegral: response.rejeicaoIntegral === true,
            report: response
          })

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
      this.carregarDadosEfetivados()
    },

    // ==========================================
    // AÇÕES DE CONSULTA E EXCLUSÃO (S1-B18)
    // ==========================================

    adicionarAoHistoricoEnvios(envioData) {
      const novo = {
        id: 'env-' + Date.now(),
        criadoEm: new Date().toISOString(),
        ...envioData
      }
      this.enviosHistorico.unshift(novo)
    },

    setTabAtiva(tab) {
      this.tabAtiva = tab
      if (tab === 'EFETIVADOS' && this.dadosEfetivados.itens.length === 0) {
        this.carregarDadosEfetivados()
      }
    },

    mudarTipoBaseEfetivados(tipo) {
      this.dadosEfetivados.tipoBaseAtiva = tipo
      this.dadosEfetivados.page = 0
      this.carregarDadosEfetivados()
    },

    mudarPaginaEfetivados(newPage) {
      if (newPage < 0 || newPage >= this.dadosEfetivados.totalPages) return
      this.dadosEfetivados.page = newPage
      this.carregarDadosEfetivados()
    },

    mudarTamanhoPaginaEfetivados(newSize) {
      this.dadosEfetivados.size = Number(newSize)
      this.dadosEfetivados.page = 0
      this.carregarDadosEfetivados()
    },

    setTermoBusca(termo) {
      this.dadosEfetivados.termoBusca = termo
      this.dadosEfetivados.page = 0
      this.carregarDadosEfetivados()
    },

    setCompetenciaFiltro(comp) {
      this.dadosEfetivados.competenciaFiltro = comp
      this.dadosEfetivados.page = 0
      this.carregarDadosEfetivados()
    },

    /**
     * Sincroniza em tempo real as competências e contadores com o banco PostgreSQL.
     * Garante que após F5 ou exclusão, os cards reflitam com precisão o estado real do banco.
     */
    async sincronizarCompetenciasComBanco() {
      try {
        const resumo = await dataService.fetchResumoCompetencias()
        if (!resumo) return

        const totalRh = resumo.totalMatriculas || 0
        const totalComiss = resumo.totalComissoes || 0
        const vendasMap = resumo.vendasPorCompetencia || {}

        this.competencias.forEach((comp) => {
          const cod = comp.competenciaCodigo?.trim()
          const vendasQtd = cod && vendasMap[cod] != null ? Number(vendasMap[cod]) : 0

          const rhBase = comp.bases.find((b) => b.tipo === 'RH')
          const vendasBase = comp.bases.find((b) => b.tipo === 'VENDAS')
          const comissBase = comp.bases.find((b) => b.tipo === 'COMISS')

          // VENDAS
          if (vendasBase) {
            vendasBase.value = vendasQtd > 0 ? `${vendasQtd.toLocaleString('pt-BR')} registros` : 'Pendente'
          }

          // RH (Quadro ativo)
          if (rhBase) {
            rhBase.value = totalRh > 0 ? `${totalRh.toLocaleString('pt-BR')} registros` : 'Pendente'
          }

          // COMISS (Taxas ativas)
          if (comissBase) {
            comissBase.value = totalComiss > 0 ? `${totalComiss} taxas` : 'Pendente'
          }

          // Status do Ciclo: Fechado se houver vendas daquela competência no banco
          if (vendasQtd > 0) {
            comp.status = 'Ciclo Fechado'
            comp.tone = 'success'
            comp.cicloFechado = true
          } else {
            comp.status = 'Ciclo com pendências'
            comp.tone = 'warning'
            comp.cicloFechado = false
          }
        })
      } catch (err) {
        console.error('Falha ao sincronizar competências com o banco:', err)
      }
    },

    async carregarDadosEfetivados() {
      // Sincroniza os contadores das competências em paralelo
      this.sincronizarCompetenciasComBanco()

      this.dadosEfetivados.loading = true
      this.dadosEfetivados.error = null
      const tipo = this.dadosEfetivados.tipoBaseAtiva
      const page = this.dadosEfetivados.page
      const size = this.dadosEfetivados.size
      const competencia = this.dadosEfetivados.competenciaFiltro

      try {
        if (tipo === 'RH') {
          const data = await dataService.fetchMatriculas({ page, size })
          let content = data.content || []
          
          if (this.dadosEfetivados.termoBusca) {
            const termo = this.dadosEfetivados.termoBusca.toLowerCase().trim()
            content = content.filter(it => 
              (it.registration && it.registration.toLowerCase().includes(termo)) ||
              (it.position?.description && it.position.description.toLowerCase().includes(termo)) ||
              (it.store?.description && it.store.description.toLowerCase().includes(termo))
            )
          }

          this.dadosEfetivados.itens = content
          this.dadosEfetivados.totalElements = data.totalElements ?? content.length
          this.dadosEfetivados.totalPages = data.totalPages ?? Math.ceil(this.dadosEfetivados.totalElements / size)
        } else if (tipo === 'VENDAS') {
          const data = await dataService.fetchVendas({ page, size, competencia })
          let content = data.content || []

          if (this.dadosEfetivados.termoBusca) {
            const termo = this.dadosEfetivados.termoBusca.toLowerCase().trim()
            content = content.filter(it =>
              (it.registration?.registration && it.registration.registration.toLowerCase().includes(termo)) ||
              (it.brand?.description && it.brand.description.toLowerCase().includes(termo)) ||
              (it.store?.description && it.store.description.toLowerCase().includes(termo)) ||
              (it.saleChannel && it.saleChannel.toLowerCase().includes(termo))
            )
          }

          this.dadosEfetivados.itens = content
          this.dadosEfetivados.totalElements = data.totalElements ?? content.length
          this.dadosEfetivados.totalPages = data.totalPages ?? Math.ceil(this.dadosEfetivados.totalElements / size)
        } else {
          // COMISS
          const data = await dataService.fetchComissoes({ page, size })
          let content = data.content || []

          if (this.dadosEfetivados.termoBusca) {
            const termo = this.dadosEfetivados.termoBusca.toLowerCase().trim()
            content = content.filter(it =>
              (it.cargo && it.cargo.toLowerCase().includes(termo)) ||
              (it.marca && it.marca.toLowerCase().includes(termo))
            )
          }

          this.dadosEfetivados.itens = content
          this.dadosEfetivados.totalElements = data.totalElements ?? content.length
          this.dadosEfetivados.totalPages = data.totalPages ?? Math.ceil(this.dadosEfetivados.totalElements / size)
        }
      } catch (err) {
        console.error('Falha ao carregar dados efetivados:', err)
        this.dadosEfetivados.error = err.message || 'Erro ao carregar dados do servidor Spring Boot.'
        this.dadosEfetivados.itens = []
        this.dadosEfetivados.totalElements = 0
        this.dadosEfetivados.totalPages = 0
      } finally {
        this.dadosEfetivados.loading = false
      }
    },

    abrirModalExclusaoRegistro(tipo, item) {
      let desc = ''
      if (tipo === 'VENDAS') {
        const val = item.value != null ? Number(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'
        desc = `Venda ID: ${item.id ? item.id.substring(0, 8) + '...' : ''} | Matrícula: ${item.registration?.registration || '-'} | Valor: ${val}`
      } else if (tipo === 'RH') {
        desc = `Matrícula: ${item.registration || item.id} | Cargo: ${item.position?.description || '-'} | Loja: ${item.store?.description || '-'}`
      } else {
        desc = `Taxa: ${item.cargo} | Marca: ${item.marca} | ${(item.percentual * 100).toFixed(2)}%`
      }

      this.modalExclusao = {
        isOpen: true,
        tipo: 'REGISTRO',
        titulo: `Excluir Registro de ${tipo}`,
        mensagem: 'Deseja realmente excluir este registro permanentemente do banco de dados?',
        detalhes: desc,
        item: { ...item, tipo },
        loading: false
      }
    },

    abrirModalExclusaoBase(competenciaCodigo) {
      const comp = this.competencias.find(c => c.competenciaCodigo === competenciaCodigo)
      const nome = comp?.name || competenciaCodigo
      this.modalExclusao = {
        isOpen: true,
        tipo: 'BASE_COMPETENCIA',
        titulo: `Excluir Base Lançada (${nome} - ${competenciaCodigo})`,
        mensagem: `Deseja realmente excluir os registros da competência ${competenciaCodigo}? Todas as vendas correspondentes serão excluídas permanentemente do banco de dados relacional e o ciclo voltará ao status Pendente.`,
        detalhes: `Competência ${competenciaCodigo} (${nome})`,
        item: { competenciaCodigo, nome },
        loading: false
      }
    },

    abrirModalExclusaoTodasVendas() {
      this.modalExclusao = {
        isOpen: true,
        tipo: 'TODAS_VENDAS',
        titulo: 'Excluir Todas as Vendas',
        mensagem: 'Deseja realmente remover TODAS as vendas de todas as competências do banco de dados? Esta ação liberará as matrículas para exclusão e reiniciará os ciclos.',
        detalhes: 'Limpeza global de tb_sales no PostgreSQL',
        item: null,
        loading: false
      }
    },

    abrirModalExclusaoTodasMatriculas() {
      this.modalExclusao = {
        isOpen: true,
        tipo: 'TODAS_MATRICULAS',
        titulo: 'Excluir Todas as Matrículas (RH)',
        mensagem: 'Deseja remover todas as matrículas do banco de dados? Para concluir esta ação, certifique-se de que não existem vendas vinculadas.',
        detalhes: 'Limpeza global de tb_registration no PostgreSQL',
        item: null,
        loading: false
      }
    },

    abrirModalExclusaoEnvio(envio) {
      this.modalExclusao = {
        isOpen: true,
        tipo: 'ENVIO',
        titulo: 'Excluir Envio do Histórico',
        mensagem: 'Deseja remover este registro de envio do histórico da aplicação?',
        detalhes: `Arquivo: ${envio.nomeArquivo} (${envio.competencia || 'Sem competência'})`,
        item: envio,
        loading: false
      }
    },

    fecharModalExclusao() {
      this.modalExclusao.isOpen = false
      this.modalExclusao.item = null
      this.modalExclusao.loading = false
    },

    async confirmarExclusao() {
      const notifStore = useNotificationStore()
      this.modalExclusao.loading = true

      try {
        if (this.modalExclusao.tipo === 'REGISTRO') {
          const tipo = this.modalExclusao.item?.tipo || this.dadosEfetivados.tipoBaseAtiva
          const id = this.modalExclusao.item?.id
          if (!id) throw new Error('ID do registro não informado.')

          if (tipo === 'VENDAS') {
            await dataService.deleteVenda(id)
            notifStore.success('Venda Excluída', 'O registro de venda foi removido com sucesso do banco de dados.')
          } else if (tipo === 'RH') {
            await dataService.deleteMatricula(id)
            notifStore.success('Matrícula Excluída', 'A matrícula foi removida com sucesso.')
          } else {
            await dataService.deleteComissao(id)
            notifStore.success('Taxa Excluída', 'A taxa de comissão foi removida com sucesso.')
          }

          this.fecharModalExclusao()
          await this.carregarDadosEfetivados()
        } else if (this.modalExclusao.tipo === 'BASE_COMPETENCIA') {
          const compCodigo = this.modalExclusao.item?.competenciaCodigo
          const res = await dataService.deleteVendasPorCompetencia(compCodigo)

          const comp = this.competencias.find(c => c.competenciaCodigo === compCodigo)
          if (comp) {
            comp.status = 'Ciclo com pendências'
            comp.tone = 'warning'
            comp.cicloFechado = false
            const vb = comp.bases.find(b => b.tipo === 'VENDAS')
            if (vb) vb.value = 'Pendente'
          }

          this.enviosHistorico = this.enviosHistorico.filter(e => e.competencia !== compCodigo)
          const totalExc = res?.totalExcluido ?? 0
          notifStore.success(
            'Base Excluída do Banco',
            `A base de vendas da competência ${compCodigo} foi excluída com sucesso (${totalExc} registros removidos de tb_sales).`
          )
          this.fecharModalExclusao()
          await this.carregarDadosEfetivados()
        } else if (this.modalExclusao.tipo === 'TODAS_VENDAS') {
          const res = await dataService.deleteTodasVendas()
          this.competencias.forEach(comp => {
            comp.status = 'Ciclo com pendências'
            comp.tone = 'warning'
            comp.cicloFechado = false
            const vb = comp.bases.find(b => b.tipo === 'VENDAS')
            if (vb) vb.value = 'Pendente'
          })

          const totalExc = res?.totalExcluido ?? 0
          notifStore.success(
            'Vendas Limpas',
            `Todas as vendas (${totalExc} registros) foram excluídas com sucesso do banco de dados.`
          )
          this.fecharModalExclusao()
          await this.carregarDadosEfetivados()
        } else if (this.modalExclusao.tipo === 'TODAS_MATRICULAS') {
          const res = await dataService.deleteTodasMatriculas()
          this.competencias.forEach(comp => {
            const rh = comp.bases.find(b => b.tipo === 'RH')
            if (rh) rh.value = 'Pendente'
          })

          const totalExc = res?.totalExcluido ?? 0
          notifStore.success(
            'Matrículas Limpas',
            `Todas as matrículas (${totalExc} registros) foram excluídas com sucesso do banco de dados.`
          )
          this.fecharModalExclusao()
          await this.carregarDadosEfetivados()
        } else if (this.modalExclusao.tipo === 'ENVIO') {
          const id = this.modalExclusao.item?.id
          this.enviosHistorico = this.enviosHistorico.filter(e => e.id !== id)
          notifStore.success('Envio Excluído', 'O registro de envio foi removido do histórico com sucesso.')
          this.fecharModalExclusao()
        }
      } catch (err) {
        console.error('Falha na exclusão:', err)
        const msg = err.message || 'Falha ao processar exclusão.'
        notifStore.error('Erro na Exclusão', msg)
      } finally {
        this.modalExclusao.loading = false
      }
    },

    abrirRelatorioEnvio(envio) {
      this.modalRelatorioEnvio = {
        isOpen: true,
        envio
      }
    },

    fecharRelatorioEnvio() {
      this.modalRelatorioEnvio = {
        isOpen: false,
        envio: null
      }
    }
  }
})
