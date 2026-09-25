import api from './api'

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
          motivo: 'Matrícula duplicada encontrada na mesma competência (bloqueio uk_rh_competencia_matricula).',
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
          ? 'Matrícula duplicada encontrada na mesma competência (bloqueio uk_rh_competencia_matricula).' 
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

    // ==========================================
    // FLUXO REAL SEQUENCIAL VIA BACKEND (8080)
    // ==========================================

    // 1. Etapa 1: Envio da base de RH
    onProgress?.({
      stage: 'RH',
      progress: 15,
      message: 'Enviando e processando base de RH (1/2)...'
    })

    const formRh = new FormData()
    formRh.append('file', rhFile)

    let respRh
    try {
      const httpRespRh = await api.post('/imports/upload', formRh, {
        params: { importType: 'HR' },
        headers: { 'Content-Type': 'multipart/form-data' },
        signal
      })
      respRh = httpRespRh.data
    } catch (err) {
      console.error('Falha no upload da base de RH:', err)
      const motivo =
        err.response?.data?.message ||
        (err.response?.status ? `Erro ${err.response.status} ao processar RH` : 'Servidor Spring Boot inatingível')
      
      const relatorioErro = {
        isCiclo: true,
        competencia,
        nomeArquivo: `${rhFile.name} & ${vendasFile.name}`,
        tipoBase: 'CICLO_MENSAL',
        status: 'REJEITADO',
        totalLinhas: 0,
        linhasValidas: 0,
        rejeicaoIntegral: true,
        rh: {
          nomeArquivo: rhFile.name,
          totalLinhas: 0,
          linhasValidas: 0,
          status: 'REJEITADO'
        },
        vendas: {
          nomeArquivo: vendasFile.name,
          totalLinhas: 0,
          linhasValidas: 0,
          status: 'NAO_ENVIADO'
        },
        inconsistencias: [
          {
            base: 'RH',
            linha: 1,
            campo: 'arquivo',
            motivo: `Falha crítica no processamento da base de RH: ${motivo}. A base de Vendas não foi processada para preservar a integridade.`,
            severidade: 'IMPEDITIVO'
          }
        ],
        processadoEm: new Date().toISOString()
      }
      return relatorioErro
    }

    // 2. Etapa 2: Envio da base de Vendas (RH já persistido no banco)
    const rhLinhas = respRh.totalLinhas ?? 0
    onProgress?.({
      stage: 'VENDAS',
      progress: 55,
      message: `RH processado (${rhLinhas} registros). Enviando base de Vendas (2/2)...`
    })

    const formVendas = new FormData()
    formVendas.append('file', vendasFile)

    let respVendas
    try {
      const httpRespVendas = await api.post('/imports/upload', formVendas, {
        params: { importType: 'SALES' },
        headers: { 'Content-Type': 'multipart/form-data' },
        signal
      })
      respVendas = httpRespVendas.data
    } catch (err) {
      console.error('Falha no upload da base de Vendas:', err)
      const motivo =
        err.response?.data?.message ||
        (err.response?.status ? `Erro ${err.response.status} ao processar Vendas` : 'Erro no processamento de vendas')

      const relatorioErro = {
        isCiclo: true,
        competencia,
        nomeArquivo: `${rhFile.name} & ${vendasFile.name}`,
        tipoBase: 'CICLO_MENSAL',
        status: 'REJEITADO',
        totalLinhas: rhLinhas,
        linhasValidas: rhLinhas,
        rejeicaoIntegral: true,
        rh: {
          nomeArquivo: rhFile.name,
          totalLinhas: rhLinhas,
          linhasValidas: rhLinhas,
          status: 'SUCESSO'
        },
        vendas: {
          nomeArquivo: vendasFile.name,
          totalLinhas: 0,
          linhasValidas: 0,
          status: 'REJEITADO'
        },
        inconsistencias: [
          {
            base: 'VENDAS',
            linha: 1,
            campo: 'arquivo',
            motivo: `A base de RH foi gravada com sucesso (${rhLinhas} registros), porém a base de Vendas falhou: ${motivo}`,
            severidade: 'IMPEDITIVO'
          }
        ],
        processadoEm: new Date().toISOString()
      }
      return relatorioErro
    }

    // 3. Etapa 3: Consolidação dos resultados com sucesso
    const vendasLinhas = respVendas.totalLinhas ?? 0
    const totalGeral = rhLinhas + vendasLinhas

    onProgress?.({
      stage: 'CONCLUIDO',
      progress: 100,
      message: `Ciclo concluído com sucesso! (RH: ${rhLinhas} | Vendas: ${vendasLinhas})`
    })

    return {
      isCiclo: true,
      competencia,
      nomeArquivo: `${respRh.nomeArquivo || rhFile.name} & ${respVendas.nomeArquivo || vendasFile.name}`,
      tipoBase: 'CICLO_MENSAL',
      status: 'SUCESSO',
      totalLinhas: totalGeral,
      linhasValidas: totalGeral,
      rejeicaoIntegral: false,
      rh: {
        nomeArquivo: respRh.nomeArquivo || rhFile.name,
        totalLinhas: rhLinhas,
        linhasValidas: rhLinhas,
        status: 'SUCESSO'
      },
      vendas: {
        nomeArquivo: respVendas.nomeArquivo || vendasFile.name,
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
  async uploadBase({
    tipoBase,
    file,
    competencia,
    dataInicio,
    dataFim,
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
    const formData = new FormData()
    formData.append('file', file)

    onProgress?.({
      stage: 'ENVIO',
      progress: 40,
      message: `Enviando planilha ${file.name} (${importType})...`
    })

    try {
      const response = await api.post('/imports/upload', formData, {
        params: { importType },
        headers: { 'Content-Type': 'multipart/form-data' },
        signal
      })

      const data = response.data
      const total = data.totalLinhas ?? 0

      onProgress?.({
        stage: 'CONCLUIDO',
        progress: 100,
        message: `Base processada com sucesso! (${total} linhas)`
      })

      return {
        nomeArquivo: data.nomeArquivo || file.name,
        tipoBase: data.tipoBase || importType,
        status: 'SUCESSO',
        totalLinhas: total,
        linhasValidas: total,
        rejeicaoIntegral: false,
        inconsistencias: [],
        processadoEm: new Date().toISOString()
      }
    } catch (err) {
      console.error(`Falha no upload de base avulsa (${importType}):`, err)
      const motivo =
        err.response?.data?.message ||
        (err.response?.status ? `Erro ${err.response.status} ao processar arquivo` : 'Servidor Spring Boot inatingível')

      return {
        nomeArquivo: file.name,
        tipoBase: importType,
        status: 'REJEITADO',
        totalLinhas: 0,
        linhasValidas: 0,
        rejeicaoIntegral: true,
        inconsistencias: [
          {
            base: importType,
            linha: 1,
            campo: 'arquivo',
            motivo: `Falha ao processar arquivo: ${motivo}`,
            severidade: 'IMPEDITIVO'
          }
        ],
        processadoEm: new Date().toISOString()
      }
    }
  },

  // ==========================================
  // CONSULTA DE DADOS EFETIVADOS (S1-B18)
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

  /**
   * Consulta a base efetivada de Matrículas (RH) com paginação do Spring Boot
   */
  async fetchMatriculas({ page = 0, size = 20 }) {
    try {
      const response = await api.get('/matriculas', {
        params: { page, size }
      })
      return response.data
    } catch (err) {
      console.error('Falha ao consultar matrículas:', err)
      throw err
    }
  },

  /**
   * Exclui uma matrícula efetivada pelo ID (UUID)
   * Trata 409 caso existam vendas vinculadas
   */
  async deleteMatricula(id) {
    try {
      await api.delete(`/matriculas/${id}`)
      return true
    } catch (err) {
      console.error(`Falha ao excluir matrícula ${id}:`, err)
      const motivo =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'Não é possível excluir a matrícula: existem vendas vinculadas a ela.'
          : 'Erro ao excluir matrícula no servidor.')
      throw new Error(motivo)
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
      console.error('Falha ao excluir todas as matrículas:', err)
      const motivo =
        err.response?.data?.message ||
        (err.response?.status === 409
          ? 'Não é possível excluir todas as matrículas: existem vendas vinculadas no banco. Exclua as vendas primeiro.'
          : 'Erro ao excluir matrículas no servidor.')
      throw new Error(motivo)
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
      console.error('Falha ao consultar vendas:', err)
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
      console.error(`Falha ao excluir venda ${id}:`, err)
      const motivo =
        err.response?.data?.message || 'Erro ao excluir venda no servidor.'
      throw new Error(motivo)
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
      console.error(`Falha ao excluir vendas da competência ${competenciaCodigo}:`, err)
      const motivo = err.response?.data?.message || 'Erro ao excluir vendas da competência no servidor.'
      throw new Error(motivo)
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
      console.error('Falha ao excluir todas as vendas:', err)
      const motivo = err.response?.data?.message || 'Erro ao excluir vendas no servidor.'
      throw new Error(motivo)
    }
  },

  /**
   * Consulta as taxas de comissão ativas (COMISS) com suporte ao backend real
   */
  async fetchComissoes({ page = 0, size = 20 } = {}) {
    try {
      const response = await api.get('/comissoes', {
        params: { page, size }
      })
      const data = response.data
      const content = (data.content || []).map((it) => ({
        id: it.id,
        cargo: it.position?.description || 'Cargo Geral',
        codCargo: it.position?.code || 0,
        marca: it.brand?.description || 'Marca Geral',
        codMarca: it.brand?.code || 0,
        percentual: it.percentage != null ? Number(it.percentage) : 0.0,
        vigenciaInicio: it.referenceMonth || '2025-01-01',
        vigenciaFim: it.referenceMonth || '2025-12-31'
      }))

      return {
        ...data,
        content
      }
    } catch (err) {
      console.warn('Backend /comissoes indisponível, utilizando fallback estruturado:', err)
      const mockComissoes = [
        { id: 'comiss-1', cargo: 'VENDEDOR BALCAO', codCargo: 200, marca: 'PRETO', codMarca: 10, percentual: 0.03, vigenciaInicio: '2025-12-01', vigenciaFim: '2025-12-31' },
        { id: 'comiss-2', cargo: 'GERENTE QUIOSQUE', codCargo: 150, marca: 'PRETO', codMarca: 10, percentual: 0.01, vigenciaInicio: '2025-12-01', vigenciaFim: '2025-12-31' },
        { id: 'comiss-3', cargo: 'VENDEDOR BALCAO', codCargo: 200, marca: 'VERMELHO', codMarca: 40, percentual: 0.02, vigenciaInicio: '2025-12-01', vigenciaFim: '2025-12-31' },
        { id: 'comiss-4', cargo: 'GERENTE LOJA', codCargo: 100, marca: 'BRANCO', codMarca: 20, percentual: 0.015, vigenciaInicio: '2025-12-01', vigenciaFim: '2025-12-31' },
        { id: 'comiss-5', cargo: 'SUPERVISOR REGIONAL', codCargo: 50, marca: 'AZUL', codMarca: 30, percentual: 0.025, vigenciaInicio: '2025-12-01', vigenciaFim: '2025-12-31' }
      ]

      const start = page * size
      const content = mockComissoes.slice(start, start + size)

      return {
        content,
        totalElements: mockComissoes.length,
        totalPages: Math.ceil(mockComissoes.length / size),
        size,
        number: page,
        first: page === 0,
        last: start + size >= mockComissoes.length,
        empty: content.length === 0
      }
    }
  },

  /**
   * Exclui uma taxa de comissão pelo ID
   */
  async deleteComissao(id) {
    try {
      await api.delete(`/comissoes/${id}`)
      return true
    } catch (err) {
      console.error(`Falha ao excluir comissão ${id}:`, err)
      const motivo = err.response?.data?.message || 'Erro ao excluir taxa de comissão.'
      throw new Error(motivo)
    }
  },

  /**
   * Exclui todas as taxas de comissão
   */
  async deleteTodasComissoes() {
    try {
      const response = await api.delete('/comissoes/todas')
      return response.data
    } catch (err) {
      console.error('Falha ao excluir todas as comissões:', err)
      const motivo = err.response?.data?.message || 'Erro ao excluir comissões no servidor.'
      throw new Error(motivo)
    }
  }
}

