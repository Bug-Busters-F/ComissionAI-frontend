import { canEditStep, STEP_RESPONSIBILITIES } from './accessPolicy'
const clone = value => JSON.parse(JSON.stringify(value))
const KEY = 'comissionai.workflow.preview.v1'
export function newWorkflowPreview() {
  return { step: 1, reached: 1, status: 'EDITING', reason: '', revision: 1, codeApprovedRevision: null, simulationRevision: null, history: [],
    campaign: { title: 'Incentivo de julho · exemplo', description: 'Comissão de 3,5% para vendedores da marca PRETO na loja 16, de 1 a 31 de julho de 2025.', rate: '3,5', budget: '5000' } }
}
export function previewCanAct(role, state) {
  return state.status !== 'PUBLISHED' && canEditStep(role, STEP_RESPONSIBILITIES[state.step - 1]?.key)
}
export function transitionPreview(state, { action, role, name, reason = '' }) {
  if (!previewCanAct(role, state)) throw Error('Seu perfil não pode realizar esta ação na etapa atual.')
  const next = clone(state)
  if (action === 'return') {
    if (![2, 4].includes(state.step)) throw Error('Esta etapa não permite devolução.')
    if (!reason.trim()) throw Error('Informe o motivo da devolução.')
    next.step = state.step === 2 ? 1 : 3
    next.reason = reason.trim(); next.status = 'RETURNED'
    next.simulationRevision = null
    if (state.step === 2) next.codeApprovedRevision = null
  } else if (action === 'advance') {
    if (!next.campaign.title.trim() || !next.campaign.description.trim()) throw Error('Preencha o título e a descrição da proposta.')
    const rate = Number(String(next.campaign.rate).replace(',', '.'))
    if (!Number.isFinite(rate) || rate <= 0 || rate > 100) throw Error('Informe uma taxa maior que zero e até 100%.')
    if (state.step === 1) { next.step = 2; next.status = 'WAITING_CODE' }
    if (state.step === 2) { next.codeApprovedRevision = next.revision; next.step = 3; next.status = 'WAITING_SIMULATION' }
    if (state.step === 3) {
      if (next.codeApprovedRevision !== next.revision || next.simulationRevision !== next.revision) throw Error('É necessária uma conferência do código e uma simulação atuais nesta prévia.')
      next.step = 4; next.status = 'WAITING_MANAGER'
    }
    if (state.step === 4) {
      if (next.codeApprovedRevision !== next.revision || next.simulationRevision !== next.revision) throw Error('Os resultados ficaram desatualizados. Retome a conferência e a simulação.')
      next.status = 'PUBLISHED'
    }
    next.reason = ''
  } else throw Error('Ação não disponível.')
  next.reached = Math.max(next.reached, next.step)
  next.history.push({ action, from: state.step, to: next.step, role, name, reason: next.reason, at: new Date().toISOString() })
  return next
}
export function editPreview(state, field, value, role) {
  if (!previewCanAct(role, state) || !((state.step === 1 && ['title', 'description'].includes(field)) || (state.step === 2 && field === 'rate') || (state.step === 3 && field === 'budget'))) throw Error('Este campo não está disponível para edição nesta etapa.')
  const next = clone(state)
  if (next.campaign[field] === value) return next
  next.campaign[field] = value
  if (field !== 'budget') { next.revision++; next.codeApprovedRevision = null }
  next.simulationRevision = null
  return next
}
export function simulatePreview(state, role) {
  if (!previewCanAct(role, state) || state.step !== 3) throw Error('Somente o responsável pela simulação pode executar esta ação.')
  if (state.codeApprovedRevision !== state.revision) throw Error('O código precisa de uma nova conferência antes da simulação.')
  const budget = Number(String(state.campaign.budget).replace(',', '.'))
  if (!Number.isFinite(budget) || budget <= 0) throw Error('Informe um orçamento maior que zero.')
  return { ...clone(state), simulationRevision: state.revision }
}
export function restoreWorkflowPreview(storage) {
  try {
    const data = JSON.parse(storage?.getItem(KEY) || 'null')
    if (data && [1, 2, 3, 4].includes(data.step) && Number.isInteger(data.reached) && data.reached >= data.step && data.reached <= 4 && ['EDITING','RETURNED','WAITING_CODE','WAITING_SIMULATION','WAITING_MANAGER','PUBLISHED'].includes(data.status) && typeof data.campaign?.title === 'string' && typeof data.campaign.description === 'string' && Array.isArray(data.history)) return data
  } catch {}
  return newWorkflowPreview()
}
export function persistWorkflowPreview(storage, state) { try { storage?.setItem(KEY, JSON.stringify(state)) } catch {} }
