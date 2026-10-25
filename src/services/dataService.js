import api from './api'
import { importBatchService } from './importBatchService'
import { normalizeCompetence, extractCompetenceFromFileName, getCompetenceDateRange } from './competenceUtils'

/**
 * Mapeamento dos tipos de base e modalidades aceitos pela aplicação
 */
export const TIPOS_BASE = {
  CICLO: {
    codigo: 'CICLO_MENSAL',
    nome: 'Ciclo Mensal (RH + Vendas)',
    descricao: 'Envio conjunto obrigatório das bases de RH e Vendas para fechamento da competência e cruzamento relacional.',
    precisaCompetencia: true,
    precisaVigencia: false
  },
  RH: {
    codigo: 'RH',
    nome: 'Recursos Humanos',
    descricao: 'Colaboradores, matrículas, cargos e filiais ativas no mês.',
    precisaCompetencia: true,
    precisaVigencia: false
  },
  VENDAS: {
    codigo: 'VENDAS',
    nome: 'Vendas',
    descricao: 'Histórico de transações, pedidos e valores faturados por vendedor.',
    precisaCompetencia: true,
    precisaVigencia: false
  },
  COMISS: {
    codigo: 'TAXAS_BASE',
    alias: 'COMISS',
    nome: 'Comissões & Taxas Base',
    descricao: 'Estrutura de taxas percentuais por cargo e marca com vigência obrigatória.',
    precisaCompetencia: false,
    precisaVigencia: true
  }
}

/**
 * Gera mocks realistas para validação de ciclo conjunto (RH + Vendas)
 */
