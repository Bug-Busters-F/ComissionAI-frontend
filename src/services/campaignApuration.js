import { computed, reactive } from 'vue'
import { userFacingText } from './userFacingText'

export function apurationPeriods(start, end) {
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  if (!validDate(start) || !validDate(end) || end < start) return []
  const result = []
  let year = Number(start.slice(0, 4)), month = Number(start.slice(5, 7))
  while (`${year}-${String(month).padStart(2, '0')}` <= end.slice(0, 7)) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
    result.push({ competencia: key, dataInicio: start > `${key}-01` ? start : `${key}-01`, dataFim: end < last ? end : last })
    if (++month > 12) { month = 1; year++ }
  }
  return result
}

export function apurationCoverageIssues(covered) {
  if (!covered) return [{ area: 'Bases', message: 'Não foi possível encontrar o diagnóstico desta competência.' }]
  return [['rh', 'RH'], ['vendas', 'Vendas'], ['taxasBase', 'Taxas de comissão']].flatMap(([field, area]) => {
    const diagnosis = covered[field]
    if (diagnosis?.coberto === true) return []
    return [{ area, message: userFacingText(diagnosis?.mensagem || `A cobertura de ${area} ainda não foi confirmada.`),
      references: field === 'taxasBase' ? (diagnosis?.referenciasFaltantes || []).map(item => `Marca ${item.descrMarca || item.codMarca || 'não informada'} · Cargo ${item.descriCargo || item.codCargo || 'não informado'}`) : [] }]
  })
}

