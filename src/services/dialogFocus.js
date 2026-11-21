import { nextTick, onBeforeUnmount, watch } from 'vue'

/**
 * Foco e teclado de diálogos modais (FRONT-14).
 *
 * Padroniza o que os diálogos mais antigos (CampaignDeleteDialog etc.) faziam cada um à sua maneira:
 * - ao abrir, leva o foco para dentro do diálogo (sem isso o @keydown.esc da raiz nunca dispara);
 * - mantém Tab / Shift+Tab presos no diálogo;
 * - Esc fecha, exceto enquanto uma operação estiver em andamento;
 * - ao fechar, devolve o foco ao elemento que abriu o diálogo.
 */
export const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ')

export function getFocusableElements(root) {
  if (!root?.querySelectorAll) return []
  return [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(el => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true')
}

/**
 * Trata Tab / Shift+Tab dentro de `root`. Retorna true quando moveu o foco.
 */
export function trapTabKey(event, root) {
  if (event?.key !== 'Tab' || !root) return false
  const focusable = getFocusableElements(root)
  if (!focusable.length) {
    event.preventDefault()
    root.focus?.()
    return true
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = root.ownerDocument?.activeElement
  const outside = !root.contains?.(active) || active === root
  if (event.shiftKey && (active === first || outside)) {
    event.preventDefault()
    last.focus()
    return true
  }
  if (!event.shiftKey && (active === last || outside)) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
}

/**
 * Decide o que uma tecla faz no diálogo. Pura, para ser testada sem DOM.
 * @returns {'close'|'trap'|null}
 */
export function resolveDialogKey(event, { busy = false } = {}) {
  if (event?.key === 'Escape' || event?.key === 'Esc') return busy ? null : 'close'
  if (event?.key === 'Tab') return 'trap'
  return null
}

/**
 * Composable para diálogos com `v-if="open"`.
 *
 * Uso no template da raiz do diálogo:
 *   <div v-if="open" ref="dialogRoot" tabindex="-1" role="dialog" aria-modal="true" @keydown="onDialogKeydown">
 *
 * @param {import('vue').Ref<HTMLElement|null>} dialogRef
 * @param {() => boolean} isOpen
 * @param {{ onClose: () => void, isBusy?: () => boolean, initialFocus?: () => HTMLElement|null }} options
 */
export function useDialogFocus(dialogRef, isOpen, { onClose, isBusy = () => false, initialFocus } = {}) {
  let previouslyFocused = null

  watch(isOpen, async open => {
    if (typeof document === 'undefined') return
    if (open) {
      previouslyFocused = document.activeElement
      await nextTick()
      const root = dialogRef.value
      const target = initialFocus?.() || getFocusableElements(root)[0] || root
      target?.focus?.({ preventScroll: true })
    } else {
      const toRestore = previouslyFocused
      previouslyFocused = null
      await nextTick()
      if (toRestore?.isConnected) toRestore.focus?.({ preventScroll: true })
    }
  }, { immediate: true })

  onBeforeUnmount(() => { previouslyFocused = null })

  function onDialogKeydown(event) {
    const action = resolveDialogKey(event, { busy: isBusy() })
    if (action === 'close') {
      event.preventDefault()
      event.stopPropagation()
      onClose?.()
    } else if (action === 'trap') {
      trapTabKey(event, dialogRef.value)
    }
  }

  return { onDialogKeydown }
}
