import api from './api'
import { normalizeAuditPage, positiveId, UUID_PATTERN } from './auditModel'

export function createAuditService(http = api) {
  const get = (url, params, signal) => http.get(url, { params, signal, timeout: 30000 })
  const detail = async (url, valid, signal) => {
    if (!valid) throw Object.assign(Error('Identificador inválido'), { code: 'AUDIT_CONTRACT' })
    const { data } = await get(url, undefined, signal)
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw Object.assign(Error('Registro inválido'), { code: 'AUDIT_CONTRACT' })
    return data
  }
  return {
    async events(params, { signal } = {}) {
      const page = normalizeAuditPage((await get('/auditoria', params, signal)).data)
      if (page.content.some(item => !UUID_PATTERN.test(item.id) || typeof item.sucesso !== 'boolean' || !Object.hasOwn(item, 'relacionamentos'))) throw Object.assign(Error('Contrato de auditoria indisponível'), { code: 'AUDIT_CONTRACT' })
      return page
    },
    async imports(params, { signal } = {}) {
      const page = normalizeAuditPage((await get('/imports', params, signal)).data)
      if (page.content.some(item => !positiveId(item.reportId) || !Number.isSafeInteger(item.totalInconsistencias))) throw Object.assign(Error('Contrato de histórico indisponível'), { code: 'AUDIT_CONTRACT' })
      return page
    },
    async event({ id }, { signal } = {}) {
      const data = await detail(`/auditoria/${encodeURIComponent(id)}`, UUID_PATTERN.test(id), signal)
      if (String(data.id).toLowerCase() !== id.toLowerCase() || typeof data.sucesso !== 'boolean' || !Object.hasOwn(data, 'relacionamentos')) throw Object.assign(Error('Evento divergente'), { code: 'AUDIT_CONTRACT' })
      return data
    },
    async batch({ id }, { signal } = {}) {
      const data = await detail(`/imports/lotes/${encodeURIComponent(id)}`, positiveId(id), signal)
      if (data.reportId !== Number(id) || !Number.isSafeInteger(data.totalInconsistencias)) throw Object.assign(Error('Lote divergente'), { code: 'AUDIT_CONTRACT' })
      return data
    },
    async validations({ id, ...params }, { signal } = {}) {
      if (!positiveId(id)) throw Object.assign(Error('Identificador inválido'), { code: 'AUDIT_CONTRACT' })
      return normalizeAuditPage((await get(`/imports/lotes/${id}/validacoes`, params, signal)).data)
    },
    async original({ id }, { signal } = {}) {
      if (!positiveId(id)) throw Object.assign(Error('Identificador inválido'), { code: 'AUDIT_CONTRACT' })
      const response = await http.get(`/imports/lotes/${id}/arquivo`, { signal, timeout: 30000, responseType: 'blob' })
      if (!(response.data instanceof Blob) || !response.data.size) throw Object.assign(Error('Arquivo não confirmado'), { code: 'AUDIT_CONTRACT' })
      return response.data
    }
  }
}
export const auditService = createAuditService()
