import { formatCurrencyPtBr } from './currencyUtils'

/**
 * Limiar oficial de Z-score configurado no backend.
 * Referência: AlertaEstatisticoService.java (LIMIAR_Z_SCORE = 3). A regra é |Z| >= 3.
 */
export const Z_SCORE_THRESHOLD = 3.0

/**
 * Tamanho mínimo do grupo comparável, contando a própria venda analisada.
 * Referência: AlertaEstatisticoService.java (AMOSTRA_MINIMA = 4 → ao menos 3 vendas de referência).
 */
export const MIN_SAMPLE_SIZE = 4

/**
 * Método estatístico gravado pelo backend em todos os tipos de alerta.
 */
export const METODO_LEAVE_ONE_OUT = 'Z_SCORE_LEAVE_ONE_OUT_V2'

/**
 * Valor de grupoComparavel gravado pelo backend para SEM_VENDAS_PARA_RH.
 */
export const GRUPO_SEM_VENDAS = 'SEM_VENDAS_ASSOCIADAS'

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

const TIPO_BASE_LABEL = Object.freeze({ HR: 'RH', RH: 'RH', SALES: 'Vendas', VENDAS: 'Vendas', COMISSIONS: 'Comissões' })

function formatDecimalPtBr(value, digits = 2) {
  return Number(value).toFixed(digits).replace('.', ',')
}

/**
 * Formata competência AAAA-MM como MM/AAAA.
 *
 * @param {string} comp
 * @returns {string}
 */
export function formatCompetenceLabel(comp) {
  if (!comp) return ''
  const m = String(comp).trim().match(/^(\d{4})-(\d{2})$/)
  if (m) return `${m[2]}/${m[1]}`
  return String(comp)
}

/**
 * Indica se a competência AAAA-MM está dentro da vigência [dataInicio, dataFim] (comparação por mês).
 * Sem vigência informada, qualquer competência válida é aceita.
 *
 * @param {string} comp
 * @param {string} [dataInicio]
 * @param {string} [dataFim]
 * @returns {boolean}
 */
export function isCompetenceWithinVigencia(comp, dataInicio, dataFim) {
  const c = String(comp || '').trim()
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(c)) return false
  const start = dataInicio ? String(dataInicio).slice(0, 7) : ''
  const end = dataFim ? String(dataFim).slice(0, 7) : ''
  if (start && c < start) return false
  if (end && c > end) return false
  return true
}

/**
 * Indica se o grupo de referência tem desvio padrão zero (todas as demais vendas com o mesmo valor).
 * Nesse caso o backend grava Z = 3 como sentinela quando o valor observado difere da média.
 *
 * @param {Object} alerta
 * @returns {boolean}
 */
export function isZeroDeviation(alerta) {
  if (!alerta || alerta.desvioPadrao == null || alerta.desvioPadrao === '') return false
  const desvio = Number(alerta.desvioPadrao)
  return Number.isFinite(desvio) && desvio === 0
}

/**
 * Calcula a faixa estimada Leave-One-Out (±3σ).
 * Não utiliza Math.max(0, ...) no limite inferior para suportar estornos ou vendas negativas.
 * Com desvio zero, a faixa colapsa no valor uniforme do grupo (uniform = true).
 *
 * @param {Object} alerta
 * @returns {{ min: number, max: number, label: string, uniform: boolean } | null}
 */
export function getEstimatedRange(alerta) {
  if (!alerta || typeof alerta !== 'object') return null
  if (alerta.metodo !== METODO_LEAVE_ONE_OUT) return null
  if (alerta.mediaGrupo == null || alerta.desvioPadrao == null) return null

  const media = Number(alerta.mediaGrupo)
  const desvio = Number(alerta.desvioPadrao)
  if (!Number.isFinite(media) || !Number.isFinite(desvio)) return null

  if (desvio === 0) {
    return { min: media, max: media, uniform: true, label: `Valor uniforme no grupo: ${formatCurrencyPtBr(media, true)}` }
  }

  const min = media - Z_SCORE_THRESHOLD * desvio
  const max = media + Z_SCORE_THRESHOLD * desvio

  return {
    min,
    max,
    uniform: false,
    label: `${formatCurrencyPtBr(min, true)} – ${formatCurrencyPtBr(max, true)}`
  }
}

