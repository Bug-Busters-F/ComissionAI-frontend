import { normalizeCompetence } from './competenceUtils'

export const CALCULATION_CACHE_PREFIX = 'comissionai.calculation.'

function getStorage() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  return window.sessionStorage
}

function cacheKey(competencia) {
  const normalized = normalizeCompetence(competencia)
  return normalized ? `${CALCULATION_CACHE_PREFIX}${normalized}` : ''
}

export function readCalculationCache(competencia) {
  const storage = getStorage()
  const key = cacheKey(competencia)
  if (!storage || !key) return null

  try {
    const raw = storage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached || cached.competencia !== normalizeCompetence(competencia) || !cached.resultado) return null
    return cached
  } catch {
    return null
  }
}

export function saveCalculationCache({ competencia, tipoOperacao, resultado, recebidoEm = new Date().toISOString() }) {
  const storage = getStorage()
  const normalized = normalizeCompetence(competencia)
  const key = cacheKey(normalized)
  if (!storage || !key || !resultado) return false

  const payload = {
    competencia: normalized,
    tipoOperacao: tipoOperacao === 'RECALCULO' ? 'RECALCULO' : 'CALCULO',
    recebidoEm,
    resultado
  }

  try {
    storage.setItem(key, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function invalidateCalculationCache(competencias = null) {
  const storage = getStorage()
  if (!storage) return 0

  const normalizedCompetences = Array.isArray(competencias)
    ? [...new Set(competencias.map(normalizeCompetence).filter(Boolean))]
    : null

  try {
    if (normalizedCompetences === null) {
      const keysToRemove = []
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index)
        if (key?.startsWith(CALCULATION_CACHE_PREFIX)) keysToRemove.push(key)
      }
      keysToRemove.forEach((key) => storage.removeItem(key))
      return keysToRemove.length
    }

    let removed = 0
    normalizedCompetences.forEach((competencia) => {
      const key = cacheKey(competencia)
      if (storage.getItem(key) !== null) removed += 1
      storage.removeItem(key)
    })
    return removed
  } catch {
    return 0
  }
}

export function clearCalculationCache() {
  return invalidateCalculationCache()
}
