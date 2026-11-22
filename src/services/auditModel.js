import { userFacingText } from './userFacingText'

export const AUDIT_ACTIONS = {
  CRIACAO_CAMPANHA: 'Criação de campanha', EDICAO_CAMPANHA: 'Edição de campanha', PUBLICACAO_CAMPANHA: 'Publicação de campanha', CANCELAMENTO_CAMPANHA: 'Cancelamento de campanha',
  AVANCO_ESTEIRA: 'Avanço de etapa', DEVOLUCAO_ESTEIRA: 'Devolução de etapa', GERACAO_PROGRAMA_PYTHON: 'Geração de código', APROVACAO_PROGRAMA_PYTHON: 'Aprovação de programa', REJEICAO_PROGRAMA_PYTHON: 'Devolução de programa',
  APROVACAO_CODIGO_CAMPANHA: 'Aprovação de código', REJEICAO_CODIGO_CAMPANHA: 'Devolução de código', ACEITE_PENDENCIA: 'Aceite de pendência', REJEICAO_PENDENCIA: 'Rejeição de pendência', REVOGACAO_ACEITE_PENDENCIA: 'Revogação de aceite',
  EXECUCAO_SIMULACAO: 'Execução de simulação', ACEITE_SIMULACAO: 'Aceite de simulação', REVOGACAO_SIMULACAO: 'Revogação de simulação', SOLICITACAO_CALCULO: 'Solicitação de cálculo', CALCULO_COMISSAO: 'Cálculo de comissões', CALCULO_DEFINITIVO_CAMPANHA: 'Apuração de campanha',
  FECHAMENTO_COMPETENCIA: 'Fechamento de competência', EXPORTACAO_RELATORIO: 'Exportação de relatório', PREPARACAO_BASE: 'Preparação de base', IMPORTACAO_BASE: 'Envio de base', ANEXACAO_BASE: 'Associação de base', DESANEXACAO_BASE: 'Desassociação de base', EXCLUSAO_BASE: 'Exclusão de base', ACAO_OPERACIONAL: 'Atividade operacional'
}
export const AUDIT_PROFILES = { ADMINISTRADOR: 'Administrador', ANALISTA_NEGOCIOS: 'Analista de negócios', ANALISTA_CODIGO: 'Analista de código', GERENTE_VENDAS: 'Gerente de vendas', AUDITOR: 'Auditor' }
export const IMPORT_TYPES = { HR: 'RH', SALES: 'Vendas', COMISSIONS: 'Taxas de comissão' }
export const IMPORT_STATUSES = { PENDENTE: 'Aguardando processamento', PROCESSANDO: 'Em processamento', CONCLUIDO: 'Concluído', FALHOU: 'Falhou', EXCLUIDO: 'Excluído' }
export const SEVERITIES = { IMPEDITIVO: 'Impeditiva', IMPEDIMENTO: 'Impeditiva', ADVERTENCIA: 'Advertência', AVISO: 'Aviso' }
export const IMPORT_ORIGINS = { IMPORTACAO_DIRETA: 'Envio em Dados', PREPARACAO_CAMPANHA: 'Preparação da campanha' }
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const positiveId = value => /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0
export const auditLabel = (map, value) => Object.hasOwn(map, value) ? map[value] : (value ? 'Não informado nesta versão' : 'Não informado')
export const auditDate = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Não informado'
export const auditMonth = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? `${value.slice(5)}/${value.slice(0, 4)}` : 'Não informada'
export const auditCount = value => Number.isSafeInteger(value) && value >= 0 ? new Intl.NumberFormat('pt-BR').format(value) : 'Não informado'
export const statusTone = value => ['FALHOU', 'IMPEDITIVO', 'IMPEDIMENTO'].includes(value) ? 'danger' : ['ADVERTENCIA', 'AVISO', 'PROCESSANDO', 'PENDENTE'].includes(value) ? 'warning' : value === 'CONCLUIDO' ? 'success' : 'neutral'

export function auditError(error, detail = false) {
  const status = error?.response?.status
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) return 'Seu perfil não permite consultar estes registros.'
  if (status === 404) return detail ? 'Registro não encontrado ou consulta ainda indisponível. Volte à lista e tente novamente.' : 'Esta consulta ainda não está disponível. Tente novamente após a atualização do sistema.'
  if (error?.code === 'AUDIT_CONTRACT') return 'Não foi possível confirmar os registros recebidos. Tente novamente.'
  return 'Não foi possível carregar os registros. Tente novamente.'
}

export function normalizeAuditPage(raw) {
  const page = raw?.page || raw
  if (!Array.isArray(raw?.content) || ![page?.number, page?.size, page?.totalElements, page?.totalPages].every(Number.isSafeInteger) ||
      page.number < 0 || page.size <= 0 || page.totalElements < 0 || page.totalPages < 0 || raw.content.length > page.size ||
      raw.content.some(item => !item || typeof item !== 'object')) {
    throw Object.assign(Error('Resposta paginada inválida'), { code: 'AUDIT_CONTRACT' })
  }
  return { content: raw.content, number: page.number, size: page.size, totalElements: page.totalElements, totalPages: page.totalPages }
}

export function visibleLogProfiles(role) {
  const codes = role === 'ADMINISTRADOR' ? Object.keys(AUDIT_PROFILES) : role === 'GERENTE_VENDAS' ? ['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO'] : role === 'AUDITOR' ? ['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO', 'GERENTE_VENDAS'] : []
  return Object.fromEntries(codes.map(code => [code, AUDIT_PROFILES[code]]))
}

const snapshotLabels = { titulo: 'Título', descricao: 'Descrição', textoOriginal: 'Texto da campanha', dataInicio: 'Início', dataFim: 'Fim', taxa: 'Taxa', taxaFinal: 'Taxa final', codMarca: 'Marca', descrMarca: 'Nome da marca', codCargo: 'Cargo', descriCargo: 'Nome do cargo', codLoja: 'Loja', matricula: 'Matrícula', canal: 'Canal', orcamento: 'Orçamento', estado: 'Situação', status: 'Situação', motivo: 'Motivo', competencia: 'Competência', totalLinhas: 'Total de linhas', linhasValidas: 'Linhas válidas', nomeArquivo: 'Arquivo', codigoFonte: 'Código registrado', completa: 'Regra completa', regras: 'Regras', filtros: 'Público', condicaoValor: 'Condição de valor', valorMinimo: 'Valor mínimo', valorMaximo: 'Valor máximo', minInclusivo: 'Mínimo inclusivo', maxInclusivo: 'Máximo inclusivo' }
export function auditSnapshotEntries(raw) {
  if (!raw) return []
  let value
  try { value = typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return [{ label: 'Informação registrada', value: userFacingText(String(raw)) }] }
  const rows = []
  function visit(item, path, depth = 0) {
    if (rows.length >= 100 || depth > 5) return
    if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (/senha|password|token|secret|authorization|api.?key|chave|stacktrace|sql|ipOrigem|userAgent/i.test(key)) continue
        const label = snapshotLabels[key] || key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
        visit(child, path ? `${path} · ${label}` : label, depth + 1)
      }
    } else rows.push({ label: path || 'Valor', value: item == null ? 'Não informado' : item === true ? 'Sim' : item === false ? 'Não' : userFacingText(String(item)) })
  }
  visit(value, '')
  return rows
}
