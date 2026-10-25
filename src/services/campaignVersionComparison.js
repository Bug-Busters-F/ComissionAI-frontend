import { campaignToDraftRequest, persistedCampaignToProposal } from './campaignProposalPersistence'

const labels = { titulo: 'Título', textoOriginal: 'Descrição', dataInicio: 'Início', dataFim: 'Fim', nome: 'Nome', trechoOrigem: 'Texto da regra', codMarca: 'Código da marca', descrMarca: 'Marca', codCargo: 'Código do cargo', descriCargo: 'Cargo', codLoja: 'Loja', canal: 'Canal', matricula: 'Matrícula', taxa: 'Taxa final', valorMinimo: 'Valor mínimo', minInclusivo: 'Mínimo inclusivo', valorMaximo: 'Valor máximo', maxInclusivo: 'Máximo inclusivo', tipoOperacao: 'Operação', valorAjuste: 'Ajuste', bonusPercentual: 'Bônus percentual', bonusValorFixo: 'Bônus fixo' }
export function versionToCampaign(version) {
  return persistedCampaignToProposal({ ...version, id: version.campanhaId, estado: 'ATIVA', regras: version.regras.map((r) => ({ ...r, dataInicio: version.dataInicio, dataFim: version.dataFim })) })
}
const numeric = new Set(['codMarca', 'codCargo', 'codLoja', 'taxa', 'valorMinimo', 'valorMaximo', 'valorAjuste', 'bonusPercentual', 'bonusValorFixo'])
function normalized(field, value) { return value == null || value === '' ? null : numeric.has(field) ? Number(value) : value }
function differences(before, after, fields) {
  return fields.filter((field) => normalized(field, before?.[field]) !== normalized(field, after?.[field]))
    .map((field) => ({ field, label: labels[field], before: before?.[field] ?? null, after: after?.[field] ?? null }))
}
export function compareCampaignVersion(version, campaign) {
  if (!version) return null
  const next = campaignToDraftRequest(campaign)
  const before = new Map(version.regras.map((r) => [r.blocoId || r.identificadorLogico || `persisted-${r.id}`, r]))
  const after = new Map(next.regras.map((r) => [r.blocoId, r]))
  return {
    fields: differences(version, next, ['titulo', 'textoOriginal', 'dataInicio', 'dataFim']),
    rules: [...new Set([...before.keys(), ...after.keys()])].map((id) => ({ id,
      label: after.get(id)?.nome || before.get(id)?.nome || 'Regra',
      status: !before.has(id) ? 'Adicionada' : !after.has(id) ? 'Removida' : 'Alterada',
      fields: differences(before.get(id), after.get(id), Object.keys(labels).filter((f) => !['titulo', 'textoOriginal', 'dataInicio', 'dataFim'].includes(f)))
    })).filter((r) => r.fields.length || r.status !== 'Alterada')
  }
}
export function displayVersionValue(field, value) {
  if (value == null || value === '') return 'Sem valor'
  if (field === 'tipoOperacao') return ({ DEFINIR_TAXA: 'Percentual definido', ACRESCIMO_PONTOS: 'Acréscimo de pontos percentuais', DESCONTO_PONTOS: 'Desconto de pontos percentuais', MULTIPLICADOR_BASE: 'Multiplicação da taxa contratual', DIVISOR_BASE: 'Divisão da taxa contratual' })[value] || String(value)
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (['taxa', 'bonusPercentual'].includes(field)) return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 4 }).format(Number(value))
  if (['valorMinimo', 'valorMaximo', 'bonusValorFixo'].includes(field)) return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))
  return String(value)
}
