import api from './api'
import { ASYNC_EXECUTION_STATES as S, loadExecutionRecord, saveExecutionRecord, clearExecutionRecord } from './asyncExecutionService'
import { normalizeCompetence } from './competenceUtils'

const scope = 'calculation-v2'
const activeKey = 'active'
const active = (record) => record && ![S.CONCLUIDA, S.FALHOU].includes(record.status)
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
const stages = { SOLICITADA: 'Apuração na fila.', PROCESSANDO: 'Calculando as comissões.', CONCLUIDA: 'Apuração concluída.', FALHOU: 'A apuração não foi concluída.' }

function paused(message, cause) {
  return Object.assign(new Error(message, { cause }), { kind: 'monitoring', code: 'MONITORING_PAUSED' })
}
function requestKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `calc-${Date.now()}-${Math.random().toString(36).slice(2)}`
}
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(paused('Acompanhamento interrompido. A execução pode continuar; retome a consulta.'))
    const abort = () => { clearTimeout(timer); reject(paused('Acompanhamento interrompido. A execução pode continuar; retome a consulta.')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, ms)
    signal?.addEventListener('abort', abort, { once: true })
  })
}
function definitiveRejection(error) {
  const status = error?.response?.status
  return status >= 400 && status < 500 && status !== 408 && status !== 429
}

export function validateCalculationExecution(raw, record) {
  if (!raw || !uuid.test(raw.id || '') || (record.executionId && raw.id !== record.executionId) ||
      raw.competencia !== record.competencia || raw.recalcular !== record.recalcular || !Object.hasOwn(stages, raw.status) ||
      !Number.isInteger(raw.percentual) || raw.percentual < 0 || raw.percentual > 100 ||
      !Number.isInteger(raw.totalItens) || raw.totalItens < 0 || !Number.isInteger(raw.itensProcessados) || raw.itensProcessados < 0 || raw.itensProcessados > raw.totalItens ||
      (raw.status === 'CONCLUIDA' ? raw.percentual !== 100 : raw.percentual > 99)) {
    throw paused('A consulta retornou uma execução incompatível. Nenhum resultado foi aceito; retome o acompanhamento.')
  }
  return raw
}

export function executionSummary(raw) {
  // The current backend persists counts, not a financial result or a JSON payload.
  const match = typeof raw.resultado === 'string' && raw.resultado.match(/^vendas=(\d+),sucessos=(\d+),impedimentos=(\d+)$/)
  if (!match) throw paused('A apuração terminou, mas seu resumo não pôde ser confirmado. Consulte o histórico ou retome a consulta.')
  const [total, successes, impediments] = match.slice(1).map(Number)
  if (![total, successes, impediments].every(Number.isSafeInteger) || total !== successes + impediments || total !== raw.totalItens || raw.itensProcessados !== total) {
    throw paused('As contagens da apuração são inconsistentes. Nenhum resultado foi aceito; retome a consulta.')
  }
  return { competencia: raw.competencia, totalVendasProcessadas: total, totalCalculados: successes, totalImpedimentos: impediments,
    valorTotalVendas: null, valorTotalComissao: null, resultados: [], impedimentos: [],
    recalculoExecutado: raw.recalcular, resumoExecucao: true, execucaoId: raw.id }
}

