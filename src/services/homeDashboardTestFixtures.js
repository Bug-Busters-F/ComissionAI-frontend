export function indicatorsFixture(perfil = 'ADMINISTRADOR') {
  return {
    atualizadoEm: '2026-11-20T10:00:00-03:00', perfil,
    competencias: { total: 6, abertas: 3, processando: 1, fechadas: 2 },
    campanhas: { total: 12, rascunhos: 4, ativas: 5, aguardandoGerente: 3 },
    pendencias: { total: 9, orcamentoNaoConfirmado: 2, revisaoCodigo: 4, lotesComImpedimento: 3 },
    alertas: { lotesComLinhasImpeditivas: 3, execucoesFalhas: 2, fechamentosFalhos: 1, fechamentosEmProcessamento: 1 },
    aguardandoAcao: [
      { tipo: 'ORCAMENTO_PENDENTE', campanhaId: 8, href: '/api/v1/campanhas/8/orcamento', metodo: 'PATCH' },
      { tipo: 'REVISAO_CODIGO_PENDENTE', campanhaId: 9, metodo: 'POST' },
      { tipo: 'APROVACAO_GERENCIAL_PENDENTE', campanhaId: 10, metodo: 'PATCH' },
      { tipo: 'LOTE_COM_IMPEDIMENTO', campanhaId: 8, competencia: '2025-07' },
      { tipo: 'FECHAMENTO_FALHOU', competencia: '2025-07' },
      { tipo: 'CALCULO_FALHOU', competencia: '2025-08' }
    ]
  }
}
