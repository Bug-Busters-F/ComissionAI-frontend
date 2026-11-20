import { describe, it, expect } from 'vitest'
import {
  TIPO_ALERTA,
  GRUPO_SEM_VENDAS,
  METODO_LEAVE_ONE_OUT,
  parseComparableGroup,
  isZeroDeviation,
  isCompetenceWithinVigencia,
  shortenIdentifier,
  getEstimatedRange,
  getAlertExplanation,
  getAlertReferenceLabel,
  formatMethodLabel,
  formatCompetenceLabel,
  buildLotOptions,
  getHttpStatus,
  isForbiddenError,
  describeAlertsError,
  describeReprocessResult,
  reprocessDeniedMessage,
  createLatestGuard
} from './statisticalAlertsLogic'
import { canAccess } from './accessPolicy'

function httpError(status, message) {
  const err = new Error(`Request failed with status code ${status}`)
  err.isAxiosError = true
  err.response = { status, data: message ? { message } : {} }
  return err
}

describe('statisticalAlertsLogic — aderência ao contrato do AlertaEstatisticoService (FRONT-6)', () => {
  describe('SEM_VENDAS_PARA_RH (alertaSemVendasRh)', () => {
    const semVendas = {
      tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH,
      dataReferencia: '2025-08-01',
      matricula: '2002',
      grupoComparavel: GRUPO_SEM_VENDAS,
      tamanhoAmostra: 0,
      metodo: METODO_LEAVE_ONE_OUT
    }

    it('traduz o grupo SEM_VENDAS_ASSOCIADAS para rótulo amigável', () => {
      expect(parseComparableGroup(GRUPO_SEM_VENDAS).label).toBe('Sem vendas associadas')
      expect(parseComparableGroup(` ${GRUPO_SEM_VENDAS} `).label).toBe('Sem vendas associadas')
    })

    it('exibe a competência (não o dia 1) na coluna de referência', () => {
      expect(getAlertReferenceLabel(semVendas)).toEqual({ value: '08/2025', hint: 'Competência' })
    })

    it('exibe o método como cruzamento RH × Vendas mesmo com metodo Z_SCORE gravado pelo back', () => {
      expect(formatMethodLabel(semVendas)).toBe('Cruzamento RH × Vendas')
    })

    it('não promete "sem vendas na competência" (o back verifica vendas associadas à matrícula)', () => {
      const exp = getAlertExplanation(semVendas)
      expect(exp).toContain('nenhuma venda foi associada')
      expect(exp).not.toContain('na competência')
    })
  })

  describe('rótulos de referência e método', () => {
    it('usa a data da venda para outliers e amostra insuficiente', () => {
      expect(getAlertReferenceLabel({ tipo: TIPO_ALERTA.OUTLIER_VENDA, dataReferencia: '2025-08-14' }))
        .toEqual({ value: '14/08/2025', hint: 'Data da venda' })
      expect(getAlertReferenceLabel(null)).toEqual({ value: '—', hint: '' })
    })

    it('formata método Leave-One-Out e preserva métodos desconhecidos', () => {
      expect(formatMethodLabel({ tipo: TIPO_ALERTA.OUTLIER_VENDA, metodo: METODO_LEAVE_ONE_OUT })).toBe('Z-score Leave-One-Out')
      expect(formatMethodLabel({ tipo: TIPO_ALERTA.OUTLIER_VENDA, metodo: 'OUTRO' })).toBe('OUTRO')
      expect(formatMethodLabel({ tipo: TIPO_ALERTA.OUTLIER_VENDA })).toBe('—')
    })

    it('formata competência AAAA-MM como MM/AAAA', () => {
      expect(formatCompetenceLabel('2025-08')).toBe('08/2025')
      expect(formatCompetenceLabel('')).toBe('')
      expect(formatCompetenceLabel('ago/25')).toBe('ago/25')
    })
  })

  describe('grupo comparável com ids internos (formato atual do back)', () => {
    const grupo = '2025-07|loja=15ae07f0-1c2d-4e5f-8a9b-0c1d2e3f4a5b|cargo=5d27b598-aaaa-4bbb-8ccc-dddddddddddd|marca=a21b02b8-1111-4222-8333-444444444444'

    it('encurta UUIDs para 8 caracteres mantendo competência e ids completos no parse', () => {
      const parsed = parseComparableGroup(grupo)
      expect(parsed.label).toBe('Loja 15ae07f0 · Cargo 5d27b598 · Marca a21b02b8')
      expect(parsed.competencia).toBe('2025-07')
      expect(parsed.loja).toBe('15ae07f0-1c2d-4e5f-8a9b-0c1d2e3f4a5b')
    })

    it('mantém códigos de negócio intactos', () => {
      expect(shortenIdentifier('14')).toBe('14')
      expect(shortenIdentifier('MATRIC-56')).toBe('MATRIC-56')
      expect(shortenIdentifier(null)).toBe('')
    })
  })

  describe('isCompetenceWithinVigencia (sincronização com a seção de bases)', () => {
    it('aceita apenas competências dentro da vigência da campanha', () => {
      expect(isCompetenceWithinVigencia('2025-08', '2025-08-01', '2025-08-31')).toBe(true)
      expect(isCompetenceWithinVigencia('2025-12', '2025-08-01', '2025-08-31')).toBe(false)
      expect(isCompetenceWithinVigencia('2025-07', '2025-08-01', '2025-10-31')).toBe(false)
      expect(isCompetenceWithinVigencia('2025-09', '2025-08-01', '2025-10-31')).toBe(true)
    })

    it('sem vigência aceita qualquer competência válida e rejeita formatos inválidos', () => {
      expect(isCompetenceWithinVigencia('2025-12')).toBe(true)
      expect(isCompetenceWithinVigencia('12/2025', '2025-08-01')).toBe(false)
      expect(isCompetenceWithinVigencia('', '2025-08-01')).toBe(false)
    })
  })

  describe('desvio padrão zero (Z = 3 sentinela do back)', () => {
    const zero = {
      tipo: TIPO_ALERTA.OUTLIER_VENDA, metodo: METODO_LEAVE_ONE_OUT, grupoComparavel: '2025-08|loja=7|cargo=10|marca=300',
      valorObservado: 9800, mediaGrupo: 4500, desvioPadrao: 0, score: 3
    }

    it('detecta desvio zero apenas quando o valor é numérico e igual a 0', () => {
      expect(isZeroDeviation(zero)).toBe(true)
      expect(isZeroDeviation({ desvioPadrao: '0.0000' })).toBe(true)
      expect(isZeroDeviation({ desvioPadrao: 1 })).toBe(false)
      expect(isZeroDeviation({ desvioPadrao: null })).toBe(false)
      expect(isZeroDeviation(null)).toBe(false)
    })

    it('colapsa a faixa no valor uniforme do grupo', () => {
      const range = getEstimatedRange(zero)
      expect(range.uniform).toBe(true)
      expect(range.min).toBe(4500)
      expect(range.max).toBe(4500)
      expect(range.label).toContain('Valor uniforme no grupo')
      expect(range.label).toContain('4.500,00')
    })

    it('explica o desvio zero sem citar o Z sentinela', () => {
      const exp = getAlertExplanation(zero)
      expect(exp).toContain('desvio padrão zero')
      expect(exp).toContain('R$ 9.800,00')
      expect(exp).not.toContain('|Z|')
    })

    it('mantém faixa normal (uniform = false) com desvio positivo', () => {
      expect(getEstimatedRange({ ...zero, desvioPadrao: 100 }).uniform).toBe(false)
    })
  })

  describe('estorno (score sempre absoluto no back)', () => {
    it('descreve estorno como "abaixo" pela comparação com a média e mostra |Z| positivo', () => {
      const exp = getAlertExplanation({
        tipo: TIPO_ALERTA.OUTLIER_VENDA, metodo: METODO_LEAVE_ONE_OUT, grupoComparavel: '2025-08|loja=14|cargo=10|marca=100',
        valorObservado: -8900, mediaGrupo: 11500, desvioPadrao: 2400, score: 8.5
      })
      expect(exp).toContain('abaixo')
      expect(exp).toContain('|Z| = 8,50')
      expect(exp).toContain('R$ 4.300,00 a R$ 18.700,00') // 11500 ± 3 * 2400
    })
  })

  describe('buildLotOptions (LotePreparacaoResponseDTO)', () => {
    it('mantém apenas EFETIVADO, remove duplicados e ordena do mais recente', () => {
      const options = buildLotOptions([
        { id: 'a', tipoBase: 'HR', status: 'EFETIVADO', nomeArquivo: 'rh.xlsx', efetivadoEm: '2025-09-01T12:00:00Z' },
        { id: 'b', tipoBase: 'SALES', status: 'EFETIVADO', nomeArquivo: 'vendas.xlsx', efetivadoEm: '2025-09-03T12:00:00Z' },
        { id: 'b', tipoBase: 'SALES', status: 'EFETIVADO', nomeArquivo: 'duplicado.xlsx' },
        { id: 'c', tipoBase: 'SALES', status: 'DESCARTADO', nomeArquivo: 'descartado.xlsx' },
        null,
        { tipoBase: 'SALES', status: 'EFETIVADO' }
      ])
      expect(options.map(o => o.id)).toEqual(['b', 'a'])
      expect(options[0].label).toBe('Vendas — vendas.xlsx · 03/09, 09:00')
      expect(options[1].label).toContain('RH — rh.xlsx')
    })

    it('usa fallback de nome pelo id e aceita lotes sem status', () => {
      const [opt] = buildLotOptions([{ id: '7f3c9a10-aaaa-bbbb-cccc-000000000000', tipoBase: 'SALES' }])
      expect(opt.label).toBe('Vendas — Lote 7f3c9a10')
    })

    it('retorna lista vazia para entradas inválidas', () => {
      expect(buildLotOptions(null)).toEqual([])
      expect(buildLotOptions('x')).toEqual([])
    })
  })

  describe('describeAlertsError (mapeamento por status HTTP)', () => {
    it('403 informa a segregação de funções no reprocessamento', () => {
      expect(describeAlertsError(httpError(403), 'reprocess')).toContain('segregação de funções')
      expect(describeAlertsError(httpError(403), 'list')).toContain('consultar os alertas')
    })

    it('404 informa lote inexistente no reprocessamento', () => {
      expect(describeAlertsError(httpError(404, 'Lote de preparação não encontrado: x'), 'reprocess'))
        .toBe('Lote de preparação não encontrado. Ele pode ter sido descartado ou substituído.')
    })

    it('400 repassa a mensagem de negócio do backend', () => {
      expect(describeAlertsError(httpError(400, 'A análise só pode ser reprocessada para lote EFETIVADO.'), 'reprocess'))
        .toBe('A análise só pode ser reprocessada para lote EFETIVADO.')
      expect(describeAlertsError(httpError(400), 'list')).toBe('Filtros de consulta inválidos.')
    })

    it('5xx e falha de rede viram mensagem de indisponibilidade, sem detalhes técnicos', () => {
      expect(describeAlertsError(httpError(500, 'NullPointerException'))).toContain('indisponível')
      const network = new Error('Network Error')
      network.isAxiosError = true
      network.code = 'ERR_NETWORK'
      expect(describeAlertsError(network)).toContain('Não foi possível se comunicar com o servidor')
    })

    it('401 orienta novo login e erros locais preservam a mensagem', () => {
      expect(describeAlertsError(httpError(401))).toContain('sessão expirou')
      expect(describeAlertsError(new Error('Identificador do lote de preparação é obrigatório.'), 'reprocess'))
        .toBe('Identificador do lote de preparação é obrigatório.')
      expect(describeAlertsError(null, 'reprocess')).toBe('Falha ao reprocessar o lote.')
    })

    it('expõe utilitários de status', () => {
      expect(getHttpStatus(httpError(403))).toBe(403)
      expect(getHttpStatus({})).toBeNull()
      expect(isForbiddenError(httpError(403))).toBe(true)
      expect(isForbiddenError(httpError(404))).toBe(false)
    })
  })

  describe('describeReprocessResult (ReprocessamentoAlertasResponse)', () => {
    it('0 gerados e 0 substituídos = bases inalteradas, tom neutro', () => {
      const fb = describeReprocessResult({ alertasGerados: 0, alertasSubstituidos: 0, semAmostra: false })
      expect(fb.tone).toBe('neutral')
      expect(fb.message).toContain('não mudaram')
    })

    it('informa quantidades geradas e substituídas', () => {
      const fb = describeReprocessResult({ alertasGerados: 5, alertasSubstituidos: 3, semAmostra: false })
      expect(fb.tone).toBe('success')
      expect(fb.message).toContain('5 alerta(s) gerado(s)')
      expect(fb.message).toContain('3 alerta(s) anterior(es) substituído(s)')
    })

    it('acrescenta aviso quando semAmostra = true', () => {
      expect(describeReprocessResult({ alertasGerados: 2, alertasSubstituidos: 0, semAmostra: true }).message)
        .toContain('amostra insuficiente')
    })

    it('resposta ausente vira sucesso genérico', () => {
      expect(describeReprocessResult(null).tone).toBe('success')
    })
  })

  describe('SoD — mensagens e matriz de acesso', () => {
    it('diferencia auditor, gestores sem permissão e demais perfis', () => {
      expect(reprocessDeniedMessage('AUDITOR')).toContain('somente consulta')
      expect(reprocessDeniedMessage('GERENTE_VENDAS')).toContain('permissão de importação')
      expect(reprocessDeniedMessage('ANALISTA_CODIGO')).toContain('restrito a gerente de vendas ou administrador')
    })

    it('espelha o SecurityConfig para reprocessamento e listagem de lotes de preparação', () => {
      expect(canAccess('GERENTE_VENDAS', 'reprocessAnomalies', ['IMPORTAR_BASES'])).toBe(true)
      expect(canAccess('GERENTE_VENDAS', 'reprocessAnomalies', [])).toBe(false)
      expect(canAccess('ADMINISTRADOR', 'reprocessAnomalies', ['ACESSO_COMPLETO'])).toBe(true)
      expect(canAccess('AUDITOR', 'reprocessAnomalies', ['IMPORTAR_BASES'])).toBe(false)
      expect(canAccess('ANALISTA_NEGOCIOS', 'reprocessAnomalies', ['IMPORTAR_BASES'])).toBe(false)

      expect(canAccess('AUDITOR', 'viewPreparationLots', [])).toBe(false)
      expect(canAccess('ANALISTA_CODIGO', 'viewPreparationLots', [])).toBe(false)
      expect(canAccess('GERENTE_VENDAS', 'viewPreparationLots', [])).toBe(true)
      expect(canAccess('ANALISTA_NEGOCIOS', 'viewPreparationLots', [])).toBe(true)
      expect(canAccess('ADMINISTRADOR', 'viewPreparationLots', ['ACESSO_COMPLETO'])).toBe(true)
    })
  })

  describe('createLatestGuard (descarte de respostas obsoletas)', () => {
    it('somente o token mais recente é considerado atual', () => {
      const guard = createLatestGuard()
      const first = guard.next()
      const second = guard.next()
      expect(guard.isCurrent(first)).toBe(false)
      expect(guard.isCurrent(second)).toBe(true)
    })

    it('descarta a resposta lenta de uma consulta anterior', async () => {
      const guard = createLatestGuard()
      const applied = []
      const request = (value, delay) => {
        const token = guard.next()
        return new Promise(resolve => setTimeout(resolve, delay)).then(() => {
          if (guard.isCurrent(token)) applied.push(value)
        })
      }
      await Promise.all([request('antiga', 30), request('nova', 5)])
      expect(applied).toEqual(['nova'])
    })
  })
})