/**
 * Deriva a direção da anomalia comparando valorObservado com mediaGrupo.
 * O score do backend é sempre absoluto (|Z|), por isso a direção não pode vir do sinal do score.
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Encurta identificadores UUID para os 8 primeiros caracteres; códigos de negócio são mantidos.
 * O backend atual monta o grupo com os ids internos (UUID) de loja, cargo e marca.
 *
 * @param {string} value
 * @returns {string}
 */
export function shortenIdentifier(value) {
  const v = String(value ?? '').trim()
  return UUID_PATTERN.test(v) ? v.slice(0, 8) : v
}

/**
 * Faz o parse estruturado da string de grupo comparável.
 * Exemplo de entrada: "2025-08|loja=1|cargo=10|marca=100"
 * Para SEM_VENDAS_PARA_RH o backend grava "SEM_VENDAS_ASSOCIADAS".
 *
 * @param {string} grupoStr
 * @returns {{ competencia: string, loja: string, cargo: string, marca: string, label: string }}
 */
export function parseComparableGroup(grupoStr) {
  if (!grupoStr || typeof grupoStr !== 'string') {
    return { competencia: '', loja: '', cargo: '', marca: '', label: 'Grupo comparável geral' }
  }

  if (grupoStr.trim() === GRUPO_SEM_VENDAS) {
    return { competencia: '', loja: '', cargo: '', marca: '', label: 'Sem vendas associadas' }
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
  if (loja) labels.push(`Loja ${shortenIdentifier(loja)}`)
  if (cargo) labels.push(`Cargo ${shortenIdentifier(cargo)}`)
  if (marca) labels.push(`Marca ${shortenIdentifier(marca)}`)

  const label = labels.length > 0 ? labels.join(' · ') : grupoStr

  return { competencia, loja, cargo, marca, label }
}

/**
 * Extrai a competência (AAAA-MM) do alerta.
 * Todos os tipos trazem dataReferencia: data da venda (outliers/amostra) ou dia 1 da competência (SEM_VENDAS_PARA_RH).
 * O grupoComparavel é usado como fallback defensivo.
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
 * Rótulo da coluna "Data/Referência": data da venda para alertas de venda e competência para SEM_VENDAS_PARA_RH
 * (cujo dataReferencia é apenas o dia 1 da competência, não uma data real de venda).
 *
 * @param {Object} alerta
 * @returns {{ value: string, hint: string }}
 */
export function getAlertReferenceLabel(alerta) {
  if (!alerta || typeof alerta !== 'object') return { value: '—', hint: '' }
  if (alerta.tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH) {
    const comp = extractAlertCompetence(alerta)
    return { value: comp ? formatCompetenceLabel(comp) : '—', hint: 'Competência' }
  }
  return { value: formatAlertDate(alerta.dataReferencia), hint: 'Data da venda' }
}

/**
 * Rótulo amigável do método de detecção.
 *
 * @param {Object} alerta
 * @returns {string}
 */
export function formatMethodLabel(alerta) {
  if (!alerta || typeof alerta !== 'object') return '—'
  if (alerta.tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH) return 'Cruzamento RH × Vendas'
  if (alerta.metodo === METODO_LEAVE_ONE_OUT) return 'Z-score Leave-One-Out'
  return alerta.metodo || '—'
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
    const group = parseComparableGroup(alerta.grupoComparavel).label
    const valStr = formatCurrencyPtBr(alerta.valorObservado, true)

    if (isZeroDeviation(alerta)) {
      const mediaStr = formatCurrencyPtBr(alerta.mediaGrupo, true)
      return `Valor observado de ${valStr} difere do valor uniforme de ${mediaStr} registrado em todas as demais vendas do grupo ${group} (desvio padrão zero). Recomenda-se conferir as vendas do colaborador.`
    }

    const direction = getAnomalyDirection(alerta)
    const dirWord = direction === DIRECAO_ANOMALIA.ACIMA ? 'acima' : direction === DIRECAO_ANOMALIA.ABAIXO ? 'abaixo' : 'fora'
    const range = getEstimatedRange(alerta)
    const zScore = alerta.score != null && Number.isFinite(Number(alerta.score))
      ? formatDecimalPtBr(Math.abs(Number(alerta.score)))
      : '≥ 3'
    const rangeStr = range ? `${formatCurrencyPtBr(range.min, true)} a ${formatCurrencyPtBr(range.max, true)}` : 'faixa esperada'

    return `Valor observado de ${valStr} está ${dirWord} da faixa estimada de ${rangeStr} para o grupo ${group} (|Z| = ${zScore}; limiar |Z| ≥ 3). Recomenda-se conferir as vendas do colaborador.`
  }

  if (alerta.tipo === TIPO_ALERTA.SEM_VENDAS_PARA_RH) {
    const mat = alerta.matricula ? `matrícula ${alerta.matricula}` : 'matrícula não informada'
    return `Colaborador (${mat}) consta na base de RH do lote, mas nenhuma venda foi associada a ele. Recomenda-se verificar se houve omissão na carga de vendas ou se o colaborador não realizou vendas no período.`
  }

  if (alerta.tipo === TIPO_ALERTA.AMOSTRA_INSUFICIENTE) {
    const amostra = alerta.tamanhoAmostra ?? 0
    return `O grupo comparável possui apenas ${amostra} venda(s), contando a própria venda analisada (mínimo necessário: ${MIN_SAMPLE_SIZE}). Sem ao menos 3 vendas de referência não é possível estabelecer uma distribuição Leave-One-Out confiável.`
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

// ---------------------------------------------------------------------------
// Lotes de preparação efetivados (GET /campanhas/{id}/preparacao-bases)
// ---------------------------------------------------------------------------

function timestampOf(value) {
  const t = value ? new Date(value).getTime() : NaN
  return Number.isFinite(t) ? t : 0
}

const LOT_DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
})

