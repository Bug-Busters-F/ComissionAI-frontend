/**
 * Utilitários para formatação e parsing de valores monetários no formato brasileiro (pt-BR).
 */
export function parseCurrencyPtBr(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const str = String(value).trim()
  if (!str) return null

  // Remove caracteres que não sejam dígitos, vírgula, ponto ou sinal negativo
  const clean = str.replace(/[^\d.,-]/g, '')
  if (!clean) return null

  // Trata formato pt-BR (ex: "1.234,56" ou "-1.234,56")
  if (clean.includes(',')) {
    const semPontos = clean.replace(/\./g, '')
    const comPontoDecimal = semPontos.replace(',', '.')
    const parsed = parseFloat(comPontoDecimal)
    return Number.isFinite(parsed) ? parsed : null
  }

  // Trata formato já com ponto decimal (ex: "1234.56")
  const parsed = parseFloat(clean)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatCurrencyPtBr(value, includeSymbol = false) {
  const num = typeof value === 'number' ? value : parseCurrencyPtBr(value)
  if (num == null) return '—'

  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num)

  return includeSymbol ? `R$ ${formatted}` : formatted
}
