export const STEP_RESPONSIBILITIES = Object.freeze([
  { key: 'dados', number: 1, label: 'Proposta', role: 'ANALISTA_NEGOCIOS', owner: 'Analista de negócios' },
  { key: 'propostas', number: 2, label: 'Interpretação', role: 'ANALISTA_CODIGO', owner: 'Analista de código' },
  { key: 'simulacao', number: 3, label: 'Simulação', role: 'ANALISTA_NEGOCIOS', owner: 'Analista de negócios' },
  { key: 'conferencia', number: 4, label: 'Conferência', role: 'GERENTE_VENDAS', owner: 'Gerente' }
])
const validRoles = ['ADMINISTRADOR', 'ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO', 'GERENTE_VENDAS', 'AUDITOR']
export function canEditStep(role, step) {
  const responsibility = STEP_RESPONSIBILITIES.find(s => s.key === step)
  return Boolean(responsibility && (role === 'ADMINISTRADOR' || responsibility.role === role))
}
export function canAccess(role, action, permissions = null) {
  if (!validRoles.includes(role)) return false
  if (role === 'ADMINISTRADOR') return permissions === null || permissions.includes('ACESSO_COMPLETO')
  const matrix = {
    viewCampaigns: validRoles, viewWorkflow: validRoles,
    createCampaign: ['ANALISTA_NEGOCIOS'],
    editCampaign: ['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO', 'GERENTE_VENDAS'],
    saveCampaign: ['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO'],
    removeCampaign: ['ANALISTA_NEGOCIOS'],
    viewData: ['GERENTE_VENDAS', 'AUDITOR'],
    manageData: ['GERENTE_VENDAS'], calculate: ['GERENTE_VENDAS'],
    manageUsers: []
  }
  const permission = { createCampaign: 'EDITAR_CAMPANHAS', removeCampaign: 'EDITAR_CAMPANHAS', manageData: 'IMPORTAR_BASES', calculate: 'CALCULAR_COMPETENCIA' }[action]
  return matrix[action]?.includes(role) === true && (!permission || permissions === null || permissions.includes(permission))
}
export function stepAccessMessage(role, step) {
  const owner = STEP_RESPONSIBILITIES.find(s => s.key === step)?.owner || 'Responsável da etapa'
  return role === 'AUDITOR' ? 'Seu perfil permite somente consulta. Nenhuma alteração pode ser feita.' : `Esta etapa é de responsabilidade de ${owner.toLocaleLowerCase('pt-BR')}. Você pode consultar os dados, mas não alterá-los.`
}
