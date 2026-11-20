import { describe, it, expect, vi } from 'vitest'
import { resolveDialogKey, trapTabKey, getFocusableElements } from './dialogFocus'

function fakeElement(name) {
  return { name, focus: vi.fn(), hasAttribute: () => false, getAttribute: () => null }
}

function fakeDialog(elements, active) {
  const doc = { activeElement: active }
  return {
    ownerDocument: doc,
    focus: vi.fn(),
    querySelectorAll: () => elements,
    contains: el => elements.includes(el),
    setActive(el) { doc.activeElement = el }
  }
}

const tab = (shiftKey = false) => ({ key: 'Tab', shiftKey, preventDefault: vi.fn() })

describe('resolveDialogKey — teclado dos diálogos (FRONT-14)', () => {
  it('Esc fecha o diálogo, exceto durante uma operação em andamento', () => {
    expect(resolveDialogKey({ key: 'Escape' })).toBe('close')
    expect(resolveDialogKey({ key: 'Esc' })).toBe('close')
    expect(resolveDialogKey({ key: 'Escape' }, { busy: true })).toBeNull()
  })

  it('Tab é tratado como armadilha de foco; demais teclas seguem o fluxo normal', () => {
    expect(resolveDialogKey({ key: 'Tab' })).toBe('trap')
    expect(resolveDialogKey({ key: 'Enter' })).toBeNull()
    expect(resolveDialogKey(null)).toBeNull()
  })
})

describe('trapTabKey — foco preso no diálogo', () => {
  it('Tab no último elemento volta ao primeiro; Shift+Tab no primeiro vai ao último', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(fakeElement)
    const dialog = fakeDialog([a, b, c], c)
    const ev = tab()
    expect(trapTabKey(ev, dialog)).toBe(true)
    expect(ev.preventDefault).toHaveBeenCalled()
    expect(a.focus).toHaveBeenCalled()

    dialog.setActive(a)
    const back = tab(true)
    expect(trapTabKey(back, dialog)).toBe(true)
    expect(c.focus).toHaveBeenCalled()
  })

  it('no meio da lista deixa o navegador mover o foco', () => {
    const [a, b, c] = ['a', 'b', 'c'].map(fakeElement)
    const ev = tab()
    expect(trapTabKey(ev, fakeDialog([a, b, c], b))).toBe(false)
    expect(ev.preventDefault).not.toHaveBeenCalled()
  })

  it('foco fora do diálogo é trazido de volta para dentro', () => {
    const [a, b] = ['a', 'b'].map(fakeElement)
    const outside = fakeElement('fora')
    expect(trapTabKey(tab(), fakeDialog([a, b], outside))).toBe(true)
    expect(a.focus).toHaveBeenCalled()
  })

  it('diálogo sem elementos focáveis mantém o foco no próprio diálogo', () => {
    const dialog = fakeDialog([], null)
    const ev = tab()
    expect(trapTabKey(ev, dialog)).toBe(true)
    expect(dialog.focus).toHaveBeenCalled()
  })

  it('ignora outras teclas e raiz ausente', () => {
    expect(trapTabKey({ key: 'Enter' }, fakeDialog([], null))).toBe(false)
    expect(trapTabKey(tab(), null)).toBe(false)
  })

  it('getFocusableElements descarta itens ocultos', () => {
    const visible = fakeElement('ok')
    const hidden = { ...fakeElement('oculto'), getAttribute: n => (n === 'aria-hidden' ? 'true' : null) }
    expect(getFocusableElements({ querySelectorAll: () => [visible, hidden] })).toEqual([visible])
    expect(getFocusableElements(null)).toEqual([])
  })
})
