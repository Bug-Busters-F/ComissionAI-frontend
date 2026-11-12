import { describe, it, expect } from 'vitest'
import { parseCurrencyPtBr, formatCurrencyPtBr } from './currencyUtils'

describe('currencyUtils — Parsing e Formatação de Moeda Brasileira (pt-BR)', () => {
  it('converte string em formato pt-BR para número decimal', () => {
    expect(parseCurrencyPtBr('1.234,56')).toBe(1234.56)
    expect(parseCurrencyPtBr('1250,50')).toBe(1250.5)
    expect(parseCurrencyPtBr('0,99')).toBe(0.99)
    expect(parseCurrencyPtBr('10.000.000,00')).toBe(10000000)
    expect(parseCurrencyPtBr('R$ 2.450,75')).toBe(2450.75)
  })

  it('suporta formatos já em notação com ponto ou números nativos', () => {
    expect(parseCurrencyPtBr(1234.56)).toBe(1234.56)
    expect(parseCurrencyPtBr('1234.56')).toBe(1234.56)
    expect(parseCurrencyPtBr(0)).toBe(0)
  })

  it('retorna null para valores vazios ou inválidos', () => {
    expect(parseCurrencyPtBr('')).toBeNull()
    expect(parseCurrencyPtBr(null)).toBeNull()
    expect(parseCurrencyPtBr(undefined)).toBeNull()
    expect(parseCurrencyPtBr('abc')).toBeNull()
  })

  it('formata número para padrão pt-BR', () => {
    expect(formatCurrencyPtBr(1234.56)).toBe('1.234,56')
    expect(formatCurrencyPtBr(1234.56, true)).toBe('R$ 1.234,56')
    expect(formatCurrencyPtBr(null)).toBe('—')
  })
})
