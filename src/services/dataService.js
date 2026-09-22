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

export const dataService = {
  /**
   * Envia o ciclo conjunto fechado (RH + Vendas) para a competência indicada
   */
  async uploadCiclo({ rhFile, vendasFile, competencia, simulacao = 'real' }) {
    if (simulacao && simulacao !== 'real') {
      await new Promise((r) => setTimeout(r, 700))
      return gerarMockRelatorioCiclo(rhFile?.name, vendasFile?.name, competencia, simulacao)
    }

    const formData = new FormData()
    formData.append('arquivoRh', rhFile)
    formData.append('rhFile', rhFile)
    formData.append('arquivoVendas', vendasFile)
    formData.append('vendasFile', vendasFile)
    formData.append('competencia', competencia)

    try {
      const response = await api.post('/importacoes/ciclo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const fallbackResp = await api.post('/imports/ciclo', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          return fallbackResp.data
        } catch (subErr) {
          if (subErr.response?.data?.inconsistencias || subErr.response?.data?.status) {
            return subErr.response.data
          }
          throw subErr
        }
      }

      if (err.response?.data?.inconsistencias || err.response?.data?.status) {
        return err.response.data
      }

      if (!err.response) {
        console.warn('Backend Spring Boot indisponível na porta 8080. Ativando diagnóstico de simulação com erro de integridade cruzada (RH x Vendas).')
        return gerarMockRelatorioCiclo(rhFile?.name, vendasFile?.name, competencia, 'cenario_cruzamento')
      }

      throw err
    }
  },

  /**
   * Envia uma planilha avulsa para validação e carga (ex: COMISS com vigência)
   */
  async uploadBase({ tipoBase, file, competencia, dataInicio, dataFim, simulacao = 'real' }) {
    if (simulacao && simulacao !== 'real') {
      await new Promise((r) => setTimeout(r, 700))
      return gerarMockRelatorio(tipoBase, file?.name, simulacao)
    }

    const formData = new FormData()
    formData.append('arquivo', file)
    formData.append('file', file)
    formData.append('tipoBase', tipoBase)
    if (competencia) formData.append('competencia', competencia)
    if (dataInicio) formData.append('dataInicio', dataInicio)
    if (dataFim) formData.append('dataFim', dataFim)

    try {
      const response = await api.post('/importacoes/upload', formData, {
        params: { tipoBase },
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (err) {
      if (err.response?.status === 404) {
        try {
          const fallbackResp = await api.post('/imports/upload', formData, {
            params: { tipoBase },
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          return fallbackResp.data
        } catch (subErr) {
          if (subErr.response?.data?.inconsistencias || subErr.response?.data?.status) {
            return subErr.response.data
          }
          throw subErr
        }
      }

      if (err.response?.data?.inconsistencias || err.response?.data?.status) {
        return err.response.data
      }

      if (!err.response) {
        console.warn('Backend Spring Boot indisponível na porta 8080. Ativando relatório de demonstração com erro impeditivo.')
        return gerarMockRelatorio(tipoBase, file?.name, 'cenario_impeditivo')
      }

      throw err
    }
  }
}
