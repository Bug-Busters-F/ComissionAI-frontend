import { describe, expect, it } from 'vitest'
import {
  formatCompetenceCode,
  formatCompetenceLabel,
  getCompetenceDateRange,
  groupSalesByCompetence,
  normalizeCompetence
} from './competenceUtils'

describe('competenceUtils', () => {
  it('normalizes and formats competence codes', () => {
    expect(normalizeCompetence('10/2025')).toBe('2025-10')
    expect(normalizeCompetence('2025-13')).toBe('')
    expect(normalizeCompetence('00/2025')).toBe('')
    expect(formatCompetenceCode('2025-10')).toBe('10/2025')
    expect(formatCompetenceLabel('2025-10')).toBe('Outubro 2025')
  })

  it('calculates the first and last date of a competence', () => {
    expect(getCompetenceDateRange('2025-02')).toEqual({ dataInicio: '2025-02-01', dataFim: '2025-02-28' })
    expect(getCompetenceDateRange('2024-02').dataFim).toBe('2024-02-29')
  })

  it('groups persisted sales by month and ignores invalid dates', () => {
    expect(groupSalesByCompetence([
      { id: '1', saleDate: '2025-10-02' },
      { id: '2', saleDate: '2025-10-20' },
      { id: '3', saleDate: '2025-09-30' },
      { id: '4', saleDate: 'not-a-date' }
    ])).toEqual([
      { competence: '2025-10', salesCount: 2 },
      { competence: '2025-09', salesCount: 1 }
    ])
  })
})
