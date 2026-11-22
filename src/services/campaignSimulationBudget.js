import { parseDecimalToMinor } from './campaignProposalValidation'

// The accepted baseline is the projected total commission at 100% volume.
// Prefer the budget recorded with this result over a subsequently edited field.
export function simulationBudgetStatus(result, fallbackBudget = null, scenario = '100') {
  const row = result?.['cenario' + scenario] || result?.scenarios?.find(s => String(s.key) === String(scenario))
  const enrollment = row?.enquadramento || row || {}
  const budget = result?.orcamentoCampanha ?? result?.analise?.orcamento ?? enrollment.orcamentoTeto ?? fallbackBudget
  const cost = row?.comissaoProjetada ?? row?.custoTotalProjetado ?? row?.withProposal ?? (scenario === '100' ? result?.totals?.projetado?.comissaoProposta : null)
  const budgetMinor = budget == null ? NaN : parseDecimalToMinor(String(budget), 2)
  const costMinor = cost == null ? NaN : parseDecimalToMinor(String(cost), 2)
  const comparable = Number.isFinite(budgetMinor) && budgetMinor > 0 && Number.isFinite(costMinor)
  const reportedExcess = Number(enrollment.excedenteOrcamento)
  const exceeded = enrollment.dentroDoOrcamento === false || enrollment.statusEnquadramento === 'ACIMA_DO_TETO' || reportedExcess > 0 || (comparable && costMinor > budgetMinor)
  return { exceeded, known: comparable || typeof enrollment.dentroDoOrcamento === 'boolean', budget: Number.isFinite(budgetMinor) ? budgetMinor / 100 : null, cost: Number.isFinite(costMinor) ? costMinor / 100 : null, excess: comparable ? Math.max(0, (costMinor - budgetMinor) / 100) : reportedExcess > 0 ? reportedExcess : null }
}
