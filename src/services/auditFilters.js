import { AUDIT_ACTIONS, AUDIT_PROFILES, IMPORT_TYPES, IMPORT_STATUSES, IMPORT_ORIGINS, positiveId } from './auditModel'

export const auditFilterDefaults = kind => kind === 'events'
  ? { busca: '', usuario: '', perfilUsuario: '', tipoAcao: '', campanhaId: '', competencia: '', dataInicio: '', dataFim: '', sucesso: '' }
  : { busca: '', usuario: '', tipoBase: '', status: '', competencia: '', origemLote: '', dataInicio: '', dataFim: '', somenteComInconsistencias: '' }
const scalar = value => Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
function day(value, end) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Informe uma data válida.')
  const date = new Date(`${value}T${end ? '23:59:59.999' : '00:00:00.000'}`)
  if (!Number.isFinite(date.getTime()) || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` !== value) throw Error('Informe uma data válida.')
  return date.toISOString()
}
export function auditFilterParams(kind, filters, page = 0, size = 20) {
  if (!Number.isSafeInteger(page) || page < 0 || ![20, 50, 100].includes(size)) throw Error('Informe uma página e quantidade de registros válidas.')
  const params = { page, size }
  for (const key of Object.keys(auditFilterDefaults(kind))) {
    const value = scalar(filters[key]).trim()
    if (!value) continue
    if (value.length > 250) throw Error('Limite cada filtro a 250 caracteres.')
    const options = { tipoAcao: AUDIT_ACTIONS, perfilUsuario: AUDIT_PROFILES, tipoBase: IMPORT_TYPES, status: IMPORT_STATUSES, origemLote: IMPORT_ORIGINS }[key]
    if (options && !Object.hasOwn(options, value)) throw Error('Selecione uma opção válida nos filtros.')
    if (key === 'campanhaId' && !positiveId(value)) throw Error('Informe um número válido de campanha.')
    if (key === 'competencia' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw Error('Informe uma competência válida.')
    if (['sucesso', 'somenteComInconsistencias'].includes(key)) {
      if (!['true', 'false'].includes(value)) throw Error('Selecione um resultado válido.')
      params[key] = value === 'true'
    } else if (key === 'dataInicio' || key === 'dataFim') params[key] = day(value, key === 'dataFim')
    else params[key] = value
  }
  if (params.dataInicio && params.dataFim && Date.parse(params.dataInicio) > Date.parse(params.dataFim)) throw Error('A data inicial não pode ser posterior à data final.')
  if (kind === 'events') params.sort = 'dataHora,desc'
  return params
}
export function readAuditQuery(kind, query, prefix) {
  const filters = auditFilterDefaults(kind)
  for (const key of Object.keys(filters)) filters[key] = scalar(query[prefix + key])
  const page = query[prefix + 'page'] == null ? 0 : Number(scalar(query[prefix + 'page']))
  const size = query[prefix + 'size'] == null ? 20 : Number(scalar(query[prefix + 'size']))
  try { return { filters, params: auditFilterParams(kind, filters, page, size), error: '' } }
  catch (error) { return { filters, params: null, error: error.message } }
}
export function writeAuditQuery(kind, query, prefix, filters, page = 0, size = 20, selected = null) {
  auditFilterParams(kind, filters, page, size)
  const result = Object.fromEntries(Object.entries(query).filter(([key]) => !key.startsWith(prefix)))
  for (const key of Object.keys(auditFilterDefaults(kind))) if (scalar(filters[key]).trim()) result[prefix + key] = scalar(filters[key]).trim()
  if (page) result[prefix + 'page'] = String(page)
  if (size !== 20) result[prefix + 'size'] = String(size)
  if (selected) result[prefix + 'detalhe'] = String(selected)
  return result
}