/**
 * Converte a lista de LotePreparacaoResponseDTO em opções do seletor de lotes.
 * Mantém apenas lotes EFETIVADO (únicos aceitos pelo reprocessamento), sem duplicar ids,
 * do mais recente para o mais antigo.
 *
 * @param {Array} lotes
 * @returns {Array<{ id: string, label: string, tipoBase: string }>}
 */
export function buildLotOptions(lotes) {
  if (!Array.isArray(lotes)) return []
  const seen = new Set()
  return lotes
    .filter(l => l && l.id && (!l.status || String(l.status).toUpperCase() === 'EFETIVADO'))
    .filter(l => {
      const id = String(l.id)
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
    .sort((a, b) => timestampOf(b.efetivadoEm) - timestampOf(a.efetivadoEm))
    .map(l => {
      const id = String(l.id)
      const tipo = TIPO_BASE_LABEL[String(l.tipoBase || '').toUpperCase()] || l.tipoBase || 'Lote'
      const nome = l.nomeArquivo || `Lote ${id.slice(0, 8)}`
      const ts = timestampOf(l.efetivadoEm)
      const quando = ts ? ` · ${LOT_DATE_FORMAT.format(new Date(ts))}` : ''
      return { id, tipoBase: l.tipoBase || '', label: l.label || `${tipo} — ${nome}${quando}` }
    })
}

// ---------------------------------------------------------------------------
// Erros HTTP e feedback do reprocessamento
// ---------------------------------------------------------------------------

/**
 * @param {unknown} err
 * @returns {number|null}
 */
export function getHttpStatus(err) {
  const status = err?.response?.status
  return Number.isInteger(status) ? status : null
}

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isForbiddenError(err) {
  return getHttpStatus(err) === 403
}

/**
 * Traduz erros da API de alertas em mensagens orientativas por status HTTP.
 * Contratos: 400 BusinessException (mensagem do back em PT-BR), 403 SecurityConfig, 404 ResourceNotFoundException.
 *
 * @param {unknown} err
 * @param {'list'|'reprocess'} [context='list']
 * @returns {string}
 */
export function describeAlertsError(err, context = 'list') {
  const isReprocess = context === 'reprocess'
  const status = getHttpStatus(err)
  const serverMessage = typeof err?.response?.data?.message === 'string' ? err.response.data.message.trim() : ''

  if (status == null) {
    if (err?.isAxiosError || err?.request || err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK') {
      return 'Não foi possível se comunicar com o servidor. Verifique a conexão e tente novamente.'
    }
    return err?.message || (isReprocess ? 'Falha ao reprocessar o lote.' : 'Erro ao consultar alertas estatísticos.')
  }
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) {
    return isReprocess
      ? 'Seu perfil não tem permissão para reprocessar lotes (segregação de funções).'
      : 'Seu perfil não tem permissão para consultar os alertas estatísticos.'
  }
  if (status === 404) {
    return isReprocess
      ? 'Lote de preparação não encontrado. Ele pode ter sido descartado ou substituído.'
      : 'Consulta de alertas estatísticos indisponível no servidor.'
  }
  if (status === 400) {
    return serverMessage || (isReprocess ? 'O lote informado não pode ser reprocessado.' : 'Filtros de consulta inválidos.')
  }
  if (status >= 500) return 'O serviço de alertas está indisponível no momento. Tente novamente em instantes.'
  return serverMessage || (isReprocess ? 'Falha ao reprocessar o lote.' : 'Erro ao consultar alertas estatísticos.')
}

/**
 * Converte ReprocessamentoAlertasResponse em feedback visual.
 * 0 gerados e 0 substituídos significa que as assinaturas não mudaram (bases inalteradas).
 *
 * @param {{ alertasGerados?: number, alertasSubstituidos?: number, semAmostra?: boolean } | null} result
 * @returns {{ tone: 'success'|'neutral', message: string }}
 */
export function describeReprocessResult(result) {
  if (!result || typeof result !== 'object') {
    return { tone: 'success', message: 'Reprocessamento concluído. Alertas atualizados.' }
  }
  const gerados = Number(result.alertasGerados) || 0
  const substituidos = Number(result.alertasSubstituidos) || 0
  const amostraNote = result.semAmostra ? ' Há alertas de inconsistência de carga ou amostra insuficiente neste lote.' : ''

  if (gerados === 0 && substituidos === 0) {
    return {
      tone: 'neutral',
      message: `As bases deste lote não mudaram desde a última análise; nenhum alerta foi recalculado.${amostraNote}`
    }
  }
  return {
    tone: 'success',
    message: `Reprocessamento concluído: ${gerados} alerta(s) gerado(s) e ${substituidos} alerta(s) anterior(es) substituído(s).${amostraNote}`
  }
}

/**
 * Mensagem do tooltip quando o perfil não pode reprocessar.
 *
 * @param {string|undefined} role
 * @returns {string}
 */
export function reprocessDeniedMessage(role) {
  if (role === 'AUDITOR') return 'Seu perfil permite somente consulta. Nenhuma alteração pode ser feita.'
  if (role === 'ADMINISTRADOR' || role === 'GERENTE_VENDAS') {
    return 'Seu usuário não possui a permissão de importação de bases necessária para reprocessar lotes.'
  }
  return 'Reprocessamento restrito a gerente de vendas ou administrador.'
}

// ---------------------------------------------------------------------------
// Controle de concorrência de requisições
// ---------------------------------------------------------------------------

/**
 * Cria um guarda que identifica a requisição mais recente, descartando respostas obsoletas.
 *
 * @returns {{ next: () => number, isCurrent: (token: number) => boolean }}
 */
export function createLatestGuard() {
  let current = 0
  return {
    next: () => ++current,
    isCurrent: token => token === current
  }
}
