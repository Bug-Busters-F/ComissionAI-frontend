import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Status from './CampaignCodeApprovalStatus.vue'
describe('indicação de aprovação para negócios', () => {
  it('informa bloqueio sem código, editor ou ações técnicas', async () => {
    const html = await renderToString(createSSRApp(Status, {approved:false}))
    expect(html).toContain('revisado e aprovado pelo analista de código antes de avançar')
    expect(html).not.toContain('<textarea'); expect(html).not.toContain('<pre')
    expect(html).not.toContain('Aprovar este programa'); expect(html).not.toContain('Copiar código')
    expect(html).toContain('Verificar aprovação')
  })
  it('informa liberação apenas após aprovação atual', async () => {
    const html = await renderToString(createSSRApp(Status, {approved:true}))
    expect(html).toContain('Você pode continuar para a simulação')
    expect(html).not.toContain('Verificar aprovação')
  })
  it('mantém preparação dos dados com negócios sem editar Python', async () => {
    const html = await renderToString(createSSRApp(Status, {needsPreparation:true,canPrepare:true,busy:true}))
    expect(html).toContain('Validar e enviar para revisão'); expect(html).toContain('disabled')
  })
})
