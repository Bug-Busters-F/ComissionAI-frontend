const STORAGE_PREFIX = 'comissai:async-exec:v1:'

export const ASYNC_EXECUTION_STATES = {
  IDLE: 'IDLE',
  AGUARDANDO: 'AGUARDANDO',
  PROCESSANDO: 'PROCESSANDO',
  CONCLUIDA: 'CONCLUIDA',
  FALHOU: 'FALHOU',
  INVALIDADA: 'INVALIDADA'
}

export function formatExecutionStateLabel(status) {
  const map = {
    IDLE: 'Não iniciada',
    AGUARDANDO: 'Aguardando fila',
    PROCESSANDO: 'Processando',
    CONCLUIDA: 'Concluída',
    FALHOU: 'Falhou',
    INVALIDADA: 'Desatualizada'
  }
  return map[status] || status || 'Não iniciada'
}

export function executionStateTone(status) {
  const map = {
    IDLE: 'neutral',
    AGUARDANDO: 'warning',
    PROCESSANDO: 'warning',
    CONCLUIDA: 'success',
    FALHOU: 'danger',
    INVALIDADA: 'warning'
  }
  return map[status] || 'neutral'
}

function getStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return null
}

function buildStorageKey(scope, contextKey = 'default') {
  return `${STORAGE_PREFIX}${scope}:${contextKey || 'default'}`
}

/**
 * Salva o estado de uma execução assíncrona para permitir recuperação
 * após atualização da página (F5) ou navegação entre rotas.
 */
export function saveExecutionRecord(scope, contextKey, record) {
  const storage = getStorage()
  if (!storage || !record) return

  try {
    const key = buildStorageKey(scope, contextKey)
    storage.setItem(key, JSON.stringify({
      ...record,
      updatedAt: new Date().toISOString()
    }))
  } catch {
    // Ignore quota errors
  }
}

/**
 * Recupera o registro de execução assíncrona persistido.
 */
export function loadExecutionRecord(scope, contextKey) {
  const storage = getStorage()
  if (!storage) return null

  try {
    const key = buildStorageKey(scope, contextKey)
    const raw = storage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * Remove o registro de execução assíncrona persistido.
 */
export function clearExecutionRecord(scope, contextKey) {
  const storage = getStorage()
  if (!storage) return

  try {
    const key = buildStorageKey(scope, contextKey)
    storage.removeItem(key)
  } catch {
    // Ignore
  }
}

/**
 * Gera um identificador determinístico e legível para execuções assíncronas.
 */
export function generateExecutionId(prefix = 'SIM', competencia = '') {
  const cleanComp = String(competencia || '').replace(/[^0-9]/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
  const timePart = Date.now().toString(36).slice(-4).toUpperCase()
  return cleanComp
    ? `${prefix}-${cleanComp}-${timePart}${randomSuffix}`
    : `${prefix}-${timePart}${randomSuffix}`
}

/**
 * Normaliza um payload de status retornado por uma API assíncrona do backend.
 */
export function normalizeBackendExecutionStatus(data = {}, fallbackId = null) {
  const rawState = String(data.estado || data.status || '').toUpperCase().trim()
  let status = ASYNC_EXECUTION_STATES.PROCESSANDO

  if (['AGUARDANDO', 'QUEUED', 'PENDING', 'CRIADA'].includes(rawState)) {
    status = ASYNC_EXECUTION_STATES.AGUARDANDO
  } else if (['PROCESSANDO', 'RUNNING', 'IN_PROGRESS', 'STARTED'].includes(rawState)) {
    status = ASYNC_EXECUTION_STATES.PROCESSANDO
  } else if (['CONCLUIDA', 'CONCLUIDO', 'COMPLETED', 'SUCCESS', 'SUCESSO', 'DONE'].includes(rawState)) {
    status = ASYNC_EXECUTION_STATES.CONCLUIDA
  } else if (['FALHOU', 'FAILED', 'ERROR', 'ERRO', 'REJEITADO'].includes(rawState)) {
    status = ASYNC_EXECUTION_STATES.FALHOU
  }

  const progress = Number.isFinite(Number(data.progresso ?? data.progress))
    ? Math.max(0, Math.min(100, Number(data.progresso ?? data.progress)))
    : status === ASYNC_EXECUTION_STATES.CONCLUIDA
      ? 100
      : status === ASYNC_EXECUTION_STATES.AGUARDANDO
        ? 10
        : 50

  return {
    id: data.id || data.execucaoId || data.protocolo || fallbackId,
    status,
    progress,
    stage: data.etapa || data.stage || data.mensagem || '',
    error: data.erro || data.error || data.motivoFalha || '',
    result: data.resultado || data.result || null,
    startedAt: data.iniciadoEm || data.startedAt || null,
    completedAt: data.concluidoEm || data.completedAt || null,
    transientWarning: ''
  }
}

/**
 * Acompanha uma execução assíncrona via polling resiliente a falhas temporárias de rede.
 * Não reinicia nem duplica a execução quando uma consulta intermediária falha.
 */
export async function pollAsyncExecution({
  executionId,
  fetchStatus,
  onUpdate,
  intervalMs = 800,
  maxTransientFailures = 3,
  maxAttempts = 120,
  signal = null
}) {
  let transientFailures = 0
  let attempts = 0

  while (attempts < maxAttempts) {
    if (signal?.aborted) {
      const abortErr = new Error('Acompanhamento interrompido na tela; o processamento segue no servidor.')
      abortErr.code = 'POLLING_ABORTED'
      throw abortErr
    }

    attempts += 1

    try {
      const rawStatus = await fetchStatus(executionId, { signal })
      transientFailures = 0
      const normalized = normalizeBackendExecutionStatus(rawStatus, executionId)
      onUpdate?.(normalized)

      if (normalized.status === ASYNC_EXECUTION_STATES.CONCLUIDA || normalized.status === ASYNC_EXECUTION_STATES.FALHOU) {
        return normalized
      }
    } catch (error) {
      if (signal?.aborted || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') {
        const abortErr = new Error('Acompanhamento interrompido na tela; o processamento segue no servidor.')
        abortErr.code = 'POLLING_ABORTED'
        throw abortErr
      }

      transientFailures += 1
      if (transientFailures > maxTransientFailures) {
        const failState = {
          id: executionId,
          status: ASYNC_EXECUTION_STATES.FALHOU,
          progress: 100,
          stage: 'Falha ao consultar estado da execução',
          error: error?.response?.data?.message || error?.message || 'Não foi possível confirmar o término da execução no servidor.',
          result: null,
          transientWarning: ''
        }
        onUpdate?.(failState)
        return failState
      }

      onUpdate?.({
        id: executionId,
        status: ASYNC_EXECUTION_STATES.PROCESSANDO,
        stage: 'Reconectando para atualizar o progresso (a execução continua no servidor)...',
        transientWarning: `Oscilação temporária na consulta (${transientFailures}/${maxTransientFailures}). Aguardando resposta sem duplicar a execução.`
      })
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  const timeoutState = {
    id: executionId,
    status: ASYNC_EXECUTION_STATES.FALHOU,
    progress: 100,
    stage: 'Tempo limite de acompanhamento atingido',
    error: 'O acompanhamento atingiu o tempo limite de espera. A execução pode ainda estar em andamento no servidor.',
    result: null
  }
  onUpdate?.(timeoutState)
  return timeoutState
}
