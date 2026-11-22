import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { RouterLink } from 'vue-router'
import CampaignApprovalGovernanceCard from './CampaignApprovalGovernanceCard.vue'
import { programFixture } from '@/services/campaignLifecycleTestFixtures'

async function render(props = {}) {
  const app = createSSRApp(CampaignApprovalGovernanceCard, props)
  app.component('RouterLink', RouterLink)
  return renderToString(app)
}
describe('Revisão do código completo nos detalhes', () => {
  it('usa a aprovação válida do programa mesmo com indicadores antigos por regra', async () => {
    const html = await render({ program: programFixture(42, { aprovadoPor: 'Revisor do servidor', aprovadoEm: '2026-11-14T10:00:00Z', statusAprovacaoCodigo: 'INVALIDADO', regras: [{ statusAprovacaoCodigo: 'INVALIDADO' }] }) })
    expect(html).toContain('Código aprovado')
    expect(html).toContain('Revisor do servidor')
    expect(html).toContain('14/11/2026')
    expect(html).toContain('Versão 1')
    expect(html).not.toContain('Nova revisão necessária')
    expect(html).not.toContain('Artefatos')
    expect(html).not.toContain('HITL')
    expect(html).not.toContain('Conferir regras avaliadas')
    expect(html).not.toContain('Aprovar Código')
  })
  it('não considera apenas o status aprovado quando a aprovação perdeu validade', async () => {
    const html = await render({ program: programFixture(42, { validoParaExecucao: false, aprovadoPor: 'Revisor anterior' }) })
    expect(html).toContain('Nova revisão necessária')
    expect(html).toContain('etapa 2')
    expect(html).not.toContain('Aprovado por:')
    expect(html).not.toContain('Código aprovado')
  })
  it('apresenta pendência e rejeição sem aprovação direta nos detalhes', async () => {
    const pending = await render({ program: programFixture(42, { statusAprovacao: 'PENDENTE_REVISAO', validoParaExecucao: false }) })
    expect(pending).toContain('Aguardando revisão')
    expect(pending).not.toContain('<button')
    const rejected = await render({ program: programFixture(42, { statusAprovacao: 'REJEITADO', validoParaExecucao: false, justificativa: 'Corrigir o cálculo da taxa.' }) })
    expect(rejected).toContain('Devolvido para correção')
    expect(rejected).toContain('Corrigir o cálculo da taxa.')
  })
  it('não mostra aprovação antiga enquanto consulta ou em falha', async () => {
    const program = programFixture()
    expect(await render({ program, loading: true })).not.toContain('Código aprovado')
    const failed = await render({ program, error: 'Não foi possível consultar a revisão do código.' })
    expect(failed).toContain('Tentar novamente')
    expect(failed).not.toContain('Código aprovado')
    expect(await render()).toContain('ainda não está disponível')
  })
})
