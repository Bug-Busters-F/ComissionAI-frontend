import { describe, it, expect } from 'vitest'
import {
  Z_SCORE_THRESHOLD,
  MIN_SAMPLE_SIZE,
  TIPO_ALERTA,
  TIPO_ALERTA_LABEL,
  DIRECAO_ANOMALIA,
  getEstimatedRange,
  getAnomalyDirection,
  parseComparableGroup,
  extractAlertCompetence,
  formatAlertDate,
  getAlertExplanation,
  isNewCase48h,
  buildAlertQueryParams
} from './statisticalAlertsLogic'

describe('statisticalAlertsLogic — Regras e Adaptações de Alertas Estatísticos (FRONT-6)', () => {
  describe('Constantes Oficiais', () => {
    it('mantém o limiar de Z-Score oficial de 3.0 conforme AlertaEstatisticoService.java:33', () => {
      expect(Z_SCORE_THRESHOLD).toBe(3.0)
    })

    it('mantém o tamanho mínimo de amostra de 4 conforme AlertaEstatisticoService.java:32', () => {
      expect(MIN_SAMPLE_SIZE).toBe(4)
    })

    it('mapeia os rótulos amigáveis para os 3 tipos oficiais', () => {
      expect(TIPO_ALERTA_LABEL[TIPO_ALERTA.OUTLIER_VENDA]).toBe('Anomalia Estatística')
      expect(TIPO_ALERTA_LABEL[TIPO_ALERTA.SEM_VENDAS_PARA_RH]).toBe('Inconsistência de Carga')
      expect(TIPO_ALERTA_LABEL[TIPO_ALERTA.AMOSTRA_INSUFICIENTE]).toBe('Amostra Insuficiente')
    })
  })

  describe('getEstimatedRange (Faixa Provisória Leave-One-Out)', () => {
    it('calcula a faixa correta sem clamp no limite inferior para valor positivo', () => {
      const alerta = {
        metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2',
        mediaGrupo: 1000,
        desvioPadrao: 200
      }
      const range = getEstimatedRange(alerta)
      expect(range).not.toBeNull()
      expect(range.min).toBe(400) // 1000 - 3 * 200
      expect(range.max).toBe(1600) // 1000 + 3 * 200
      expect(range.label).toContain('R$')
    })

    it('permite limite inferior negativo para suportar estornos e vendas negativas (sem Math.max(0, ...))', () => {
      const alerta = {
        metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2',
        mediaGrupo: 200,
        desvioPadrao: 100
      }
      const range = getEstimatedRange(alerta)
      expect(range).not.toBeNull()
      expect(range.min).toBe(-100) // 200 - 300 = -100
      expect(range.max).toBe(500)
    })

    it('retorna null se o método não for Z_SCORE_LEAVE_ONE_OUT_V2', () => {
      const alerta = {
        metodo: 'IQR_TUKEY',
        mediaGrupo: 1000,
        desvioPadrao: 200
      }
      expect(getEstimatedRange(alerta)).toBeNull()
    })

    it('retorna null se mediaGrupo ou desvioPadrao forem nulos', () => {
      expect(getEstimatedRange({ metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2', mediaGrupo: null, desvioPadrao: 200 })).toBeNull()
      expect(getEstimatedRange({ metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2', mediaGrupo: 1000, desvioPadrao: null })).toBeNull()
      expect(getEstimatedRange(null)).toBeNull()
    })
  })

  describe('getAnomalyDirection (Direção da Anomalia)', () => {
    it('identifica direção ACIMA quando valorObservado > mediaGrupo', () => {
      const dir = getAnomalyDirection({ valorObservado: 5000, mediaGrupo: 1000 })
      expect(dir).toBe(DIRECAO_ANOMALIA.ACIMA)
    })

    it('identifica direção ABAIXO quando valorObservado < mediaGrupo', () => {
      const dir = getAnomalyDirection({ valorObservado: 10, mediaGrupo: 1000 })
      expect(dir).toBe(DIRECAO_ANOMALIA.ABAIXO)
    })

    it('retorna INDEFINIDA quando valores forem iguais ou ausentes', () => {
      expect(getAnomalyDirection({ valorObservado: 1000, mediaGrupo: 1000 })).toBe(DIRECAO_ANOMALIA.INDEFINIDA)
      expect(getAnomalyDirection({ valorObservado: null, mediaGrupo: 1000 })).toBe(DIRECAO_ANOMALIA.INDEFINIDA)
      expect(getAnomalyDirection(null)).toBe(DIRECAO_ANOMALIA.INDEFINIDA)
    })
  })

  describe('parseComparableGroup e extractAlertCompetence', () => {
    it('faz o parse estruturado de string completa com loja, cargo e marca', () => {
      const res = parseComparableGroup('2025-08|loja=1|cargo=10|marca=100')
      expect(res.competencia).toBe('2025-08')
      expect(res.loja).toBe('1')
      expect(res.cargo).toBe('10')
      expect(res.marca).toBe('100')
      expect(res.label).toBe('Loja 1 · Cargo 10 · Marca 100')
    })

    it('suporta formatos parciais de grupo comparável', () => {
      const res = parseComparableGroup('loja=5|cargo=2')
      expect(res.loja).toBe('5')
      expect(res.cargo).toBe('2')
      expect(res.label).toBe('Loja 5 · Cargo 2')
    })

    it('lida com entradas inválidas ou vazias', () => {
      const res = parseComparableGroup('')
      expect(res.label).toBe('Grupo comparável geral')
    })

    it('extrai a competência a partir de dataReferencia quando disponível', () => {
      expect(extractAlertCompetence({ dataReferencia: '2025-08-15' })).toBe('2025-08')
    })

    it('extrai a competência a partir de grupoComparavel quando dataReferencia for nula (ex.: SEM_VENDAS_PARA_RH)', () => {
      const alerta = {
        tipo: 'SEM_VENDAS_PARA_RH',
        dataReferencia: null,
        grupoComparavel: '2025-08|loja=1|cargo=10|marca=100'
      }
      expect(extractAlertCompetence(alerta)).toBe('2025-08')
    })
  })

  describe('formatAlertDate (Datas Textuais ISO sem bug de timezone)', () => {
    it('converte YYYY-MM-DD para DD/MM/YYYY sem usar Date()', () => {
      expect(formatAlertDate('2025-08-15')).toBe('15/08/2025')
      expect(formatAlertDate('2025-01-01T00:00:00')).toBe('01/01/2025')
    })

    it('retorna traço para datas nulas ou vazias', () => {
      expect(formatAlertDate(null)).toBe('—')
      expect(formatAlertDate('')).toBe('—')
    })
  })

  describe('getAlertExplanation (Explicações Dinâmicas e Ricas)', () => {
    it('gera explicação detalhada com valores reais e direção para OUTLIER_VENDA', () => {
      const alerta = {
        tipo: TIPO_ALERTA.OUTLIER_VENDA,
        metodo: 'Z_SCORE_LEAVE_ONE_OUT_V2',
        valorObservado: 12000,
        mediaGrupo: 3000,
        desvioPadrao: 1000,
        score: 9.0,
        grupoComparavel: '2025-08|loja=1|cargo=10|marca=100'
      }
      const exp = getAlertExplanation(alerta)
      expect(exp).toContain('acima')
      expect(exp).toContain('12.000')
      expect(exp).toContain('Loja 1 · Cargo 10 · Marca 100')
      expect(exp).toContain('score Z=9.00')
    })

    it('gera explicação para SEM_VENDAS_PARA_RH com matrícula', () => {
      const alerta = {
        tipo: TIPO_ALERTA.SEM_VENDAS_PARA_RH,
        matricula: 'M10293'
      }
      const exp = getAlertExplanation(alerta)
      expect(exp).toContain('matrícula M10293')
      expect(exp).toContain('sem nenhuma venda registrada')
    })

    it('gera explicação para AMOSTRA_INSUFICIENTE com contador e mínimo exigido', () => {
      const alerta = {
        tipo: TIPO_ALERTA.AMOSTRA_INSUFICIENTE,
        tamanhoAmostra: 2
      }
      const exp = getAlertExplanation(alerta)
      expect(exp).toContain('2 observação(ões)')
      expect(exp).toContain('mínimo necessário: 4')
    })
  })

  describe('isNewCase48h (Detecção de Novos Casos)', () => {
    const baseNow = new Date('2026-11-18T10:00:00Z')

    it('retorna true se geradoEm estiver dentro de 48 horas', () => {
      const geradoRecente = '2026-11-17T12:00:00Z' // 22h atrás
      expect(isNewCase48h(geradoRecente, baseNow)).toBe(true)
    })

    it('retorna false se geradoEm tiver mais de 48 horas', () => {
      const geradoAntigo = '2026-11-15T09:00:00Z' // mais de 48h
      expect(isNewCase48h(geradoAntigo, baseNow)).toBe(false)
    })

    it('retorna false para data ausente ou no futuro', () => {
      expect(isNewCase48h(null, baseNow)).toBe(false)
      expect(isNewCase48h('2026-11-19T12:00:00Z', baseNow)).toBe(false)
    })
  })

  describe('buildAlertQueryParams', () => {
    it('constrói parâmetros saneados removendo campos nulos', () => {
      const params = buildAlertQueryParams({
        competencia: '2025-08',
        matricula: ' 1024 ',
        tipo: 'OUTLIER_VENDA',
        lotePreparacaoId: 'uuid-1',
        page: 0,
        size: 20,
        sort: 'geradoEm,desc'
      })

      expect(params).toEqual({
        competencia: '2025-08',
        matricula: '1024',
        tipo: 'OUTLIER_VENDA',
        lotePreparacaoId: 'uuid-1',
        page: 0,
        size: 20,
        sort: 'geradoEm,desc'
      })
    })

    it('omite filtros não preenchidos', () => {
      const params = buildAlertQueryParams({ competencia: '2025-08' })
      expect(params).toEqual({ competencia: '2025-08' })
    })
  })
})
