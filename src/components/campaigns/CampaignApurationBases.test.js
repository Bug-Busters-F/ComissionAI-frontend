import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, nextTick, ssrContextKey } from 'vue'
import CampaignBasesSection from './CampaignBasesSection.vue'

const mock = vi.hoisted(() => ({ imports: [], attachments: [], failReport: null, failRead: false, attachBase: vi.fn(), uploadBase: vi.fn() }))
vi.mock('@/stores/authStore', () => ({ useSafeAuthStore: () => ({ canModifyBases: true, canUploadBases: true, refreshSession: async () => {} }) }))
vi.mock('@/services/campaignCoverageService', () => ({ campaignCoverageService: {
  listAttachments: async () => { if (mock.failRead) throw Error('Consulta indisponível'); return [...mock.attachments] },
  listImportedBases: async () => [...mock.imports],
  attachBase: (...args) => mock.attachBase(...args)
} }))
vi.mock('@/services/dataService', () => ({ dataService: {
  fetchCompetenciasReferencia: async () => [{ competencia:'2025-12' }],
  uploadBase: (...args) => mock.uploadBase(...args)
} }))
vi.mock('@/services/api', () => ({ default: { get: async () => ({ data: [] }) } }))
const lot = (reportId, tipoBase, competencia = '2025-12') => ({ reportId, tipoBase, competencia, status: 'CONCLUIDO', nomeArquivo:`arquivo-${reportId}.xlsx` })
const settle = async () => { for (let n = 0; n < 15; n++) await Promise.resolve(); await nextTick() }
function mount() {
  const renderer = createRenderer({
    createElement: () => ({children:[]}), createText: text => ({text}), createComment: () => ({}),
    setText: () => {}, setElementText: () => {}, patchProp: () => {},
    insert: (child,parent) => { child.parent = parent; parent.children.push(child) },
    remove: node => { if (node.parent) node.parent.children = node.parent.children.filter(item => item !== node) },
    parentNode: node => node.parent, nextSibling: () => null
  })
  const app = renderer.createApp(CampaignBasesSection, { campanhaId:5, competencia:'2025-12', compact:true, autoSelectCompetence:false })
  app.provide(ssrContextKey, { modules: new Set() })
  const vm = app.mount({ children:[] })
  return { app, state: vm.$.setupState }
}
beforeEach(() => {
  mock.imports = [lot(1,'HR',null),lot(2,'SALES'),lot(3,'COMISSIONS')]
  mock.attachments = []; mock.failReport = null; mock.failRead = false
  mock.attachBase.mockReset().mockImplementation(async (id, { reportId }) => {
    if (reportId === mock.failReport) throw Error('Vínculo não confirmado')
    mock.attachments.push({...mock.imports.find(item => item.reportId === reportId),id:reportId})
    return mock.attachments.at(-1)
  })
  mock.uploadBase.mockReset()
})
describe('seleção conjunta de bases na apuração', () => {
  it('pré-seleciona as três bases únicas e só vincula ao confirmar', async () => {
    const view = mount(); await settle()
    expect(view.state.completeSelection).toBe(true)
    expect(view.state.pendingSelectedReports).toEqual([1,2,3])
    expect(mock.attachBase).not.toHaveBeenCalled()
    expect(await view.state.confirmSelection()).toBe(true)
    expect(mock.attachBase.mock.calls.map(call => call[1].reportId)).toEqual([1,2,3])
    expect(view.state.pendingSelectedReports).toEqual([])
    expect(await view.state.confirmSelection()).toBe(true)
    expect(mock.attachBase).toHaveBeenCalledTimes(3)
    view.app.unmount()
  })
  it('exige uma escolha quando há várias opções e bloqueia conjuntos incompletos', async () => {
    mock.imports.push(lot(4,'SALES'))
    const view = mount(); await settle()
    expect(view.state.selectedReports.SALES).toBe('')
    expect(await view.state.confirmSelection()).toBe(false)
    view.state.selectedReports.SALES = 4
    expect(await view.state.confirmSelection()).toBe(true)
    expect(mock.attachBase.mock.calls.map(call => call[1].reportId)).toEqual([1,4,3])
    view.app.unmount()
    mock.imports = [lot(1,'HR',null),lot(2,'SALES')]; mock.attachments = []
    const missing = mount(); await settle()
    expect(await missing.state.confirmSelection()).toBe(false)
    missing.app.unmount()
  })
  it('mostra falha parcial e retoma sem duplicar vínculos confirmados', async () => {
    mock.failReport = 2
    const view = mount(); await settle()
    expect(await view.state.confirmSelection()).toBe(false)
    expect(view.state.pageError).toContain('Vínculo não confirmado')
    expect(mock.attachments.map(item => item.reportId)).toEqual([1])
    mock.failReport = null
    await view.state.carregarAnexos()
    expect(await view.state.confirmSelection()).toBe(true)
    expect(mock.attachBase.mock.calls.map(call => call[1].reportId)).toEqual([1,2,2,3])
    view.app.unmount()
  })
  it('não permite confirmar após falha de consulta e rejeita arquivos de outro mês', async () => {
    mock.failRead = true
    const view = mount(); await settle()
    expect(await view.state.confirmSelection()).toBe(false)
    mock.failRead = false; await view.state.carregarAnexos()
    view.state.verificarEAtualizarCompetenciaDetectada({ name:'BASE_VENDAS_JUL25.xlsx' })
    expect(view.state.selectedCompetencia).toBe('2025-12')
    expect(view.state.pageError).toContain('outra competência')
    view.app.unmount()
  })
  it('preserva importação das taxas quando somente a associação falha', async () => {
    const view = mount(); await settle()
    mock.imports.push(lot(4,'COMISSIONS')); mock.failReport = 4
    mock.uploadBase.mockResolvedValue({status:'SUCESSO', reportId:4})
    view.state.commissionFile = {name:'taxas.xlsx'}
    await view.state.uploadCommissions()
    expect(mock.uploadBase).toHaveBeenCalledWith({tipoBase:'COMISSIONS', file:{name:'taxas.xlsx'},competencia:'2025-12'})
    expect(view.state.pageError).toContain('Taxas importadas, mas o vínculo não foi confirmado')
    expect(view.state.baseGroups[2].available.map(item => item.reportId)).toContain(4)
    view.app.unmount()
  })
})
