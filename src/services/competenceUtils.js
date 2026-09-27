export const MONTH_NAMES = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
}

export function normalizeCompetence(value) {
  const text = String(value || '').trim()
  if (/^\d{4}-\d{2}$/.test(text)) {
    const month = Number(text.slice(5, 7))
    return month >= 1 && month <= 12 ? text : ''
  }

  const displayMatch = text.match(/^(\d{1,2})\/(\d{4})$/)
  if (displayMatch) {
    const month = Number(displayMatch[1])
    return month >= 1 && month <= 12 ? `${displayMatch[2]}-${String(month).padStart(2, '0')}` : ''
  }

  return ''
}

export function formatCompetenceCode(value) {
  const normalized = normalizeCompetence(value)
  if (!normalized) return String(value || '')
  const [year, month] = normalized.split('-')
  return `${month}/${year}`
}

export function formatCompetenceLabel(value) {
  const normalized = normalizeCompetence(value)
  if (!normalized) return 'Competência'
  const [year, month] = normalized.split('-')
  return `${MONTH_NAMES[month] || month} ${year}`
}

export function getCompetenceDateRange(value) {
  const normalized = normalizeCompetence(value)
  if (!normalized) return { dataInicio: '', dataFim: '' }

  const [year, month] = normalized.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    dataInicio: `${normalized}-01`,
    dataFim: `${normalized}-${String(lastDay).padStart(2, '0')}`
  }
}

export function groupSalesByCompetence(sales = []) {
  const grouped = new Map()

  for (const sale of sales) {
    const key = typeof sale?.saleDate === 'string' ? sale.saleDate.slice(0, 7) : ''
    const normalized = normalizeCompetence(key)
    if (!normalized) continue

    const current = grouped.get(normalized) || { competence: normalized, salesCount: 0 }
    current.salesCount += 1
    grouped.set(normalized, current)
  }

  return [...grouped.values()].sort((left, right) => right.competence.localeCompare(left.competence))
}