export function apurationError(error) {
  const code = error?.response?.status
  if (code === 403) return 'Seu perfil não permite realizar esta operação.'
  if (code === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (code === 404) return 'A apuração ou a campanha não está disponível. Atualize a consulta.'
  const message = error?.response?.data?.message
  if (message && code < 500) return userFacingText(message).replace(/flag forcarRecalculo/gi, 'autorização de recálculo')
  return 'Não foi possível concluir a consulta. Tente novamente.'
}

export function validateApuration(raw, campaignId, { id, period, version } = {}) {
  if (!raw?.apuracaoId || !raw.protocolo || String(raw.campanhaId) !== String(campaignId)
    || (id && raw.apuracaoId !== id) || (version != null && raw.versaoCampanhaNumero !== version)
    || (period && ['competencia', 'dataInicio', 'dataFim'].some(key => raw[key] !== period[key]))
    || !Array.isArray(raw.itens) || !Array.isArray(raw.impedimentos)
    || !['totalVendasProcessadas', 'totalCalculados', 'totalImpedimentos'].every(key => Number.isInteger(raw[key]) && raw[key] >= 0)
    || raw.totalVendasProcessadas !== raw.totalCalculados + raw.totalImpedimentos
    || !['valorTotalVendas', 'valorTotalComissao', 'valorTotalBonus'].every(key => raw[key] != null && raw[key] !== '' && Number.isFinite(Number(raw[key])))) {
    throw new Error('A resposta recebida não corresponde à apuração solicitada. Atualize o histórico antes de continuar.')
  }
  return raw
}

// No retry of financial writes: an unanswered request may still have committed.
export function createCampaignApuration({ campaign, api, canView, canExecute, userId, storage, notify = () => {} }) {
  const state = reactive({ history: [], detail: null, selected: '', month: '', loading: false, detailLoading: false, checking: false, working: false, exporting: false, error: '', detailError: '', checkError: '', coverageIssues: [], exportError: '', ready: false, uncertain: null, historyLoaded: false, checkedHistory: false })
  const periods = computed(() => apurationPeriods(campaign().dataInicio, campaign().dataFim))
  const period = computed(() => periods.value.find(p => p.competencia === state.month))
  const version = computed(() => campaign().versaoVigente)
  const key = () => `comissionai.apuration.pending.${userId}.${campaign().id}`
  let historyRequest = 0, detailRequest = 0, checkRequest = 0, disposed = false
  const canRun = computed(() => canExecute() && Boolean(version.value) && Boolean(period.value) && state.ready && state.historyLoaded && !state.loading && !state.checking && !state.working && !state.uncertain)
  function restore() {
    try { state.uncertain = JSON.parse(storage?.getItem(key()) || 'null') } catch { state.uncertain = null }
  }
  function remember(value) {
    if (value) {
      if (!storage) throw new Error('Não foi possível guardar o acompanhamento neste navegador. A apuração não foi iniciada.')
      storage.setItem(key(), JSON.stringify(value))
    }
    else storage?.removeItem(key())
    state.uncertain = value
    state.checkedHistory = false
  }
  async function select(id) {
    if (!canView() || state.working) return false
    const request = ++detailRequest
    state.selected = id; state.detail = null; state.detailError = ''; state.detailLoading = Boolean(id)
    if (!id) return false
    try {
      const raw = validateApuration(await api.detail(campaign().id, id), campaign().id, { id })
      if (disposed || request !== detailRequest) return false
      state.detail = raw
      return true
    } catch (error) {
      if (!disposed && request === detailRequest) state.detailError = error.response ? apurationError(error) : error.message
      return false
    } finally { if (request === detailRequest) state.detailLoading = false }
  }
  async function loadHistory({ selectLatest = false } = {}) {
    if (!canView() || state.working) return false
    const request = ++historyRequest
    state.loading = true; state.error = ''; state.historyLoaded = false
    try {
      const raw = await api.history(campaign().id)
      if (disposed || request !== historyRequest) return false
      if (!Array.isArray(raw) || raw.some(r => !r.apuracaoId || String(r.campanhaId) !== String(campaign().id))) throw new Error('Histórico inválido')
      state.history = raw; state.historyLoaded = true
      if (state.uncertain) state.checkedHistory = true
      const latest = raw.find(r => r.competencia === state.month && r.versaoCampanhaNumero === version.value)
      if (selectLatest) await select(latest?.apuracaoId || '')
      return true
    } catch {
      if (!disposed && request === historyRequest) state.error = 'Não foi possível consultar o histórico de apurações. Tente novamente.'
      return false
    } finally { if (request === historyRequest) state.loading = false }
  }
  async function check() {
    const request = ++checkRequest
    state.ready = false; state.checkError = ''; state.coverageIssues = []; state.checking = false
    if (!canExecute() || !period.value || !version.value) return false
    state.checking = true
    const month = state.month, expectedVersion = version.value
    try {
      const [current, program, coverage, closing, published] = await Promise.all([
        api.campaign(campaign().id), api.program(campaign().id, expectedVersion), api.coverage(campaign().id), api.closing(month), api.version(campaign().id, expectedVersion)
      ])
      if (disposed || request !== checkRequest || state.month !== month) return false
      if (current.versaoVigente !== expectedVersion || published.dataInicio !== campaign().dataInicio || published.dataFim !== campaign().dataFim || published.numero !== expectedVersion || String(published.campanhaId) !== String(campaign().id)) throw new Error('A campanha foi alterada. Recarregue os detalhes antes de apurar.')
      if (String(program.campanhaId) !== String(campaign().id) || program.versaoCampanhaNumero !== expectedVersion || program.statusAprovacao !== 'APROVADO' || program.validoParaExecucao !== true) throw new Error('O código da versão vigente precisa estar revisado e aprovado antes da apuração.')
      if (closing.competencia !== month || typeof closing.bloqueada !== 'boolean') throw new Error('Não foi possível confirmar a situação de fechamento desta competência.')
      if (closing.bloqueada || closing.status === 'CONCLUIDO') throw new Error('Esta competência já foi fechada. Uma nova apuração está bloqueada.')
      if (String(coverage.campanhaId) !== String(campaign().id) || coverage.versaoVigenteNumero !== expectedVersion) throw new Error('Não foi possível confirmar as bases da versão vigente.')
      const covered = coverage.competencias?.find(c => c.competencia === month)
      if (covered?.coberta !== true) state.coverageIssues = apurationCoverageIssues(covered)
      if (covered?.coberta !== true) throw new Error('As bases desta competência estão incompletas ou possuem pendências. Confira os arquivos e o diagnóstico em Bases da campanha.')
      state.ready = true
      return true
    } catch (error) {
      if (!disposed && request === checkRequest) state.checkError = error.response ? apurationError(error) : error.message
      return false
    } finally { if (request === checkRequest) state.checking = false }
  }
  async function changeMonth(month) {
    if (state.working || state.month === month) return
    state.month = month
    await Promise.all([check(), select(state.history.find(r => r.competencia === month && r.versaoCampanhaNumero === version.value)?.apuracaoId || '')])
  }
  async function execute(observacoes = '') {
    if (!canRun.value) return false
    state.working = true; state.error = ''; state.ready = false
    const requestedPeriod = { ...period.value }, expectedVersion = version.value
    let posted = false
    try {
      if (!await check() || disposed || !canExecute()) return false
      // Persist only request metadata, scoped by authenticated user. Do not send if this fails.
      remember({ ...requestedPeriod, version: expectedVersion, startedAt: new Date().toISOString() })
      posted = true
      const raw = validateApuration(await api.execute(campaign().id, expectedVersion, { ...requestedPeriod, observacoes: observacoes.trim() || null, forcarRecalculo: false }), campaign().id, { period: requestedPeriod, version: expectedVersion })
      remember(null)
      if (disposed) return false
      state.detail = raw; state.selected = raw.apuracaoId
      state.history = [raw, ...state.history.filter(r => r.apuracaoId !== raw.apuracaoId)]
      const partial = raw.totalImpedimentos > 0 || raw.status !== 'CONCLUIDO'
      notify(partial ? 'warning' : 'success', partial ? 'Apuração retornada com ressalvas' : 'Apuração concluída', partial ? 'Confira os impedimentos e o estado do resultado.' : 'O resultado desta campanha foi confirmado e está disponível para consulta.')
      return true
    } catch (error) {
      const rejected = error.response?.status >= 400 && error.response.status < 500 && ![408].includes(error.response.status)
      if (rejected || !posted) { if (posted) remember(null); state.error = error.response ? apurationError(error) : error.message }
      else state.error = 'Não foi possível confirmar a conclusão. Consulte o histórico antes de iniciar outra apuração; a solicitação pode ter sido concluída.'
      return false
    } finally { state.working = false; state.ready = false }
  }
  const canResolveUncertain = computed(() => {
    const pending = state.uncertain, detail = state.detail
    return Boolean(pending && detail && state.checkedHistory && state.historyLoaded && !state.working
      && detail.versaoCampanhaNumero === pending.version
      && ['competencia', 'dataInicio', 'dataFim'].every(key => detail[key] === pending[key])
      && Date.parse(detail.executadoEm) >= Date.parse(pending.startedAt))
  })
  function acknowledge() {
    if (canResolveUncertain.value) remember(null)
  }
  async function init() {
    restore()
    state.month = periods.value[0]?.competencia || ''
    await Promise.all([loadHistory({ selectLatest: true }), check()])
  }
  function dispose() { disposed = true; historyRequest++; detailRequest++; checkRequest++ }
  return { state, periods, period, canRun, canResolveUncertain, version, init, check, loadHistory, select, changeMonth, execute, acknowledge, dispose }
}
