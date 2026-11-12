import { afterEach, describe, expect, it, vi } from 'vitest'
import { AUTH_SESSION_KEY, createAuthSession } from './authSession'
const storage = () => { const m = new Map(); return { getItem: k => m.get(k), setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k) } }
afterEach(() => vi.useRealTimers())
describe('real session boundary', () => {
  it('stores only token/expiry and restores without trusting a cached identity', () => {
    const s = storage(), session = createAuthSession({ storage: s })
    const expiry = new Date(Date.now() + 60000).toISOString()
    session.set('opaque-token', expiry)
    expect(JSON.parse(s.getItem(AUTH_SESSION_KEY))).toEqual({ token: 'opaque-token', expiresAt: expiry })
    const restored = createAuthSession({ storage: s }); expect(restored.token).toBe('opaque-token')
    restored.clear(); session.clear()
  })
  it('expires automatically and cancels requests', () => {
    vi.useFakeTimers()
    const session = createAuthSession({ storage: storage() }), expired = vi.fn(), c = new AbortController()
    session.set('token', new Date(Date.now() + 1000).toISOString()); session.onExpired(expired); session.track(c)
    vi.advanceTimersByTime(1001)
    expect(session.token).toBeNull(); expect(expired).toHaveBeenCalledWith('expired'); expect(c.signal.aborted).toBe(true)
  })
  it('rejects responses from a different session and ignores stale unauthorized responses', () => {
    const session = createAuthSession({ storage: storage() })
    session.set('one', new Date(Date.now() + 60000).toISOString()); const old = session.revision
    session.set('two', new Date(Date.now() + 60000).toISOString())
    session.expire(old); expect(session.token).toBe('two')
    expect(() => session.assertCurrent(old)).toThrow('sessão mudou')
    session.clear()
  })
  it('handles blocked storage without saving a password or granting an expired session', () => {
    const session = createAuthSession({ storage: { getItem() { throw Error() }, setItem() { throw Error() }, removeItem() { throw Error() } } })
    expect(session.token).toBeNull(); session.set('one', new Date(Date.now() + 60000).toISOString()); expect(session.token).toBe('one')
    expect(() => session.set('one', 'invalid')).toThrow(); session.clear()
  })
})
