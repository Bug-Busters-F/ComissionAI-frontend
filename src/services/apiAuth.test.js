import { afterEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import api from './api'
import { authSession } from './authSession'
const original = api.defaults.adapter
const expiry = () => new Date(Date.now() + 60000).toISOString()
afterEach(() => { api.defaults.adapter = original; authSession.clear(); authSession.onExpired(null) })
describe('authenticated HTTP boundary', () => {
  it('adds the current token but never adds it to login', async () => {
    authSession.set('current', expiry()); const seen = []
    api.defaults.adapter = async config => { seen.push(config); return { status: 200, data: {}, config, headers: {} } }
    await api.get('/campanhas'); await api.post('/auth/login', {}, { authenticated: false })
    expect(seen[0].headers.get('Authorization')).toBe('Bearer current')
    expect(seen[1].headers.get('Authorization')).toBeUndefined()
  })
  it('expires once on an authenticated 401 but preserves the session on 403', async () => {
    authSession.set('current', expiry()); const expired = vi.fn(); authSession.onExpired(expired)
    let status = 403
    api.defaults.adapter = async config => { throw new axios.AxiosError('Denied', '', config, null, { status, config, data: { message: 'Denied' } }) }
    await expect(api.get('/usuarios')).rejects.toThrow(); expect(authSession.token).toBe('current'); expect(expired).not.toHaveBeenCalled()
    status = 401; await expect(api.get('/auth/me')).rejects.toThrow(); expect(authSession.token).toBeNull(); expect(expired).toHaveBeenCalledOnce()
  })
  it('cancels requests from the previous user before their response is consumed', async () => {
    let release, requested
    api.defaults.adapter = config => { requested = config; return new Promise(resolve => { release = () => resolve({ status: 200, data: { users: ['old-user'] }, config, headers: {} }) }) }
    authSession.set('first', expiry()); const pending = api.get('/usuarios'); await vi.waitFor(() => expect(release).toBeTypeOf('function'))
    authSession.set('second', expiry()); expect(requested.signal.aborted).toBe(true); release()
    await expect(pending).rejects.toMatchObject({ code: 'ERR_CANCELED' }); expect(authSession.token).toBe('second')
  })
})
