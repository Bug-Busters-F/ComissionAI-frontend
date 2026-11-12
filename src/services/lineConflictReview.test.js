import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { createLineConflictReview } from './lineConflictReview'
describe('concurrent line edits require an explicit decision', () => {
  it('preserves manual edits and original version until comparison is confirmed', () => {
    const form = ref({ versao: 1, matricula: '00123', valorVendaTexto: '500,00' })
    const review = createLineConflictReview(form)
    review.register({ versao: 7, dadosInterpretados: { valorVenda: 200 } })
    expect(review.conflict.value).toBe(true)
    expect(form.value).toEqual({ versao: 1, matricula: '00123', valorVendaTexto: '500,00' })
    expect(review.currentLine.value.dadosInterpretados.valorVenda).toBe(200)
    review.confirmLocal()
    expect(review.conflict.value).toBe(false)
    expect(form.value.versao).toBe(7)
    expect(form.value.valorVendaTexto).toBe('500,00')
  })
  it('keeps saving blocked when the current row could not be retrieved', () => {
    const form = ref({ versao: 1 })
    const review = createLineConflictReview(form)
    review.register(null)
    review.confirmLocal()
    expect(review.conflict.value).toBe(true)
    expect(form.value.versao).toBe(1)
  })
})
