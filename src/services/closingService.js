import api from './api'

/**
 * Normaliza o formato de competência para YYYY-MM.
 * Aceita "YYYY-MM", "MM/YYYY" ou Date.
 */
export function normalizeCompetenceKey(competence) {
  if (!competence) return ''
  const str = String(competence).trim()
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(str)) return str
  const matchBr = str.match(/^(0[1-9]|1[0-2])\/(\d{4})$/)
  if (matchBr) return `${matchBr[2]}-${matchBr[1]}`
  return str
}

/**
 * Consulta a situação de fechamento e bloqueio de uma competência mensal.
 * @param {string} competencia - Formato YYYY-MM
 * @returns {Promise<{competencia: string, status: string, bloqueada: boolean, fechamentoId: string|null, protocolo: string|null, fechadoEm: string|null, executadoPor: string|null, mensagem: string}>}
 */
export async function getClosingStatus(competencia) {
  const comp = normalizeCompetenceKey(competencia)
  if (!comp) throw new Error('Competência é obrigatória para consulta de status.')
  const response = await api.get(`/comissoes/fechamento/${encodeURIComponent(comp)}/status`)
  return response.data
}

/**
 * Lista o histórico paginado de fechamentos finais.
 * @param {object} params - { competencia, page, size }
 */
export async function listClosings(params = {}) {
  const query = {}
  if (params.competencia) query.competencia = normalizeCompetenceKey(params.competencia)
  if (typeof params.page === 'number') query.page = params.page
  if (typeof params.size === 'number') query.size = params.size
  const response = await api.get('/comissoes/fechamento', { params: query })
  return response.data
}

/**
 * Mapeia uma lista de fechamentos para um dicionário indexado por competência normalizada (YYYY-MM),
 * considerando exclusivamente registros com status 'CONCLUIDO'.
 * Usado para badges e travas na listagem de competências e campanhas.
 * @param {object|Array} closingsResponse - Resposta paginada ou lista de fechamentos
 * @returns {Record<string, object>}
 */
export function mapClosedCompetences(closingsResponse) {
  const list = closingsResponse?.content || (Array.isArray(closingsResponse) ? closingsResponse : [])
  const map = {}
  for (const item of list) {
    if (item && item.status === 'CONCLUIDO' && item.competencia) {
      const key = normalizeCompetenceKey(item.competencia)
      if (key) map[key] = item
    }
  }
  return map
}

/**
 * Executa o Fechamento Definitivo de Competência (BACK-11).
 * 
 * Regras estritas:
 * - Chamada síncrona sem timeout no cliente (timeout: 0).
 * - Sem retry automático para evitar duplicação ou conflitos de transação.
 * - Caso a conexão caia sem resposta HTTP, consulta o status para recuperação.
 * 
 * @param {object} payload - { competencia, executadoPor, motivo }
 * @returns {Promise<object>} FechamentoResponseDTO
 */
export async function executeClosing({ competencia, executadoPor, motivo }) {
  const comp = normalizeCompetenceKey(competencia)
  if (!comp || !/^\d{4}-(0[1-9]|1[0-2])$/.test(comp)) {
    throw new Error('Competência inválida. Utilize o formato AAAA-MM (ex: 2026-10).')
  }
  const justif = (motivo || '').trim()
  if (!justif) {
    throw new Error('A justificativa contábil do fechamento é obrigatória.')
  }
  const autor = (executadoPor || '').trim()
  if (!autor) {
    throw new Error('Identificação do usuário responsável é obrigatória para o fechamento auditável.')
  }

  try {
    const response = await api.post(
      '/comissoes/fechamento',
      {
        competencia: comp,
        executadoPor: autor,
        motivo: justif
      },
      {
        timeout: 0 // Sem timeout no cliente: apuração segura a conexão até a consolidação final
      }
    )
    return response.data
  } catch (error) {
    // Se não houve resposta HTTP (queda de conexão / timeout de rede no gateway)
    if (!error.response && error.code !== 'ERR_CANCELED') {
      try {
        const recoveredStatus = await getClosingStatus(comp)
        const recoveryError = new Error(
          `Falha de conexão com o servidor durante o fechamento. Status atual da competência: ${recoveredStatus.status}.`
        )
        recoveryError.isNetworkRecovery = true
        recoveryError.recoveredStatus = recoveredStatus
        throw recoveryError
      } catch (statusErr) {
        if (statusErr.isNetworkRecovery) throw statusErr
        // Se a consulta de status também falhou por rede, repassa o erro original
      }
    }
    throw error
  }
}

/**
 * Dispara o download imediato do comprovante oficial de fechamento contendo
 * o protocolo imutável, totais, itens calculados e impedimentos.
 * @param {object} closingData - Payload do FechamentoResponseDTO retornado pelo POST
 */
export function downloadClosingProof(closingData) {
  if (!closingData || !closingData.protocolo) {
    throw new Error('Dados de fechamento inválidos para emissão de comprovante.')
  }
  const comp = closingData.competencia || 'competencia'
  const protocolo = closingData.protocolo
  const filename = `comprovante-fechamento-${comp}-${protocolo}.json`
  const jsonContent = JSON.stringify(closingData, null, 2)
  if (typeof Blob === 'undefined' || typeof document === 'undefined') {
    return { filename, content: jsonContent }
  }
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return { filename, downloaded: true }
}

function getStorage() {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage
  }
  if (typeof globalThis !== 'undefined' && globalThis.sessionStorage) {
    return globalThis.sessionStorage
  }
  return null
}

/**
 * Salva com segurança o resultado do fechamento em sessionStorage com try/catch
 * para evitar que o estouro de cota (payloads com milhares de vendas) quebre a aplicação.
 * @param {object} closingData
 */
export function saveClosingToSession(closingData) {
  if (!closingData) return false
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem('comissionai.fechamento.ultimo', JSON.stringify(closingData))
    return true
  } catch (err) {
    console.warn('Não foi possível armazenar o fechamento em sessionStorage (cota excedida ou restrição).', err)
    return false
  }
}

/**
 * Recupera o último fechamento armazenado em sessionStorage (se disponível).
 */
export function getClosingFromSession() {
  const storage = getStorage()
  if (!storage) return null
  try {
    const raw = storage.getItem('comissionai.fechamento.ultimo')
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    return null
  }
}
