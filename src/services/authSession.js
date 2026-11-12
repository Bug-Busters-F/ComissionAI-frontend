import axios from 'axios'
export const AUTH_SESSION_KEY = 'comissionai.auth.session.v1'
const browserStorage = () => { try { return window.sessionStorage } catch { return null } }

export function createAuthSession({ storage = browserStorage, now = () => Date.now() } = {}) {
  let session = null, revision = 0, loaded = false, listener = null, timer = null, lastReason = null
  const pending = new Set()
  const getStorage = () => typeof storage === 'function' ? storage() : storage
  function cancel() { for (const controller of pending) controller.abort(); pending.clear() }
  function clear(reason = null, notify = false) {
    ++revision; lastReason = reason; cancel(); clearTimeout(timer); timer = null; session = null; loaded = true
    try { getStorage()?.removeItem(AUTH_SESSION_KEY) } catch {}
    if (notify) listener?.(reason)
  }
  function schedule() {
    clearTimeout(timer)
    if (session) timer = setTimeout(() => clear('expired', true), Math.min(2147483647, Math.max(0, Date.parse(session.expiresAt) - now())))
    timer?.unref?.()
  }
  function load() {
    if (loaded) return session
    loaded = true
    try {
      const saved = JSON.parse(getStorage()?.getItem(AUTH_SESSION_KEY) || 'null')
      if (typeof saved?.token === 'string' && saved.token && Date.parse(saved.expiresAt) > now()) session = saved
      else if (saved) clear('expired')
    } catch { clear() }
    schedule(); return session
  }
  function set(token, expiresAt) {
    if (!token || !Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= now()) throw Error('A sessão recebida não é válida. Tente entrar novamente.')
    clear(); session = { token, expiresAt }
    try { getStorage()?.setItem(AUTH_SESSION_KEY, JSON.stringify(session)) } catch {}
    schedule()
  }
  return {
    load, set, clear,
    get reason() { return lastReason },
    get token() { const current = load(); if (current && Date.parse(current.expiresAt) <= now()) { clear('expired', true); return null } return current?.token || null },
    get revision() { return revision },
    onExpired(callback) { listener = callback },
    track(controller) { pending.add(controller); return () => pending.delete(controller) },
    assertCurrent(expected) { if (revision !== expected) throw new axios.CanceledError('A sessão mudou durante a operação.') },
    expire(expected) { if (revision === expected) clear('expired', true) }
  }
}
export const authSession = createAuthSession()
