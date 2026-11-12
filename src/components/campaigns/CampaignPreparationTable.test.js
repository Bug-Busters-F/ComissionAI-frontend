import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CampaignPreparationTable from './CampaignPreparationTable.vue'
import CampaignImpactPreviewModal from './CampaignImpactPreviewModal.vue'
import CampaignRiskAcceptModal from './CampaignRiskAcceptModal.vue'
import CampaignLineHistoryModal from './CampaignLineHistoryModal.vue'

describe('CampaignPreparationTable & Modais — [FRONT-5]', () => {
  it('renderiza a tabela de preparação com cabeçalho e botões de ação', async () => {
    const app = createSSRApp(CampaignPreparationTable, {
      campanhaId: 15,
      preparacaoId: 'prep-123',
      batch: {
        id: 'prep-12345678',
        tipoBase: 'SALES',
        competencia: '2026-08',
        status: 'EM_PREPARACAO',
        totalLinhas: 50,
        linhasValidas: 45
      }
    })

    const html = await renderToString(app)
    expect(html).toContain('Correção de Base em Preparação: SALES')
    expect(html).toContain('EM_PREPARACAO')
    expect(html).toContain('Revalidar Lote')
    expect(html).toContain('Efetivar na Base Geral')
    expect(html).toContain('Exibir apenas linhas com erro')
  })

  it('CampaignImpactPreviewModal: renderiza contagens de impacto e exige confirmação', async () => {
    const app = createSSRApp(CampaignImpactPreviewModal, {
      open: true,
      preview: {
        resumoAlteracoesBase: { registrosNovos: 5, registrosAtualizados: 12, registrosInalterados: 33 },
        possuiImpactos: true,
        campanhasAfetadas: [
          { campanhaId: 20, titulo: 'Campanha Impactada', estado: 'ATIVA', simulacaoAceitaInvalidada: true }
        ]
      }
    })

    const html = await renderToString(app)
    expect(html).toContain('Prévia de Impacto Global e Efetivação')
    expect(html).toContain('Novos Registros')
    expect(html).toContain('Campanha Impactada')
    expect(html).toContain('Simulação Aceita Invalidada')
    expect(html).toContain('Estou ciente de que a efetivação destas correções atualizará a base geral')
  })

  it('CampaignRiskAcceptModal: bloqueia aceite para erros de severidade IMPEDITIVO', async () => {
    const app = createSSRApp(CampaignRiskAcceptModal, {
      open: true,
      pendencia: {
        linha: 10,
        campo: 'matricula',
        motivo: 'Matrícula não encontrada no RH',
        severidade: 'IMPEDITIVO'
      }
    })

    const html = await renderToString(app)
    expect(html).toContain('Operação Não Permitida')
    expect(html).toContain('não admitem aceite de risco')
  })

  it('CampaignLineHistoryModal: renderiza comparação de valores antes vs. depois', async () => {
    const app = createSSRApp(CampaignLineHistoryModal, {
      open: true,
      numeroLinha: 14,
      historico: [
        {
          id: 'hist-1',
          versaoAnterior: 1,
          versaoNova: 2,
          editadoPor: 'gerente@empresa.com',
          motivo: 'Ajuste de cargo do vendedor',
          valoresAnterioresJson: JSON.stringify({ descrCargo: 'GERENTE' }),
          valoresNovosJson: JSON.stringify({ descrCargo: 'VENDEDOR' }),
          errosAntesJson: JSON.stringify([{ campo: 'descrCargo', mensagem: 'Cargo incompatível' }]),
          errosDepoisJson: '[]'
        }
      ]
    })

    const html = await renderToString(app)
    expect(html).toContain('Histórico de Alterações — Linha #14')
    expect(html).toContain('Versão 1 → 2')
    expect(html).toContain('gerente@empresa.com')
    expect(html).toContain('Ajuste de cargo do vendedor')
    expect(html).toContain('Todas as inconsistências foram sanadas!')
  })
})
