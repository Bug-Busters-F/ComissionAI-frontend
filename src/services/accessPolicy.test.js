import { describe, expect, it } from 'vitest'
import { canAccess, canEditStep, STEP_RESPONSIBILITIES } from './accessPolicy'
describe('preview role permissions', () => {
  it('assigns each stage to its planned owner and gives the administrator all four', () => {
    for (const step of STEP_RESPONSIBILITIES) {
      expect(canEditStep(step.role, step.key)).toBe(true)
      expect(canEditStep('ADMINISTRADOR', step.key)).toBe(true)
      expect(canEditStep('AUDITOR', step.key)).toBe(false)
    }
    expect(canEditStep('ANALISTA_NEGOCIOS', 'propostas')).toBe(false)
    expect(canEditStep('ANALISTA_CODIGO', 'simulacao')).toBe(false)
    expect(canEditStep('GERENTE_VENDAS', 'dados')).toBe(false)
    expect(canEditStep(undefined, 'dados')).toBe(false)
    expect(canEditStep('ADMINISTRADOR', 'invalid')).toBe(false)
  })
  it('allows the auditor to read data but not mutate or calculate', () => {
    expect(canAccess('AUDITOR', 'viewData')).toBe(true)
    expect(canAccess('AUDITOR', 'manageData')).toBe(false)
    expect(canAccess('AUDITOR', 'calculate')).toBe(false)
    expect(canAccess('AUDITOR', 'editCampaign')).toBe(false)
    expect(canAccess('AUDITOR', 'createCampaign')).toBe(false)
  })
  it('reserves data mutations for manager/admin and account management for admin', () => {
    for (const role of ['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO']) {
      expect(canAccess(role, 'viewData')).toBe(false)
      expect(canAccess(role, 'manageUsers')).toBe(false)
    }
    expect(canAccess('GERENTE_VENDAS', 'manageData')).toBe(true)
    expect(canAccess('GERENTE_VENDAS', 'manageUsers')).toBe(false)
    expect(canAccess('ADMINISTRADOR', 'manageUsers')).toBe(true)
    expect(canAccess('UNKNOWN', 'viewData')).toBe(false)
  })
})
