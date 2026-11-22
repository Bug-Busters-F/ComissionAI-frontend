import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { beginLoginWelcome, cancelLoginWelcome, loginWelcome } from './loginWelcome'
beforeEach(() => vi.useFakeTimers())
afterEach(() => { cancelLoginWelcome(); vi.useRealTimers() })
describe('post-login welcome lifetime', () => {
  it('overlaps navigation, greets by first name, and closes after its short minimum', async () => {
    const run = beginLoginWelcome('  Ana Silva  ')
    const done = run.finish()
    expect(loginWelcome.visible).toBe(true); expect(loginWelcome.firstName).toBe('Ana')
    await vi.advanceTimersByTimeAsync(1499); expect(loginWelcome.visible).toBe(true)
    await vi.advanceTimersByTimeAsync(1); await done; expect(loginWelcome.visible).toBe(false)
  })
  it('cannot hide a newer welcome when an older navigation completes', async () => {
    const old = beginLoginWelcome('Ana'); const latest = beginLoginWelcome('João')
    await old.finish(); expect(loginWelcome.visible).toBe(true); expect(loginWelcome.firstName).toBe('João')
    latest.cancel(); expect(loginWelcome.visible).toBe(false); expect(vi.getTimerCount()).toBe(0)
  })
  it('has a hard stop for stalled navigation and a shorter reduced-motion version', async () => {
    beginLoginWelcome('Ana'); await vi.advanceTimersByTimeAsync(4000); expect(loginWelcome.visible).toBe(false)
    const run = beginLoginWelcome('Ana', { reducedMotion: true }); const done = run.finish()
    await vi.advanceTimersByTimeAsync(200); await done; expect(loginWelcome.visible).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
  })
})
