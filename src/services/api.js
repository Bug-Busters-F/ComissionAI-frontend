import axios from 'axios'
import { authSession } from './authSession'
let accessDenied = null
export function onAccessDenied(callback) { accessDenied = callback }
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', timeout: 300000 })
api.interceptors.request.use(config => {
  if (config.authenticated === false) return config
  const token = authSession.token
  config.sessionRevision = authSession.revision
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  const controller = new AbortController()
  const original = config.signal
  const abort = () => controller.abort()
  if (original?.aborted) abort()
  else original?.addEventListener('abort', abort, { once: true })
  const untrack = authSession.track(controller)
  config.releaseSessionRequest = () => { untrack(); original?.removeEventListener('abort', abort) }
  config.signal = controller.signal
  return config
})
api.interceptors.response.use(response => {
  response.config.releaseSessionRequest?.()
  if (response.config.authenticated !== false) authSession.assertCurrent(response.config.sessionRevision)
  return response
}, error => {
  const config = error.config
  config?.releaseSessionRequest?.()
  if (config && config.authenticated !== false) {
    authSession.assertCurrent(config.sessionRevision)
    if (error.response?.status === 401) authSession.expire(config.sessionRevision)
    if (error.response?.status === 403 && config.url !== '/auth/me') Promise.resolve().then(() => accessDenied?.()).catch(() => {})
  }
  return Promise.reject(error)
})
export default api