function gerarMockRelatorioCiclo(nomeRh, nomeVendas, competencia = '12/2025', cenario = 'cenario_cruzamento') {
  const agora = new Date().toISOString()
  const arqRh = nomeRh || 'BASE_RH_2025.xlsx'
  const arqVendas = nomeVendas || 'BASE_VENDAS_2025.xlsx'

  if (cenario === 'cenario_sucesso') {
    return {
      isCiclo: true,
      competencia,
      nomeArquivo: `${arqRh} & ${arqVendas}`,
      tipoBase: 'CICLO_MENSAL',
      status: 'SUCESSO',
      totalLinhas: 304,
      linhasValidas: 304,
      rejeicaoIntegral: false,
      rh: {
        nomeArquivo: arqRh,
        totalLinhas: 120,
        linhasValidas: 120,
        status: 'SUCESSO'
      },
      vendas: {
        nomeArquivo: arqVendas,
        totalLinhas: 184,
        linhasValidas: 184,
        status: 'SUCESSO'
      },
      inconsistencias: [],
      processadoEm: agora
    }
  }

  if (cenario === 'cenario_avisos') {
    return {
      isCiclo: true,
      competencia,
      nomeArquivo: `${arqRh} & ${arqVendas}`,
      tipoBase: 'CICLO_MENSAL',
      status: 'PROCESSADO_COM_AVISOS',
      totalLinhas: 304,
      linhasValidas: 304,
      rejeicaoIntegral: false,
      rh: {
        nomeArquivo: arqRh,
        totalLinhas: 120,
        linhasValidas: 120,
        status: 'PROCESSADO_COM_AVISOS'
      },
      vendas: {
        nomeArquivo: arqVendas,
        totalLinhas: 184,
        linhasValidas: 184,
        status: 'PROCESSADO_COM_AVISOS'
      },
      inconsistencias: [
        {
          base: 'RH',
          linha: 18,
          campo: 'descr_cargo',
          motivo: 'Nome do cargo com formatação em caixa baixa; ajustado automaticamente para maiúsculas.',
          severidade: 'AVISO'
        },
        {
          base: 'VENDAS',
          linha: 33,
          campo: 'canal',
          motivo: 'Canal de venda não informado; preenchido automaticamente com o padrão LOJA_FISICA.',
          severidade: 'AVISO'
        }
      ],
      processadoEm: agora
    }
  }

  if (cenario === 'cenario_impeditivo') {
    return {
      isCiclo: true,
      competencia,
      nomeArquivo: `${arqRh} & ${arqVendas}`,
      tipoBase: 'CICLO_MENSAL',
      status: 'REJEITADO',
      totalLinhas: 304,
      linhasValidas: 285,
      rejeicaoIntegral: true,
      rh: {
        nomeArquivo: arqRh,
        totalLinhas: 120,
        linhasValidas: 110,
        status: 'REJEITADO'
      },
      vendas: {
        nomeArquivo: arqVendas,
        totalLinhas: 184,
        linhasValidas: 175,
        status: 'REJEITADO'
      },
      inconsistencias: [
        {
          base: 'RH',
          linha: 7,
          campo: 'matricula',
          motivo: 'Matrícula duplicada encontrada para a mesma competência.',
          severidade: 'IMPEDITIVO'
        },
        {
          base: 'VENDAS',
          linha: 22,
          campo: 'valor_venda',
          motivo: 'Valor de venda negativo ou em formato monetário inválido (-R$ 350,00).',
          severidade: 'IMPEDITIVO'
        }
      ],
      processadoEm: agora
    }
  }

  // Padrão do Ciclo: Cenário de Erro de Cruzamento Relacional (RH x Vendas)
  return {
    isCiclo: true,
    competencia,
    nomeArquivo: `${arqRh} & ${arqVendas}`,
    tipoBase: 'CICLO_MENSAL',
    status: 'REJEITADO',
    totalLinhas: 304,
    linhasValidas: 296,
    rejeicaoIntegral: true,
    rh: {
      nomeArquivo: arqRh,
      totalLinhas: 120,
      linhasValidas: 120,
      status: 'SUCESSO'
    },
    vendas: {
      nomeArquivo: arqVendas,
      totalLinhas: 184,
      linhasValidas: 176,
      status: 'REJEITADO'
    },
    inconsistencias: [
      {
        base: 'CRUZAMENTO',
        linha: 14,
        campo: 'matricula_vendedor',
        motivo: 'Matrícula "VEND-9921" apontada na base de Vendas não foi localizada no cadastro de RH da competência ' + competencia + ' (integridade relacional violada).',
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
    processadoEm: agora
  }
}

/**
 * Gera mocks realistas para base avulsa (ex: COMISS)
 */
function gerarMockRelatorio(tipoBase, nomeArquivo, cenario = 'cenario_impeditivo') {
  const agora = new Date().toISOString()

  if (cenario === 'cenario_sucesso') {
    return {
      nomeArquivo: nomeArquivo || `BASE_${tipoBase}_2025.xlsx`,
      tipoBase,
      status: 'SUCESSO',
      totalLinhas: 184,
      linhasValidas: 184,
      rejeicaoIntegral: false,
      inconsistencias: [],
      processadoEm: agora
    }
  }

  if (cenario === 'cenario_avisos') {
    return {
      nomeArquivo: nomeArquivo || `BASE_${tipoBase}_2025.xlsx`,
      tipoBase,
      status: 'PROCESSADO_COM_AVISOS',
      totalLinhas: 120,
      linhasValidas: 120,
      rejeicaoIntegral: false,
      inconsistencias: [
        {
          base: tipoBase,
          linha: 12,
          campo: 'canal',
          motivo: 'Canal não preenchido; atribuído canal padrão LOJA_FISICA.',
          severidade: 'AVISO'
        },
        {
          base: tipoBase,
          linha: 35,
          campo: 'descr_loja',
          motivo: 'Descrição da filial em branco; preenchido automaticamente com nome cadastrado.',
          severidade: 'AVISO'
        }
      ],
      processadoEm: agora
    }
  }

  return {
    nomeArquivo: nomeArquivo || `BASE_${tipoBase}_2025.xlsx`,
    tipoBase,
    status: 'REJEITADO',
    totalLinhas: 95,
    linhasValidas: 90,
    rejeicaoIntegral: true,
    inconsistencias: [
      {
        base: tipoBase,
        linha: 7,
        campo: tipoBase === 'RH' ? 'matricula' : tipoBase === 'VENDAS' ? 'valor_venda' : 'percentual_comissao',
        motivo: tipoBase === 'RH' 
          ? 'Matrícula duplicada encontrada para a mesma competência.' 
          : tipoBase === 'VENDAS' 
            ? 'Valor de venda negativo ou em formato monetário inválido.' 
            : 'Percentual de comissão superior ao teto permitido ou nulo.',
        severidade: 'IMPEDITIVO'
      },
      {
        base: tipoBase,
        linha: 24,
        campo: tipoBase === 'COMISS' ? 'vigencia' : 'data_ref',
        motivo: tipoBase === 'COMISS'
          ? 'Sobreposição de vigência detectada para o mesmo cargo e marca.'
          : 'Data de referência fora do intervalo da competência informada.',
        severidade: 'IMPEDITIVO'
      }
    ],
    processadoEm: agora
  }
}

/**
 * Converte identificadores de base do front para o enum ImportType esperado pelo Spring Boot:
 * HR, SALES, COMISSIONS
 */
export function mapTipoBaseToImportType(tipo) {
  if (!tipo) return 'HR'
  const t = String(tipo).toUpperCase().trim()
  if (t === 'RH' || t === 'HR') return 'HR'
  if (t === 'VENDAS' || t === 'SALES') return 'SALES'
  if (t === 'COMISS' || t === 'COMISSIONS' || t === 'TAXAS_BASE') return 'COMISSIONS'
  return t
}

export const dataService = {
  async listSalesPage({ page = 0, size = 100, signal } = {}) {
    const response = await api.get('/vendas', { params: { page, size }, signal })
    return response.data
  },

  async listAllSales({ size = 100, signal } = {}) {
    const sales = []
    let page = 0
    let response

    do {
      response = await this.listSalesPage({ page, size, signal })
      const content = Array.isArray(response) ? response : response?.content || []
      sales.push(...content)

      const totalPages = Number(response?.totalPages)
      const hasNextPage = Number.isFinite(totalPages) && totalPages > 0
        ? page + 1 < totalPages
        : content.length >= size

      if (!hasNextPage) break
      page += 1
    } while (page < 1000)

    return sales
  },

  /**
   * Envia o ciclo conjunto de forma sequencial (RH primeiro, depois Vendas)
   * emitindo progresso a cada etapa
   */
  async uploadCicloSequencial({
    rhFile,
    vendasFile,
    competencia,
    simulacao = 'real',
    onProgress = null,
    signal = null
  }) {
    if (simulacao && simulacao !== 'real') {
      onProgress?.({
        stage: 'RH',
        progress: 25,
        message: 'Validando estrutura da base de RH...'
      })
      await new Promise((r) => setTimeout(r, 600))

      onProgress?.({
        stage: 'VENDAS',
        progress: 65,
        message: 'Base de RH validada. Processando base de Vendas...'
      })
      await new Promise((r) => setTimeout(r, 600))

      onProgress?.({
        stage: 'CRUZAMENTO',
        progress: 95,
        message: 'Cruzando integridade relacional entre RH e Vendas...'
      })
      await new Promise((r) => setTimeout(r, 400))

      return gerarMockRelatorioCiclo(rhFile?.name, vendasFile?.name, competencia, simulacao)
    }

    // Mantém a detecção e o relatório da dev, com confirmação estrita do lote.
    const normalizedComp = normalizeCompetence(competencia) ||
      normalizeCompetence(extractCompetenceFromFileName(vendasFile?.name)) ||
      normalizeCompetence(extractCompetenceFromFileName(rhFile?.name))
    if (!normalizedComp) throw new Error('Informe uma competência válida no formato MM/AAAA.')
    if (!rhFile || !vendasFile) throw new Error('Anexe as duas planilhas: RH e Vendas.')
    const process = (file, importType, stage, progress) => importBatchService.upload({
      file, importType, competencia: normalizedComp, signal, allowFailedReport: true,
      onStatus: (report) => onProgress?.({ stage, progress, message: `${stage}: ${report.status.toLowerCase()} (lote #${report.reportId}). ${report.mensagem || ''}` })
    })
    onProgress?.({ stage: 'RH', progress: 15, message: `Enviando e processando base de RH (${rhFile.name})...` })
    const respRh = await process(rhFile, 'HR', 'RH', 30)

    if (respRh?.status === 'FALHOU') {
      const motivoRh = respRh.mensagem || 'A importação da base de RH falhou (possível matrícula duplicada ou erro estrutural).'
      return {
        isCiclo: true,
        competencia: normalizedComp,
        nomeArquivo: `${rhFile.name} & ${vendasFile.name}`,
        tipoBase: 'CICLO_MENSAL',
        status: 'REJEITADO',
        totalLinhas: 0,
        linhasValidas: 0,
        rejeicaoIntegral: true,
        rh: {
          reportId: respRh.reportId,
          nomeArquivo: rhFile.name,
          totalLinhas: 0,
          linhasValidas: 0,
          status: 'REJEITADO'
        },
        vendas: {
          nomeArquivo: vendasFile.name,
          totalLinhas: 0,
          linhasValidas: 0,
          status: 'PENDENTE'
        },
        inconsistencias: [
          {
            base: 'RH',
            linha: '-',
            campo: 'Planilha de RH',
            motivo: motivoRh,
            severidade: 'IMPEDITIVO'
          }
        ],
        processadoEm: new Date().toISOString()
      }
    }

    // 2. Etapa 2: Envio da base de Vendas (somente após RH concluir no banco)
    const rhLinhas = respRh?.totalLinhas ?? respRh?.linhasValidas ?? 0
    onProgress?.({
      stage: 'VENDAS',
      progress: 55,
      message: `RH processado (${rhLinhas} registros). Enviando base de Vendas (${vendasFile.name})...`
    })

    let respVendas
    try {
      respVendas = await process(vendasFile, 'SALES', 'VENDAS', 70)
    } catch (error) {
      const partial = new Error(`RH confirmado (relatório ${respRh.reportId}). Vendas não confirmadas: ${error.message} O RH permanece no banco; tente novamente após corrigir o problema.`)
      partial.cause = error; partial.reportId = error.reportId; partial.code = error.code
      partial.completedImports = [respRh]
      throw partial
    }

    if (respVendas?.status === 'FALHOU') {
      const motivoVendas = respVendas.mensagem || 'A importação da base de Vendas falhou na validação relacional.'
      return {
        isCiclo: true,
        competencia: normalizedComp,
        nomeArquivo: `${rhFile.name} & ${vendasFile.name}`,
        tipoBase: 'CICLO_MENSAL',
        status: 'REJEITADO',
        totalLinhas: rhLinhas,
        linhasValidas: 0,
        rejeicaoIntegral: false,
        rh: {
          reportId: respRh.reportId,
          nomeArquivo: rhFile.name,
          totalLinhas: rhLinhas,
          linhasValidas: rhLinhas,
          status: 'SUCESSO'
        },
        vendas: {
          reportId: respVendas.reportId,
          nomeArquivo: vendasFile.name,
          totalLinhas: 0,
          linhasValidas: 0,
          status: 'REJEITADO'
        },
        inconsistencias: [
          {
            base: 'VENDAS',
            linha: '-',
            campo: 'Planilha de Vendas',
            motivo: motivoVendas,
            severidade: 'IMPEDITIVO'
          }
        ],
        processadoEm: new Date().toISOString()
      }
    }

    // 3. Etapa 3: Consolidação dos resultados com sucesso
    const vendasLinhas = respVendas?.totalLinhas ?? respVendas?.linhasValidas ?? 0
    const totalGeral = rhLinhas + vendasLinhas

    onProgress?.({
      stage: 'CONCLUIDO',
      progress: 100,
      message: `Ciclo concluído com sucesso! (RH: ${rhLinhas} | Vendas: ${vendasLinhas})`
    })

    return {
      isCiclo: true,
      competencia: normalizedComp,
      nomeArquivo: `${respRh?.nomeArquivo || rhFile.name} & ${respVendas?.nomeArquivo || vendasFile.name}`,
      tipoBase: 'CICLO_MENSAL',
      status: 'SUCESSO',
      totalLinhas: totalGeral,
      linhasValidas: totalGeral,
      rejeicaoIntegral: false,
      reportIds: [respRh.reportId, respVendas.reportId],
      mensagens: [respRh.mensagem, respVendas.mensagem].filter(Boolean),
      rh: {
        reportId: respRh.reportId,
        nomeArquivo: respRh?.nomeArquivo || rhFile.name,
        totalLinhas: rhLinhas,
        linhasValidas: rhLinhas,
        status: 'SUCESSO'
      },
      vendas: {
        reportId: respVendas.reportId,
        nomeArquivo: respVendas?.nomeArquivo || vendasFile.name,
        totalLinhas: vendasLinhas,
        linhasValidas: vendasLinhas,
        status: 'SUCESSO'
      },
      inconsistencias: [],
      processadoEm: new Date().toISOString()
    }
  },

  /**
   * Alias de compatibilidade para upload do ciclo
   */
  async uploadCiclo(params) {
    return this.uploadCicloSequencial(params)
  },

  /**
   * Envia uma planilha avulsa para validação e carga (ex: COMISS com vigência)
   */
  async excluirLote(reportId, motivo = 'Exclusão solicitada pelo usuário') {
    const response = await api.delete(`/imports/${reportId}`, {
      data: { motivo }
    })
    return response.data
  },

  async uploadBase({
    tipoBase,
    file,
    competencia,
    dataInicio,
    dataFim,
    substituirBase = false,
    simulacao = 'real',
    onProgress = null,
    signal = null
  }) {
    if (simulacao && simulacao !== 'real') {
      onProgress?.({ stage: 'ENVIO', progress: 50, message: 'Validando planilha...' })
      await new Promise((r) => setTimeout(r, 600))
      return gerarMockRelatorio(tipoBase, file?.name, simulacao)
    }

    const importType = mapTipoBaseToImportType(tipoBase)
    const normalizedComp =
      normalizeCompetence(competencia) ||
      normalizeCompetence(String(dataInicio || '').slice(0, 7)) ||
      normalizeCompetence(extractCompetenceFromFileName(file?.name))

    if (importType !== 'HR' && !normalizedComp) throw new Error('Informe uma competência válida para a importação.')

    if (importType === 'COMISSIONS' && dataInicio && dataFim && dataInicio.slice(0, 7) !== dataFim.slice(0, 7)) {
      throw new Error('Importe as taxas de uma competência por vez; selecione datas do mesmo mês.')
    }

    // Se solicitado a substituição da base existente para COMISSIONS, remove lotes concluídos anteriores da mesma competência
    if (substituirBase && normalizedComp && importType === 'COMISSIONS') {
      try {
        const lotesRes = await api.get('/imports', {
          params: { tipoBase: 'COMISSIONS', competencia: normalizedComp, status: 'CONCLUIDO' },
          signal
        })
        const items = Array.isArray(lotesRes.data?.content)
          ? lotesRes.data.content
          : Array.isArray(lotesRes.data)
            ? lotesRes.data
            : []
        for (const lote of items) {
          if (lote.reportId) {
            onProgress?.({
              stage: 'LIMPEZA',
              progress: 25,
              message: `Removendo base anterior da competência ${normalizedComp} (lote #${lote.reportId})...`
            })
            await this.excluirLote(lote.reportId, 'Substituição pelo usuário')
          }
        }
      } catch (error) {
        throw new Error(`Não foi possível substituir a base anterior: ${error.response?.data?.message || error.message}`)
      }
    }

    onProgress?.({ stage: 'ENVIO', progress: 35, message: `Enviando planilha ${file.name} (${importType})...` })
    const data = await importBatchService.upload({
      file, importType, competencia: normalizedComp, signal, allowFailedReport: true,
      onStatus: (report) => onProgress?.({ stage: 'ENVIO', progress: 60, message: `Importação: ${report.status.toLowerCase()} (lote #${report.reportId}). ${report.mensagem || ''}` })
    })

    if (data?.status === 'FALHOU') {
      const motivo = data.mensagem || 'Não foi possível concluir a importação da planilha.'
      return {
        reportId: data.reportId,
        competencia: normalizedComp,
        nomeArquivo: data.nomeArquivo || file.name,
        tipoBase: data.tipoBase || importType,
        status: 'REJEITADO',
        totalLinhas: 0,
        linhasValidas: 0,
        rejeicaoIntegral: true,
        inconsistencias: [
          {
            base: tipoBase,
            linha: '-',
            campo: 'Planilha',
            motivo,
            severidade: 'IMPEDITIVO'
          }
        ],
        processadoEm: new Date().toISOString()
      }
    }

    const total = data?.totalLinhas ?? 0

    onProgress?.({
      stage: 'CONCLUIDO',
      progress: 100,
      message: `Base processada com sucesso! (${total} linhas)`
    })

    return {
      reportId: data.reportId,
      competencia: normalizedComp,
      mensagens: [data.mensagem].filter(Boolean),
      nomeArquivo: data?.nomeArquivo || file.name,
      tipoBase: data?.tipoBase || importType,
      status: 'SUCESSO',
      totalLinhas: total,
      linhasValidas: total,
      rejeicaoIntegral: false,
      inconsistencias: [],
      processadoEm: new Date().toISOString()
    }
  },

  // ==========================================
  // CONSULTA DE DADOS EFETIVADOS
  // ==========================================

  /**
   * Obtém o resumo consolidado de contagens por competência diretamente do banco
   */
  async fetchResumoCompetencias() {
    try {
      const response = await api.get('/vendas/resumo-competencias')
      return response.data
    } catch (err) {
      console.warn('Endpoint /vendas/resumo-competencias falhou ou indisponível:', err)
      return null
    }
  },

  async fetchCompetenciasReferencia() {
    try {
      const response = await api.get('/referencias/competencias')
      if (!Array.isArray(response.data)) throw new Error('Resposta inválida ao consultar competências.')
      return response.data
    } catch (error) {
      if ([404, 501].includes(error.response?.status)) return null
      throw error
    }
  },

  /**
   * Consulta a base efetivada de Matrículas (RH) com paginação do Spring Boot
   */
  async fetchMatriculas({ page = 0, size = 20 }) {
    return (await api.get('/matriculas', { params: { page, size } })).data
  },

  async deleteMatricula(id) {
    try {
      await api.delete(`/matriculas/${id}`)
      return true
    } catch (err) {
      throw err
    }
  },

  /**
   * Exclui todas as matrículas cadastradas (se não houver vendas vinculadas)
   */
  async deleteTodasMatriculas() {
    try {
      const response = await api.delete('/matriculas/todas')
      return response.data
    } catch (err) {
      throw err
    }
  },

  /**
   * Consulta a base efetivada de Vendas com paginação e filtro opcional por competência (MM/AAAA)
   */
  async fetchVendas({ page = 0, size = 20, competencia = null }) {
    try {
      const params = { page, size }
      if (competencia && competencia !== 'TODAS') {
        params.competencia = competencia.trim()
      }
      const response = await api.get('/vendas', { params })
      return response.data
    } catch (err) {
      throw err
    }
  },

  /**
   * Exclui uma venda efetivada pelo ID (UUID)
   */
  async deleteVenda(id) {
    try {
      await api.delete(`/vendas/${id}`)
      return true
    } catch (err) {
      throw err
    }
  },

  /**
   * Exclui todas as vendas pertencentes a uma competência específica (ex: '09/2025')
   */
  async deleteVendasPorCompetencia(competenciaCodigo) {
    if (!competenciaCodigo) throw new Error('Código de competência obrigatório.')
    const parts = String(competenciaCodigo).trim().split('/')
    if (parts.length !== 2) {
      throw new Error('Formato de competência inválido. Esperado MM/AAAA (ex: 09/2025).')
    }
    const mes = parseInt(parts[0], 10)
    const ano = parseInt(parts[1], 10)

    try {
      const response = await api.delete(`/vendas/competencia/${mes}/${ano}`)
      return response.data
    } catch (err) {
      throw err
    }
  },

  /**
   * Exclui todas as vendas registradas no banco de dados
   */
  async deleteTodasVendas() {
    try {
      const response = await api.delete('/vendas/todas')
      return response.data
    } catch (err) {
      throw err
    }
  },

  /**
   * Consulta as taxas de comissão ativas (COMISS) com fallback elegante e seguro para dados do sistema
   */
  async fetchComissoes({ page = 0, size = 20 } = {}) {
    const { data } = await api.get('/bases-comissao', { params: { page, size } })
    return {
      ...data,
      content: (data.content || []).map((item) => ({
        ...item, cargo: item.descriCargo, marca: item.descrMarca,
        percentual: item.percentual,
        vigenciaInicio: item.mesReferencia,
        vigenciaFim: getCompetenceDateRange(item.mesReferencia?.slice(0, 7)).dataFim
      }))
    }
  },

  /**
   * Exclui uma taxa de comissão pelo ID
   */
  async deleteComissao(id) {
    try {
      await api.delete(`/bases-comissao/${id}`)
      return true
    } catch (err) {
      throw err
    }
  },

  /**
   * Exclui todas as taxas de comissão
   */
  async deleteTodasComissoes() {
    const response = await api.delete('/bases-comissao/todas')
    return response.data
  }
}
