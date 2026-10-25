import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useNotificationStore } from '../stores/notificationStore'
import { createCampaignActionFeedback } from './campaignActionFeedback'

beforeEach(() => { setActivePinia(createPinia()); vi.useFakeTimers() })
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

function setup() {
  const store = useNotificationStore()
  return { store, feedback: createCampaignActionFeedback(store) }
}

describe('campaign explicit action notifications', () => {
  it('waits for confirmation before reporting a saved draft through the existing toast store', async () => {
    const { store, feedback } = setup()
    let confirm
    const result = feedback('save', () => new Promise((resolve) => { confirm = resolve }))
    expect(store.notifications).toHaveLength(0)
    confirm(true)
    expect(await result).toBe(true)
    expect(store.notifications[0]).toMatchObject({ type: 'success', title: 'Rascunho salvo' })
    vi.advanceTimersByTime(5000)
    expect(store.notifications).toHaveLength(0)
  })
  it('reports rejection with the existing error design and never reports success', async () => {
    const { store, feedback } = setup()
    expect(await feedback('save', async () => false, { error: () => 'Não foi possível conectar. Tente novamente.' })).toBe(false)
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]).toMatchObject({ type: 'danger', title: 'Não foi possível salvar o rascunho' })
    vi.advanceTimersByTime(5000)
    expect(store.notifications).toHaveLength(1)
    vi.advanceTimersByTime(4000)
    expect(store.notifications).toHaveLength(0)
  })
  it('does not notify when an action only opens confirmation, is cancelled or cannot start without an error', async () => {
    const { store, feedback } = setup()
    await feedback('save', async () => false)
    await feedback('interpret', async () => false)
    expect(store.notifications).toHaveLength(0)
  })
  it('does not stack campaign toasts or remove unrelated system notifications', async () => {
    const { store, feedback } = setup()
    const unrelated = store.info('Outra operação', 'Resultado de outra área.')
    await feedback('save', async () => true)
    await feedback('simulate', async () => true)
    expect(store.notifications).toHaveLength(2)
    expect(store.notifications.some((n) => n.id === unrelated)).toBe(true)
    expect(store.notifications[1].title).toBe('Simulação concluída')
  })
  it('ignores a repeated click while the same action is pending and allows a later retry', async () => {
    const { store, feedback } = setup()
    let confirm
    const action = vi.fn(() => new Promise((resolve) => { confirm = resolve }))
    const first = feedback('save', action)
    expect(await feedback('save', action)).toBe(false)
    expect(action).toHaveBeenCalledOnce()
    confirm(false); await first
    expect(await feedback('save', async () => true)).toBe(true)
    expect(store.notifications).toHaveLength(1)
  })
  it('preserves the saved response message when later edits remain unsaved', async () => {
    const { store, feedback } = setup()
    const message = 'A versão enviada foi salva. Há alterações posteriores ainda não salvas.'
    await feedback('save', async () => true, { successMessage: () => message })
    expect(store.notifications[0].message).toBe(message)
  })
  it.each(['interpret', 'reinterpret', 'apply', 'simulate', 'accept', 'activate'])('notifies only confirmed completion of %s', async (key) => {
    const { store, feedback } = setup()
    await feedback(key, async () => false, { error: () => 'A operação não foi confirmada.' })
    expect(store.notifications[0].type).toBe('danger')
    await feedback(key, async () => true)
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0].type).toBe('success')
  })
})
