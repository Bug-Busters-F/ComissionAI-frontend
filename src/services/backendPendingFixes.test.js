import { describe, it, expect } from 'vitest'
import {
  parseComparableGroup,
  alertsListSignature,
  POST_EFFECTIVE_POLL_DELAYS_MS,
  POST_EFFECTIVE_REPROCESS_HINT
} from './statisticalAlertsLogic'
import { describeCommitError } from './campaignPreparationService'

// Ajustes do front para as correções do back (branch fix/ignora-competencia-venda, pendências da FRONT-6).

describe('grupoComparavel com códigos de negócio (pendência 3)', () => {
  it('exibe os códigos inteiros enviados pelo back', () => {
    expect(parseComparableGroup('2025-07|loja=14|cargo=100|marca=10')).toMatchObject({
      competencia: '2025-07', loja: '14', cargo: '100', marca: '10', label: 'Loja 14 · Cargo 100 · Marca 10'
    })
  })

  it('código ausente no cadastro ("null") não aparece como "Loja null"', () => {
    expect(parseComparableGroup('2025-07|loja=null|cargo=100|marca=10').label).toBe('Cargo 100 · Marca 10')
    expect(parseComparableGroup('2025-07|loja=|cargo=NULL|marca=10').label).toBe('Marca 10')
  })
})

describe('análise estatística assíncrona pós-efetivação (pendência 5)', () => {
  const counts = { totalGeral: 3, totalOutliers: 2, totalInconsistencias: 1 }

  it('assinatura muda quando os contadores mudam', () => {
    const antes = alertsListSignature(counts, { content: [] })
    expect(alertsListSignature({ ...counts, totalGeral: 4 }, { content: [] })).not.toBe(antes)
  })

  it('assinatura muda quando alertas são substituídos com os mesmos contadores (novo geradoEm)', () => {
    const antes = alertsListSignature(counts, { content: [{ geradoEm: '2026-11-20T10:00:00Z' }] })
    const depois = alertsListSignature(counts, { content: [{ geradoEm: '2026-11-20T10:05:00Z' }] })
    expect(depois).not.toBe(antes)
  })

  it('assinatura é estável para a mesma listagem e tolera dados ausentes', () => {
    const page = { content: [{ geradoEm: '2026-11-20T10:00:00Z' }, { geradoEm: 'inválida' }] }
    expect(alertsListSignature(counts, page)).toBe(alertsListSignature({ ...counts }, { content: [...page.content] }))
    expect(alertsListSignature(null, null)).toBe('0|0|0|0')
  })

  it('reconsulta com intervalos crescentes por cerca de um minuto e explica o bloqueio do reprocessamento', () => {
    expect(POST_EFFECTIVE_POLL_DELAYS_MS.every((d, i, arr) => i === 0 || d > arr[i - 1])).toBe(true)
    const total = POST_EFFECTIVE_POLL_DELAYS_MS.reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThanOrEqual(60000)
    expect(total).toBeLessThanOrEqual(90000)
    expect(POST_EFFECTIVE_REPROCESS_HINT).toMatch(/Aguarde a análise automática/)
  })
})

describe('describeCommitError — 409 de chave de venda ambígua (pendência 2)', () => {
  const conflito = (validacoes, message = 'Efetivação bloqueada: existem 2 linha(s) com chave de venda ambígua na base geral.') =>
    ({ response: { status: 409, data: { message, validacoes } } })

  it('lista as linhas bloqueadas a partir de validacoes', () => {
    const res = describeCommitError(conflito([
      { campo: 'linha:12', motivo: 'Chave de venda ambígua para matrícula MATRIC-551.' },
      { campo: 'linha:40', motivo: 'Chave de venda ambígua para matrícula MATRIC-379.' }
    ]))
    expect(res.message).toMatch(/Efetivação bloqueada/)
    expect(res.details).toEqual([
      'Linha 12: Chave de venda ambígua para matrícula MATRIC-551.',
      'Linha 40: Chave de venda ambígua para matrícula MATRIC-379.'
    ])
  })

  it('limita a 10 linhas e resume o restante', () => {
    const muitas = Array.from({ length: 13 }, (_, i) => ({ campo: `linha:${i + 1}`, motivo: 'Ambígua' }))
    const res = describeCommitError(conflito(muitas))
    expect(res.details).toHaveLength(11)
    expect(res.details.at(-1)).toBe('… e mais 3 linha(s).')
  })

  it('sem validacoes mantém só a mensagem; erro de rede usa a mensagem do axios ou o padrão', () => {
    expect(describeCommitError({ response: { data: { message: 'Lote já efetivado.' } } })).toEqual({ message: 'Lote já efetivado.', details: [] })
    expect(describeCommitError({ message: 'timeout of 300000ms exceeded' }).message).toBe('timeout of 300000ms exceeded')
    expect(describeCommitError(null).message).toBe('Falha ao efetivar lote na base geral.')
  })

  it('ignora entradas sem motivo e preserva campo não numérico', () => {
    const res = describeCommitError(conflito([{ campo: 'linha:3' }, null, { campo: 'arquivo', motivo: 'Arquivo divergente.' }]))
    expect(res.details).toEqual(['Arquivo divergente.'])
  })
})
