import { formatCurrencyPtBr } from './currencyUtils'

/**
 * Limiar oficial de Z-score configurado no backend.
 * Referência: AlertaEstatisticoService.java:33 (LIMIAR_Z_SCORE = 3.0)
 */
export const Z_SCORE_THRESHOLD = 3.0

/**
 * Tamanho mínimo de amostra exigido para cálculo de desvio Leave-One-Out.
 * Referência: AlertaEstatisticoService.java:32 (AMOSTRA_MINIMA = 4)
 */
export const MIN_SAMPLE_SIZE = 4

/**
 * Tipos de alerta estatístico oficiais mapeados no backend.
 * Referência: TipoAlertaEstatistico.java
 */
export const TIPO_ALERTA = Object.freeze({
  OUTLIER_VENDA: 'OUTLIER_VENDA',
  SEM_VENDAS_PARA_RH: 'SEM_VENDAS_PARA_RH',
  AMOSTRA_INSUFICIENTE: 'AMOSTRA_INSUFICIENTE'
})

/**
 * Rótulos oficiais para apresentação ao usuário (DoD FRONT-6).
 */
export const TIPO_ALERTA_LABEL = Object.freeze({
  [TIPO_ALERTA.OUTLIER_VENDA]: 'Anomalia Estatística',
  [TIPO_ALERTA.SEM_VENDAS_PARA_RH]: 'Inconsistência de Carga',
  [TIPO_ALERTA.AMOSTRA_INSUFICIENTE]: 'Amostra Insuficiente'
})

/**
 * Direção matemática da anomalia em relação à média do grupo Leave-One-Out.
 */
export const DIRECAO_ANOMALIA = Object.freeze({
  ACIMA: 'ACIMA',
  ABAIXO: 'ABAIXO',
  INDEFINIDA: 'INDEFINIDA'
})

/**
 * Calcula a faixa estimada Leave-One-Out (±3σ).
 * Não utiliza Math.max(0, ...) no limite inferior para suportar estornos ou vendas negativas.
 *
 * @param {Object} alerta
 * @returns {{ min: number, max: number, label: string } | null}
 */
export function getEstimatedRange(alerta) {
  if (!alerta || typeof alerta !== 'object') return null
  if (alerta.metodo !== 'Z_SCORE_LEAVE_ONE_OUT_V2') return null
  if (alerta.mediaGrupo == null || alerta.desvioPadrao == null) return null

  const media = Number(alerta.mediaGrupo)
  const desvio = Number(alerta.desvioPadrao)
  if (!Number.isFinite(media) || !Number.isFinite(desvio)) return null

  const min = media - Z_SCORE_THRESHOLD * desvio
  const max = media + Z_SCORE_THRESHOLD * desvio

  return {
    min,
    max,
    label: `${formatCurrencyPtBr(min, true)} – ${formatCurrencyPtBr(max, true)}`
  }
}

/**
 * Deriva com precisão a direção da anomalia comparando valorObservado com mediaGrupo.
 *
 * @param {Object} alerta
 * @returns {string} DIRECAO_ANOMALIA
 */
export function getAnomalyDirection(alerta) {
  if (!alerta || typeof alerta !== 'object') return DIRECAO_ANOMALIA.INDEFINIDA
  if (alerta.valorObservado == null || alerta.mediaGrupo == null) return DIRECAO_ANOMALIA.INDEFINIDA

  const observado = Number(alerta.valorObservado)
  const media = Number(alerta.mediaGrupo)
  if (!Number.isFinite(observado) || !Number.isFinite(media)) return DIRECAO_ANOMALIA.INDEFINIDA

  if (observado > media) return DIRECAO_ANOMALIA.ACIMA
  if (observado < media) return DIRECAO_ANOMALIA.ABAIXO
  return DIRECAO_ANOMALIA.INDEFINIDA
}

/**
 * Faz o parse estruturado da string de grupo comparável.
 * Exemplo de entrada: "2025-08|loja=1|cargo=10|marca=100"
 *
 * @param {string} grupoStr
 * @returns {{ competencia: string, loja: string, cargo: string, marca: string, label: string }}
 */
export function parseComparableGroup(grupoStr) {
  if (!grupoStr || typeof grupoStr !== 'string') {
    return { competencia: '', loja: '', cargo: '', marca: '', label: 'Grupo comparável geral' }
  }

  const parts = grupoStr.split('|').map(p => p.trim()).filter(Boolean)
  let competencia = ''
  let loja = ''
  let cargo = ''
  let marca = ''

  for (const part of parts) {
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(part)) {
      competencia = part
      continue
    }
    const [key, val] = part.split('=')
    if (!key || val === undefined) continue
    const lowerKey = key.toLowerCase()
    if (lowerKey === 'loja') loja = val
    else if (lowerKey === 'cargo') cargo = val
    else if (lowerKey === 'marca') marca = val
  }

  const labels = []
  if (loja) labels.push(`Loja ${loja}`)
  if (cargo) labels.push(`Cargo ${cargo}`)
  if (marca) labels.push(`Marca ${marca}`)

  const label = labels.length > 0 ? labels.join(' · ') : grupoStr

  return { competencia, loja, cargo, marca, label }
}

