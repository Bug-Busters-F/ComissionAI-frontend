import { describe, expect, it } from 'vitest'
import { ruleScrollProgress, ruleScrollTarget } from './ruleScrollProgress'

const documentCards = [{ top: 500, height: 900 }, { top: 1420, height: 900 }, { top: 2340, height: 900 }]
const at = (scrollY, cards = documentCards) => ruleScrollProgress(cards.map((card) => ({ ...card, top: card.top - scrollY })), {
  scrollY, viewportHeight: 700, scrollHeight: 3400
})

describe('navegação por regras durante a rolagem', () => {
  it('mantém a primeira regra selecionada antes de chegar aos blocos', () => {
    expect(at(0)).toEqual({ weights: [1, 0, 0], activeIndex: 0 })
  })
  it('transfere gradualmente o preenchimento entre duas regras vizinhas', () => {
    const firstTarget = 500 - 24
    const secondTarget = 1420 - 24
    const state = at(firstTarget + (secondTarget - firstTarget) * 0.25)
    expect(state.weights).toEqual([0.75, 0.25, 0])
    expect(state.activeIndex).toBe(0)
    expect(state.weights.reduce((sum, value) => sum + value, 0)).toBe(1)
  })
  it('preenche completamente a bolinha quando sua regra chega à posição de leitura', () => {
    expect(at(1420 - 24)).toEqual({ weights: [0, 1, 0], activeIndex: 1 })
    expect(at(2340 - 24)).toEqual({ weights: [0, 0, 1], activeIndex: 2 })
  })
  it('usa o mesmo progresso ao subir e recalcula após remoção de uma regra', () => {
    const lower = at(2000)
    const upper = at(1000)
    expect(lower.activeIndex).toBe(2)
    expect(upper.activeIndex).toBe(1)
    expect(at(1000, [documentCards[0], documentCards[2]]).weights).toHaveLength(2)
  })
  it('centraliza regras que cabem inteiras na tela', () => {
    const card = { top: 500, height: 300 }
    const target = ruleScrollTarget(card, { scrollY: 0, viewportHeight: 700 })
    expect(target).toBe(300)
    expect(at(target, [card, { top: 1420, height: 900 }])).toEqual({ weights: [1, 0], activeIndex: 0 })
  })
  it('permite chegar à última regra mesmo perto do fim da página', () => {
    const state = ruleScrollProgress([{ top: -900, height: 900 }, { top: 20, height: 300 }], {
      scrollY: 1500, viewportHeight: 700, scrollHeight: 2200
    })
    expect(state).toEqual({ weights: [0, 1], activeIndex: 1 })
  })
  it('aceita coleções vazias ou com uma única regra sem divisões inválidas', () => {
    expect(at(0, [])).toEqual({ weights: [], activeIndex: -1 })
    expect(at(1000, [documentCards[0]])).toEqual({ weights: [1], activeIndex: 0 })
  })
})
