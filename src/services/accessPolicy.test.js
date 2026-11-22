import { describe, expect, it } from 'vitest'
import { canAccess, canEditStep, canParticipateStep, STEP_RESPONSIBILITIES } from './accessPolicy'
describe('preview role permissions', () => {
  it('assigns each stage to its planned owner and gives the administrator all four', () => {
    for (const step of STEP_RESPONSIBILITIES) {
      expect(canEditStep(step.role, step.key)).toBe(true)
      expect(canEditStep('ADMINISTRADOR', step.key)).toBe(true)
      expect(canEditStep('AUDITOR', step.key)).toBe(false)
    }
    expect(canEditStep('ANALISTA_NEGOCIOS', 'propostas')).toBe(true)
    expect(canEditStep('ANALISTA_CODIGO', 'propostas')).toBe(false)
    expect(canParticipateStep('ANALISTA_CODIGO', 'propostas')).toBe(true)
    expect(canAccess('ANALISTA_CODIGO', 'saveCampaign')).toBe(false)
    expect(canAccess('ANALISTA_CODIGO', 'editCampaign')).toBe(true)
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
  it('enforces segregation of duties (SoD) for stage 4 governance', () => {
    expect(canAccess('ANALISTA_CODIGO', 'approveCode')).toBe(true)
    expect(canAccess('ADMINISTRADOR', 'approveCode')).toBe(true)
    expect(canAccess('ANALISTA_NEGOCIOS', 'approveCode')).toBe(false)
    expect(canAccess('GERENTE_VENDAS', 'approveCode')).toBe(false)
    expect(canAccess('AUDITOR', 'approveCode')).toBe(false)

    expect(canAccess('GERENTE_VENDAS', 'returnProposal')).toBe(true)
    expect(canAccess('ADMINISTRADOR', 'returnProposal')).toBe(true)
    expect(canAccess('ANALISTA_CODIGO', 'returnProposal')).toBe(false)
    expect(canAccess('ANALISTA_NEGOCIOS', 'returnProposal')).toBe(false)
    expect(canAccess('AUDITOR', 'returnProposal')).toBe(false)

    expect(canAccess('GERENTE_VENDAS', 'activateCampaign')).toBe(true)
    expect(canAccess('ADMINISTRADOR', 'activateCampaign')).toBe(true)
    expect(canAccess('ANALISTA_CODIGO', 'activateCampaign')).toBe(false)
    expect(canAccess('ANALISTA_NEGOCIOS', 'activateCampaign')).toBe(false)
    expect(canAccess('AUDITOR', 'activateCampaign')).toBe(false)
  })
  it('garante permissões de anomalias (FRONT-6): auditor apenas consulta, reprocessamento restrito', () => {
    // Todos os perfis válidos podem consultar anomalias
    for (const role of ['ADMINISTRADOR', 'ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO', 'GERENTE_VENDAS', 'AUDITOR']) {
      expect(canAccess(role, 'viewAnomalies')).toBe(true)
    }

    // Apenas Administrador e Gerente podem reprocessar
    expect(canAccess('ADMINISTRADOR', 'reprocessAnomalies')).toBe(true)
    expect(canAccess('GERENTE_VENDAS', 'reprocessAnomalies')).toBe(true)

    // Auditor e analistas NÃO podem reprocessar (SoD / Auditor apenas consulta)
    expect(canAccess('AUDITOR', 'reprocessAnomalies')).toBe(false)
    expect(canAccess('ANALISTA_NEGOCIOS', 'reprocessAnomalies')).toBe(false)
    expect(canAccess('ANALISTA_CODIGO', 'reprocessAnomalies')).toBe(false)
    expect(canAccess('UNKNOWN', 'reprocessAnomalies')).toBe(false)
  })

  it('só consulta o histórico de fechamentos quando o perfil tem acesso (evita 403 conhecido na campanha)', () => {
    for (const role of ['ADMINISTRADOR', 'GERENTE_VENDAS', 'AUDITOR']) expect(canAccess(role, 'viewClosings')).toBe(true)
    for (const role of ['ANALISTA_NEGOCIOS', 'ANALISTA_CODIGO']) expect(canAccess(role, 'viewClosings')).toBe(false)
  })
})