export function createCalculationExecutionClient(http = api, { intervalMs = 1000, maxAttempts = 900, maxTransientFailures = 3, delay = wait } = {}) {
  const config = (signal) => ({ signal, timeout: 30000 })
  const key = (competencia) => `calc-${competencia}`
  function save(record) {
    saveExecutionRecord(scope, key(record.competencia), record)
    const current = loadExecutionRecord(scope, activeKey)
    if (active(record)) saveExecutionRecord(scope, activeKey, record)
    else if (current?.idempotencyKey === record.idempotencyKey) clearExecutionRecord(scope, activeKey)
  }
  function recover(competencia) {
    const normalized = normalizeCompetence(competencia)
    return loadExecutionRecord(scope, normalized ? key(normalized) : activeKey)
  }
  function clear(competencia) {
    const record = recover(competencia)
    if (!record || active(record)) return false
    clearExecutionRecord(scope, key(record.competencia))
    return true
  }
  async function follow(record, { signal, onProgress, submit = false, retryFailed = false } = {}) {
    let current = { ...record }
    const emit = (changes) => { current = { ...current, ...changes }; save(current); onProgress?.({ ...current }) }
    const accept = (raw) => {
      validateCalculationExecution(raw, current)
      const result = raw.status === 'CONCLUIDA' ? executionSummary(raw) : null
      emit({ executionId: raw.id, serverStatus: raw.status,
        status: raw.status === 'SOLICITADA' ? S.AGUARDANDO : S[raw.status], progress: raw.percentual,
        stage: stages[raw.status], transientWarning: '', errorMessage: raw.falha || '', result,
        iniciadoEm: raw.iniciadoEm, concluidoEm: raw.concluidoEm })
      return raw
    }
    const finish = (raw) => {
      if (raw.status === 'FALHOU') throw Object.assign(new Error(raw.falha || 'A apuração falhou. Confira o motivo antes de tentar novamente.'), { kind: 'execution', code: 'EXECUTION_FAILED' })
      return raw.status === 'CONCLUIDA' ? current.result : null
    }
    try {
      if (signal?.aborted) throw paused('Acompanhamento interrompido. Retome a consulta para verificar a execução.')
      let first, retryRejection
      if (retryFailed) {
        if (!uuid.test(current.executionId || '')) throw paused('O identificador desta execução não está disponível para nova tentativa.')
        // After an ambiguous retry response, the same execution is queried, never resubmitted.
        emit({ status: S.AGUARDANDO, stage: 'Solicitando nova tentativa.', result: null })
        try { first = (await http.post(`/execucoes/calculo/${current.executionId}/retomar`, {}, config(signal))).data }
        catch (error) {
          if (definitiveRejection(error)) {
            retryRejection = error.response.data?.message || 'A nova tentativa foi rejeitada.'
            first = (await http.get(`/execucoes/calculo/${current.executionId}`, config(signal))).data
          } else throw error
        }
      } else if (submit || !current.executionId) {
        try {
          first = (await http.post('/execucoes/calculo', { competencia: current.competencia, recalcular: current.recalcular, chaveIdempotencia: current.idempotencyKey },
            { ...config(signal), headers: { 'Idempotency-Key': current.idempotencyKey } })).data
        } catch (error) {
          if (definitiveRejection(error)) {
            clearExecutionRecord(scope, key(current.competencia))
            if (recover()?.idempotencyKey === current.idempotencyKey) clearExecutionRecord(scope, activeKey)
            throw Object.assign(new Error(error.response.data?.message || 'A solicitação foi rejeitada.'), { kind: 'rejected', response: error.response })
          }
          throw error
        }
      } else first = (await http.get(`/execucoes/calculo/${current.executionId}`, config(signal))).data
      first = accept(first)
      if (retryRejection && first.status === 'FALHOU') throw Object.assign(new Error(retryRejection), { kind: 'execution', code: 'EXECUTION_FAILED' })
      let result = finish(first)
      if (result) return result
      let failures = 0
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await delay(intervalMs, signal)
        let raw
        try { raw = (await http.get(`/execucoes/calculo/${current.executionId}`, config(signal))).data; failures = 0 }
        catch (error) {
          if (signal?.aborted || definitiveRejection(error) || ++failures > maxTransientFailures) throw error
          emit({ transientWarning: 'A consulta está temporariamente indisponível. A apuração pode continuar; aguardando nova resposta.' })
          continue
        }
        raw = accept(raw)
        result = finish(raw)
        if (result) return result
      }
      throw paused('O acompanhamento atingiu o tempo de espera. Retome a consulta; uma nova apuração não será iniciada.')
    } catch (error) {
      if (error.kind === 'execution' || error.kind === 'rejected') throw error
      const warning = error.kind === 'monitoring' ? error.message : 'Não foi possível confirmar o estado da apuração. Retome o acompanhamento, sem iniciar outro cálculo.'
      emit({ status: S.ACOMPANHAMENTO_PAUSADO, stage: 'Acompanhamento pausado.', transientWarning: warning })
      throw paused(warning, error)
    }
  }
  async function start(competencia, options = {}) {
    const normalized = normalizeCompetence(competencia)
    if (!normalized) throw Object.assign(new Error('Competência inválida para apuração.'), { kind: 'rejected' })
    const prior = recover(normalized)
    const running = recover()
    if (active(running) && running.competencia !== normalized) throw Object.assign(new Error(`Existe uma apuração em acompanhamento para ${running.competencia}.`), { kind: 'rejected' })
    if (active(prior)) {
      if (prior.recalcular !== (options.recalcular === true)) throw Object.assign(new Error('Retome a execução anterior antes de mudar o tipo da apuração.'), { kind: 'rejected' })
      return follow(prior, options)
    }
    if (prior?.status === S.FALHOU && prior.recalcular === (options.recalcular === true)) return follow(prior, { ...options, retryFailed: true })
    const record = { competencia: normalized, recalcular: options.recalcular === true, tipoOperacao: options.recalcular === true ? 'RECALCULO' : 'CALCULO',
      idempotencyKey: requestKey(), executionId: '', status: S.AGUARDANDO, progress: null, stage: 'Solicitando apuração.', result: null }
    save(record)
    if (recover(normalized)?.idempotencyKey !== record.idempotencyKey) throw Object.assign(new Error('Não foi possível guardar o acompanhamento neste navegador. A apuração não foi iniciada.'), { kind: 'rejected' })
    options.onProgress?.({ ...record })
    return follow(record, { ...options, submit: true })
  }
  function resume(competencia, options = {}) {
    const record = recover(competencia)
    if (!record) return Promise.reject(Object.assign(new Error('Nenhuma execução salva para acompanhar.'), { kind: 'rejected' }))
    return follow(record, options)
  }
  return { start, resume, recover, clear }
}
