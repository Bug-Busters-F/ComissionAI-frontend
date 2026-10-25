import api from './api'
import { normalizeCompetence } from './competenceUtils'

const STATES = new Set(['PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'FALHOU', 'EXCLUIDO'])

function canceled() {
  const error = new Error('A consulta da importação foi cancelada. O processamento já aceito pode continuar no servidor.')
  error.code = 'ERR_CANCELED'
  return error
}

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(canceled())
    const finish = () => { signal?.removeEventListener('abort', abort); resolve() }
    const timer = setTimeout(finish, ms)
    const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(canceled()) }
    signal?.addEventListener('abort', abort, { once: true })
  })
}

// Um HTTP 202 é apenas o recibo. Somente CONCLUIDO confirma a gravação do lote.
export function createImportBatchService(http = api, { pollMs = 1000, timeoutMs = 300000, now = Date.now, wait = pause } = {}) {
  return {
    async upload({ file, importType, competencia, signal, onStatus, allowFailedReport = false }) {
      const month = normalizeCompetence(competencia)
      if (importType !== 'HR' && !month) throw new Error('Informe uma competência válida no formato MM/AAAA.')
      if (!file) throw new Error('Selecione o arquivo da importação.')
      const deadline = now() + timeoutMs
      let reportId
      let reused = false
      const config = () => {
        if (signal?.aborted) throw canceled()
        const remaining = deadline - now()
        if (remaining <= 0) throw new Error('Tempo de acompanhamento esgotado. A conclusão da importação não foi confirmada.')
        return { signal, timeout: remaining }
      }
      const validate = (report) => {
        if (!Number.isSafeInteger(report?.reportId) || report.reportId <= 0 ||
            !STATES.has(report.status) || report.tipoBase !== importType ||
            report.nomeArquivo !== file.name || (reportId && report.reportId !== reportId)) {
          throw new Error('O backend retornou um relatório de importação inválido. A gravação não foi confirmada.')
        }
        return report
      }
      try {
        const form = new FormData()
        form.append('file', file)
        // Contrato da dev: parâmetros somente na query, arquivo no multipart.
        // Spring reúne os dois locais; nunca duplicar competencia.
        const params = { importType, ...(importType !== 'HR' ? { competencia: month } : {}) }
        let report
        try {
          report = validate((await http.post('/imports/upload', form, { ...config(), params })).data)
        } catch (error) {
          // O servidor só informa este ID após comparar o hash, tipo e competência.
          // Não reutilizar lotes por nome de arquivo ou conflitos de outra natureza.
          const message = error?.response?.data?.message || ''
          const duplicate = /Já existe um lote ativo \(reportId=(\d+), status: (?:PENDENTE|PROCESSANDO|CONCLUIDO)\)/.exec(message)
          if (error?.response?.status !== 409 || !duplicate) throw error
          reportId = Number(duplicate[1])
          report = validate((await http.get(`/imports/${reportId}`, config())).data)
          reused = true
        }
        reportId = report.reportId
        while (true) {
          if (signal?.aborted) throw canceled()
          onStatus?.({ ...report, reused })
          if (report.status === 'CONCLUIDO') {
            if (!Number.isSafeInteger(report.totalLinhas) || report.totalLinhas < 0) {
              throw new Error('O lote foi concluído sem uma contagem válida de registros.')
            }
            return { ...report, reused }
          }
          if (report.status === 'FALHOU' && allowFailedReport) return { ...report, reused }
          if (report.status === 'FALHOU' || report.status === 'EXCLUIDO') {
            throw new Error(report.mensagem || `Importação ${report.status.toLowerCase()}.`)
          }
          const { timeout } = config()
          await wait(Math.min(pollMs, timeout), signal)
          report = validate((await http.get(`/imports/${reportId}`, config())).data)
        }
      } catch (error) {
        const reason = error?.response?.data?.message || error.message || 'Falha na importação.'
        const wrapped = new Error(`${reason}${reportId ? ` (Relatório ${reportId})` : ''}`)
        wrapped.cause = error
        wrapped.code = error.code
        wrapped.reportId = reportId
        throw wrapped
      }
    }
  }
}

export const importBatchService = createImportBatchService()
