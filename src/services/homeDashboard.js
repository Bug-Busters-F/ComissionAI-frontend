import api from './api'
import { normalizeCampaignRecord } from './campaignMappers'
import { USER_ROLES } from './accountModel'

const groups = {
  competencias: ['total', 'abertas', 'processando', 'fechadas'],
  campanhas: ['total', 'rascunhos', 'ativas', 'aguardandoGerente'],
  pendencias: ['total', 'orcamentoNaoConfirmado', 'revisaoCodigo', 'lotesComImpedimento'],
  alertas: ['lotesComLinhasImpeditivas', 'execucoesFalhas', 'fechamentosFalhos', 'fechamentosEmProcessamento']
}

export function normalizeIndicators(raw) {
  if (!raw || !USER_ROLES.some(role => role.value === raw.perfil) ||
      !Number.isFinite(Date.parse(raw.atualizadoEm)) || !Array.isArray(raw.aguardandoAcao)) {
    throw Error('Não foi possível confirmar os indicadores recebidos. Tente novamente.')
  }
  const result = { perfil: raw.perfil, atualizadoEm: raw.atualizadoEm, aguardandoAcao: raw.aguardandoAcao.filter(item => item && typeof item.tipo === 'string') }
  for (const [group, fields] of Object.entries(groups)) {
    result[group] = {}
    for (const field of fields) {
      const count = raw[group]?.[field]
      if (!Number.isSafeInteger(count) || count < 0) throw Error('Não foi possível confirmar os indicadores recebidos. Tente novamente.')
      result[group][field] = count
    }
  }
  return result
}

export const homeDashboardService = {
  async indicators({ signal } = {}) {
    const { data } = await api.get('/indicadores', { signal, timeout: 30000 })
    return normalizeIndicators(data)
  },
  async campaigns({ signal } = {}) {
    const { data } = await api.get('/campanhas', { signal, timeout: 30000 })
    if (!Array.isArray(data) || data.some(item => !Number.isSafeInteger(item?.id) || item.id <= 0)) {
      throw Error('Não foi possível confirmar as campanhas recebidas. Tente novamente.')
    }
    // A listagem já vem ordenada pela criação, da mais recente para a mais antiga.
    return data.slice(0, 3).map(normalizeCampaignRecord)
  }
}

// href/metodo da API descrevem operações. A Home oferece apenas navegação conhecida.
export function dashboardActions(items, can) {
  const definitions = {
    ORCAMENTO_PENDENTE: { permission: 'createCampaign', title: 'Orçamento a confirmar', step: 'dados' },
    REVISAO_CODIGO_PENDENTE: { permission: 'approveCode', title: 'Revisar código', step: 'propostas' },
    APROVACAO_GERENCIAL_PENDENTE: { permission: 'activateCampaign', title: 'Conferir campanha', step: 'conferencia' },
    LOTE_COM_IMPEDIMENTO: { permission: 'manageData', title: 'Revisar dados da campanha' },
    FECHAMENTO_FALHOU: { permission: 'calculate', title: 'Consultar fechamento', competence: true },
    CALCULO_FALHOU: { permission: 'calculate', title: 'Consultar cálculo', competence: true }
  }
  return items.flatMap((item, index) => {
    const definition = Object.hasOwn(definitions, item.tipo) ? definitions[item.tipo] : null
    if (!definition || !can(definition.permission)) return []
    let to
    if (definition.competence) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(item.competencia)) return []
      to = { name: 'dados-calculo', params: { competencia: item.competencia } }
    } else {
      if (!Number.isSafeInteger(item.campanhaId) || item.campanhaId <= 0) return []
      to = definition.step
        ? { name: 'campanha-editar', params: { id: item.campanhaId }, query: { etapa: definition.step } }
        : { name: 'campanha-detalhes', params: { id: item.campanhaId } }
    }
    return [{ key: `${item.tipo}-${index}`, title: definition.title, campaignId: item.campanhaId, competence: item.competencia, to }]
  })
}

export function dashboardError(error, subject) {
  if (error?.response?.status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (error?.response?.status === 403) return `Seu acesso não permite consultar ${subject}.`
  return `Não foi possível carregar ${subject}. Tente novamente.`
}
