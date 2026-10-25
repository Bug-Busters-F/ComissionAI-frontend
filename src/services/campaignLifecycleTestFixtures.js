import { createCampaignProposal, createCampaignProposalForm, createPending } from './campaignProposalModel'
import { campaignToDraftRequest } from './campaignProposalPersistence'
export function campaignFixture() {
  return { ...createCampaignProposalForm(), titulo: 'Campanha', textoOriginal: 'Texto com três regras', dataInicio: '2026-10-01', dataFim: '2026-10-31', propostas: [
    createCampaignProposal({ clientId: 'one', textoOrigem: 'Loja física abaixo de mil', campos: { canal: 'LOJA_FISICA', taxaPercentual: '3,5', valorMaximo: '1000', maximoInclusivo: false }, metadadosRecebidos: { validacaoPendente: false, explicacao: 'Explicação atual' } }),
    createCampaignProposal({ clientId: 'two', textoOrigem: 'Acima de mil', campos: { canal: 'LOJA_FISICA', taxaPercentual: '5', valorMinimo: '1000', minimoInclusivo: true, matricula: '001234' }, camposManuais: ['taxaPercentual'], metadadosRecebidos: { validacaoPendente: false, operacaoBase: { tipoOperacao: 'SOMAR', valorAjuste: '0.02' }, bonusValorFixo: '50.00' } }),
    createCampaignProposal({ clientId: 'three', campos: { canal: 'BALCAO', taxaPercentual: '' }, metadadosRecebidos: { validacaoPendente: true }, pendenciasRemotas: [createPending({ codigo: 'SEMANTICA', mensagem: 'Falta informar taxa.', clientId: 'three' })] })
  ] }
}
export function savedResponse(campaign, id = 42) {
  const payload = campaignToDraftRequest(campaign)
  return { ...payload, id, estado: 'DRAFT', versaoProposta: 1, ultimaEtapa: 1, etapaMaisAvancada: 1, dataInicio: payload.dataInicio || '2026-10-22', dataFim: payload.dataFim || '2026-11-21', regras: payload.regras.map((r, index) => ({ ...r, id: index + 101, pendencias: r.pendencias.join('; ') })) }
}