/**
 * Extrai a competência do alerta de forma resiliente, suportando SEM_VENDAS_PARA_RH onde dataReferencia é nulo.
 *
 * @param {Object} alerta
 * @returns {string} Formato YYYY-MM ou vazio
 */
export function extractAlertCompetence(alerta) {
  if (!alerta || typeof alerta !== 'object') return ''
  if (alerta.dataReferencia) {
    const s = String(alerta.dataReferencia).trim()
    if (s.length >= 7) return s.slice(0, 7)
  }
  if (alerta.grupoComparavel) {
    const parsed = parseComparableGroup(alerta.grupoComparavel)
    if (parsed.competencia) return parsed.competencia
  }
  return ''
}

/**
 * Formata com segurança uma data ISO textual (YYYY-MM-DD) para DD/MM/YYYY, sem deslocamento de fuso UTC-3.
 *
 * @param {string} dateStr
 * @returns {string}
 */
export function formatAlertDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return dateStr
  const [, ano, mes, dia] = match
  return `${dia}/${mes}/${ano}`
}

/**
 * Gera a explicação contextual orientativa interpolando valores reais e direção.
 *
 * @param {Object} alerta
 * @returns {string}
 */
export function getAlertExplanation(alerta) {
  if (!alerta || typeof alerta !== 'object') return 'Alerta estatístico não identificado.'

  if (alerta.tipo === TIPO_ALERTA.OUTLIER_VENDA) {
    const direction = getAnomalyDirection(alerta)
    const dirWord = direction === DIRECAO_ANOMALIA.ACIMA ? 'acima' : direction === DIRECAO_ANOMALIA.ABAIXO ? 'abaixo' : 'fora'
    const range = getEstimatedRange(alerta)
    const group = parseComparableGroup(alerta.grupoComparavel).label
    const zScore = alerta.score != null ? Number(alerta.score).toFixed(2) : '3.0+'
    const valStr = formatCurrencyPtBr(alerta.valorObservado, true)
    const rangeStr = range ? `${formatCurrencyPtBr(range.min, true)} a ${formatCurrencyPtBr(range.max, true)}` : 'faixa esperada'

    return `Valor observado de ${valStr} está ${dirWord} da faixa estimada de ${rangeStr} para o grupo ${group} (score Z=${zScore}). Recomenda-se conferir as vendas do colaborador.`
  }

  if (alerta.tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH) {
    const mat = alerta.matricula ? `matrícula ${alerta.matricula}` : 'matrícula não informada'
    return `Colaborador (${mat}) cadastrado na base de RH, mas sem nenhuma venda registrada na competência. Recomenda-se verificar se houve omissão na carga de vendas ou se o colaborador não realizou vendas no período.`
  }

  if (alerta.tipo === TIPO_ALERTA.AMOSTRA_INSUFICIENTE) {
    const amostra = alerta.tamanhoAmostra ?? 0
    return `O grupo comparável possui apenas ${amostra} observação(ões) (mínimo necessário: ${MIN_SAMPLE_SIZE}). A metodologia estatística de desvio Leave-One-Out requer ao menos 4 observações para estabelecer uma distribuição confiável.`
  }

  return alerta.detalhes || 'Alerta registrado no motor estatístico.'
}

/**
 * Avalia se o alerta foi gerado dentro da janela recente de 48 horas.
 *
 * @param {string|Date} geradoEm
 * @param {Date} [referenceTime=new Date()]
 * @returns {boolean}
 */
export function isNewCase48h(geradoEm, referenceTime = new Date()) {
  if (!geradoEm) return false
  const gen = new Date(geradoEm).getTime()
  const ref = referenceTime instanceof Date ? referenceTime.getTime() : new Date(referenceTime).getTime()
  if (!Number.isFinite(gen) || !Number.isFinite(ref)) return false
  const diff = ref - gen
  return diff >= 0 && diff <= 48 * 3600 * 1000
}

/**
 * Constrói o objeto de parâmetros de consulta saneado para a API de alertas.
 *
 * @param {Object} filters
 * @returns {Object}
 */
export function buildAlertQueryParams(filters = {}) {
  const params = {}
  if (filters.competencia) params.competencia = String(filters.competencia).trim()
  if (filters.matricula) params.matricula = String(filters.matricula).trim()
  if (filters.tipo) params.tipo = String(filters.tipo).trim()
  if (filters.lotePreparacaoId) params.lotePreparacaoId = String(filters.lotePreparacaoId).trim()
  if (filters.incluirSubstituidos != null) params.incluirSubstituidos = Boolean(filters.incluirSubstituidos)
  if (filters.page != null) params.page = Number(filters.page)
  if (filters.size != null) params.size = Number(filters.size)
  if (filters.sort) params.sort = String(filters.sort).trim()
  return params
}
