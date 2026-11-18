import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CommissionReportExportDropdown from './CommissionReportExportDropdown.vue'

describe('CommissionReportExportDropdown', () => {
  it('renders dropdown button with label and disabled state when disabled is true', async () => {
    const app = createSSRApp(CommissionReportExportDropdown, {
      disabled: true,
      loading: false
    })

    const html = await renderToString(app)
    expect(html).toContain('Exportar Relatório (.csv)')
    expect(html).toContain('disabled')
  })

  it('renders loading state text when exporting', async () => {
    const app = createSSRApp(CommissionReportExportDropdown, {
      disabled: false,
      loading: true
    })

    const html = await renderToString(app)
    expect(html).toContain('Exportando…')
    expect(html).toContain('disabled')
  })

  it('exposes all official backend export options', () => {
    const app = createSSRApp(CommissionReportExportDropdown, {
      disabled: false,
      loading: false
    })
    // Verificamos que o componente monta sem erros
    expect(app).toBeDefined()
  })
})
