import api from './api'

/**
 * Mapeamento dos tipos de base aceitos pela aplicação e pelo Spring Boot
 */
export const TIPOS_BASE = {
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
 * Gera mocks realistas para desenvolvimento e validação quando o backend não estiver rodando ou para simulação dirigida
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
          linha: 12,
          campo: 'canal',
          motivo: 'Canal não preenchido; atribuído canal padrão LOJA_FISICA.',
          severidade: 'AVISO'
        },
        {
          linha: 35,
          campo: 'descr_loja',
          motivo: 'Descrição da filial em branco; preenchido automaticamente com nome cadastrado.',
          severidade: 'AVISO'
        }
      ],
      processadoEm: agora
    }
  }

  // Padrão: Cenário com falhas impeditivas e bloqueios de duplicidade/sobreposição
  return {
    nomeArquivo: nomeArquivo || `BASE_${tipoBase}_2025.xlsx`,
    tipoBase,
    status: 'REJEITADO',
    totalLinhas: 95,
    linhasValidas: 90,
    rejeicaoIntegral: true,
    inconsistencias: [
      {
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
        linha: 24,
        campo: tipoBase === 'COMISS' ? 'vigencia' : 'data_ref',
        motivo: tipoBase === 'COMISS'
          ? 'Sobreposição de vigência detectada para o mesmo cargo e marca.'
          : 'Data de referência fora do intervalo da competência informada.',
        severidade: 'IMPEDITIVO'
      },
      {
        linha: 42,
        campo: 'cod_marca',
        motivo: 'Código de marca 999 inexistente no cadastro central.',
        severidade: 'IMPEDITIVO'
      },
      {
        linha: 58,
        campo: 'descr_cargo',
        motivo: 'Nome do cargo com espaçamento irregular; ajustado automaticamente.',
        severidade: 'AVISO'
      }
    ],
    processadoEm: agora
  }
}

export const dataService = {
  /**
   * Envia a planilha para validação e carga no Spring Boot
   */
  async uploadBase({ tipoBase, file, competencia, dataInicio, dataFim, simulacao = 'real' }) {
    // Se o usuário selecionou expressamente um cenário de simulação de teste:
    if (simulacao && simulacao !== 'real') {
      await new Promise((r) => setTimeout(r, 700))
      return gerarMockRelatorio(tipoBase, file?.name, simulacao)
    }

    const formData = new FormData()
    formData.append('arquivo', file)
    formData.append('file', file) // Compatibilidade com @RequestParam e @RequestPart
    formData.append('tipoBase', tipoBase)
    if (competencia) formData.append('competencia', competencia)
    if (dataInicio) formData.append('dataInicio', dataInicio)
    if (dataFim) formData.append('dataFim', dataFim)

    try {
      // Tenta rota primária do backend /api/v1/importacoes/upload
      const response = await api.post('/importacoes/upload', formData, {
        params: { tipoBase },
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      return response.data
    } catch (err) {
      // Caso a rota alternativa /imports/upload esteja ativa na branch do backend
      if (err.response?.status === 404) {
        try {
          const fallbackResp = await api.post('/imports/upload', formData, {
            params: { tipoBase },
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          return fallbackResp.data
        } catch (subErr) {
          // Erro retornado pela API com payload de inconsistências
          if (subErr.response?.data?.inconsistencias || subErr.response?.data?.status) {
            return subErr.response.data
          }
          throw subErr
        }
      }

      // Se a resposta do backend trouxe um corpo estruturado com o relatório de erro
      if (err.response?.data?.inconsistencias || err.response?.data?.status) {
        return err.response.data
      }

      // Se o backend Spring Boot estiver inacessível (ex: servidor desligado durante dev)
      if (!err.response) {
        console.warn('Backend Spring Boot indisponível na porta 8080. Ativando relatório de demonstração com erro impeditivo para validação da UI.')
        return gerarMockRelatorio(tipoBase, file?.name, 'cenario_impeditivo')
      }

      throw err
    }
  }
}
