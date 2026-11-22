import { describe, expect, it, vi } from 'vitest'
import { completeCampaignPublication } from './campaignPublication'
import { canAccess, canEditStep, STEP_RESPONSIBILITIES } from './accessPolicy'
function setup(overrides={}) {
 return { state:{encaminhadaGerente:false},canActivate:{value:true},forwardToManager:vi.fn(async()=>true),activate:vi.fn(async()=>true),...overrides }
}
describe('publicação pelo administrador sem troca de perfil',()=>{
 it('conclui o encaminhamento confirmado antes de publicar',async()=>{
  const lifecycle=setup()
  expect(await completeCampaignPublication(lifecycle,{administrator:true})).toBe(true)
  expect(lifecycle.forwardToManager).toHaveBeenCalledOnce()
  expect(lifecycle.activate).toHaveBeenCalledOnce()
  expect(lifecycle.forwardToManager.mock.invocationCallOrder[0]).toBeLessThan(lifecycle.activate.mock.invocationCallOrder[0])
 })
 it('não publica se o encaminhamento falhar, nem repete um encaminhamento existente',async()=>{
  const failed=setup({forwardToManager:vi.fn(async()=>false)})
  expect(await completeCampaignPublication(failed,{administrator:true})).toBe(false)
  expect(failed.activate).not.toHaveBeenCalled()
  const forwarded=setup({state:{encaminhadaGerente:true}})
  expect(await completeCampaignPublication(forwarded,{administrator:true})).toBe(true)
  expect(forwarded.forwardToManager).not.toHaveBeenCalled()
 })
 it('preserva os bloqueios de prontidão e o comportamento dos demais perfis',async()=>{
  const blocked=setup({canActivate:{value:false}})
  expect(await completeCampaignPublication(blocked,{administrator:true})).toBe(false)
  expect(blocked.forwardToManager).not.toHaveBeenCalled();expect(blocked.activate).not.toHaveBeenCalled()
  const manager=setup()
  expect(await completeCampaignPublication(manager)).toBe(true)
  expect(manager.forwardToManager).not.toHaveBeenCalled()
 })
 it('administrador tem todas as ações do fluxo, mantendo as restrições dos analistas',()=>{
  for(const action of ['createCampaign','saveCampaign','approveCode','activateCampaign','manageData','runCampaignApuration'])expect(canAccess('ADMINISTRADOR',action,['ACESSO_COMPLETO'])).toBe(true)
  for(const step of STEP_RESPONSIBILITIES)expect(canEditStep('ADMINISTRADOR',step.key)).toBe(true)
  expect(canAccess('ANALISTA_CODIGO','saveCampaign')).toBe(false)
  expect(canAccess('ANALISTA_CODIGO','activateCampaign')).toBe(false)
 })
})
