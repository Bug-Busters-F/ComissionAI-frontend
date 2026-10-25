// Bind explanatory artifacts to the values they describe, independently of UI revisions.
export function ruleArtifactSignature(proposal, campaign) {
  const m = proposal.metadadosRecebidos || {}
  return JSON.stringify([proposal.campos, proposal.textoOrigem, campaign.dataInicio, campaign.dataFim,
    m.operacaoBase, m.bonusPercentual ?? null, m.bonusValorFixo ?? null])
}
export function ruleArtifactsCurrent(proposal, campaign) {
  const m = proposal.metadadosRecebidos || {}
  return !m.artefatosLegados && !proposal.artefatosDesatualizados && m.validacaoPendente === false &&
    (!m.assinaturaArtefatos || m.assinaturaArtefatos === ruleArtifactSignature(proposal, campaign))
}
export const BACKEND_EDIT_FIELDS = Object.freeze({ taxaPercentual: 'taxa', minimoInclusivo: 'condicaoValor.minInclusivo',
  maximoInclusivo: 'condicaoValor.maxInclusivo', valorMinimo: 'condicaoValor.valorMinimo', valorMaximo: 'condicaoValor.valorMaximo',
  codMarca: 'filtros.codMarca', descrMarca: 'filtros.descrMarca', codCargo: 'filtros.codCargo', descriCargo: 'filtros.descriCargo',
  codLoja: 'filtros.codLoja', canal: 'filtros.canal', matricula: 'filtros.matricula' })
