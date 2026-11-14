import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CompetenceClosingModal from './CompetenceClosingModal.vue'
import CompetenceClosingStatusCard from './CompetenceClosingStatusCard.vue'

describe('CompetenceClosing Components — [FRONT-10]', () => {
  describe('CompetenceClosingModal', () => {
    it('renderiza o modal aberto com alerta de impacto e identificação do usuário', async () => {
      const app = createSSRApp(CompetenceClosingModal, {
        open: true,
        competencia: '2026-10',
        currentUser: 'gerente@empresa.com',
        previewTotals: {
          totalVendasProcessadas: 50,
          totalCalculados: 48,
          totalImpedimentos: 2,
          valorTotalComissao: 5200.5
        }
      })

      const html = await renderToString(app)
      expect(html).toContain('Fechamento Definitivo · 10/2026')
      expect(html).toContain('Atenção ao impacto global em todas as campanhas')
      expect(html).toContain('gerente@empresa.com')
      expect(html).toContain('Resumo da Prévia Conferida')
      expect(html).toContain('Confirmar e Lacrar Competência')
    })

    it('não renderiza conteúdo quando open é false', async () => {
      const app = createSSRApp(CompetenceClosingModal, {
        open: false,
        competencia: '2026-10'
      })

      const html = await renderToString(app)
      expect(html).not.toContain('Fechamento Definitivo')
    })

    it('bloqueia o fechamento e exibe aviso quando não há usuário identificado na sessão', async () => {
      const app = createSSRApp(CompetenceClosingModal, {
        open: true,
        competencia: '2026-10',
        currentUser: null // Usuário nulo/indefinido
      })

      const html = await renderToString(app)
      expect(html).toContain('Usuário não identificado')
      expect(html).toContain('Não é possível prosseguir sem usuário identificado na sessão')
      expect(html).toContain('disabled')
    })

    it('renderiza contagens da prévia assíncrona quando valorTotalComissao é nulo', async () => {
      const app = createSSRApp(CompetenceClosingModal, {
        open: true,
        competencia: '2026-10',
        currentUser: 'gerente@empresa.com',
        previewTotals: {
          totalVendasProcessadas: 82,
          totalCalculados: 0,
          totalImpedimentos: 82,
          valorTotalComissao: null
        }
      })

      const html = await renderToString(app)
      expect(html).toContain('Consolidado no fechamento')
      expect(html).toContain('Contagens confirmadas na prévia assíncrona')
      expect(html).toContain('82')
    })
  })

  describe('CompetenceClosingStatusCard', () => {
    it('habilita o botão de fechamento definitivo quando a prévia foi realizada e perfil tem permissão', async () => {
      const app = createSSRApp(CompetenceClosingStatusCard, {
        competencia: '2026-10',
        statusData: { status: 'ABERTA', bloqueada: false },
        canExecuteClosing: true,
        hasPreviewCalculated: true,
        isRecalculating: false
      })

      const html = await renderToString(app)
      expect(html).toContain('Executar Fechamento Definitivo')
      expect(html).not.toMatch(/<button[^>]*\sdisabled[\s=>]/i)
    })
    it('renderiza status CONCLUIDO com protocolo, valores consolidados e botão de download', async () => {
      const app = createSSRApp(CompetenceClosingStatusCard, {
        competencia: '2026-10',
        statusData: {
          status: 'CONCLUIDO',
          bloqueada: true,
          protocolo: '12345678-abcd-1111-2222-333344445555',
          fechadoEm: '2026-10-31T20:00:00Z',
          executadoPor: 'admin@empresa.com',
          totalVendasProcessadas: 100,
          totalCalculados: 98,
          totalImpedimentos: 2,
          valorTotalComissao: 12500
        },
        hasProof: true,
        proofDownloaded: false
      })

      const html = await renderToString(app)
      expect(html).toContain('Competência Liquidada e Bloqueada')
      expect(html).toContain('Lacrada / Concluída')
      expect(html).toContain('12345678-abcd-1111-2222-333344445555')
      expect(html).toContain('admin@empresa.com')
      expect(html).toContain('Baixar Comprovante (JSON)')
      expect(html).toContain('Comprovante de auditoria disponível para download')
    })

    it('renderiza status PROCESSANDO com botão de atualizar e bloqueio de novas ações', async () => {
      const app = createSSRApp(CompetenceClosingStatusCard, {
        competencia: '2026-10',
        statusData: {
          status: 'PROCESSANDO',
          bloqueada: true
        },
        canExecuteClosing: false
      })

      const html = await renderToString(app)
      expect(html).toContain('Em Processamento')
      expect(html).toContain('Fechamento Contábil em Andamento')
      expect(html).toContain('Verificar status agora')
      expect(html).not.toContain('Executar Fechamento Definitivo')
    })

    it('renderiza status FALHOU com mensagem e botão de nova tentativa', async () => {
      const app = createSSRApp(CompetenceClosingStatusCard, {
        competencia: '2026-10',
        statusData: {
          status: 'FALHOU',
          bloqueada: false,
          mensagem: 'Falha de conexão com a base de taxas.'
        },
        canExecuteClosing: true
      })

      const html = await renderToString(app)
      expect(html).toContain('Falhou')
      expect(html).toContain('A última tentativa de fechamento falhou')
      expect(html).toContain('Falha de conexão com a base de taxas.')
      expect(html).toContain('Tentar Fechamento Novamente')
    })

    it('renderiza modo de leitura estrito para perfil AUDITOR sem botões de escrita', async () => {
      const app = createSSRApp(CompetenceClosingStatusCard, {
        competencia: '2026-10',
        statusData: {
          status: 'ABERTA',
          bloqueada: false
        },
        canExecuteClosing: false // Auditor ou Analista
      })

      const html = await renderToString(app)
      expect(html).toContain('Aberta')
      expect(html).toContain('Seu perfil possui permissão apenas de leitura para consulta contábil.')
      expect(html).not.toContain('Executar Fechamento Definitivo')
      expect(html).not.toContain('Recalcular e conferir prévia')
    })

    it('renderiza avisos de divergência e resposta perdida quando informados', async () => {
      const app = createSSRApp(CompetenceClosingStatusCard, {
        competencia: '2026-10',
        statusData: {
          status: 'CONCLUIDO',
          bloqueada: true,
          protocolo: 'proto-uuid'
        },
        divergenceWarning: 'Os valores consolidados diferem da prévia em R$ 150,00.',
        lostResponseWarning: true
      })

      const html = await renderToString(app)
      expect(html).toContain('Divergência detectada entre a prévia e o fechamento')
      expect(html).toContain('Os valores consolidados diferem da prévia em R$ 150,00.')
      expect(html).toContain('Resposta interrompida pela rede')
    })
  })
})
