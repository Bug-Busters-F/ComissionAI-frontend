import { reactive } from 'vue'
import { auditError } from './auditModel'

// A identidade da consulta impede que respostas anteriores substituam filtros ou usuários novos.
export function createAuditResource(loader, detail = false) {
  const state = reactive({ data: null, loading: false, error: '' })
  let controller = null, revision = 0, disposed = false
  function clear() {
    ++revision; controller?.abort(); controller = null
    state.data = null; state.error = ''; state.loading = false
  }
  async function load(params) {
    if (disposed) return false
    clear()
    const current = revision, request = new AbortController()
    controller = request; state.loading = true
    try {
      const data = await loader(params, { signal: request.signal })
      if (disposed || request.signal.aborted || current !== revision) return false
      state.data = data
      return true
    } catch (error) {
      if (disposed || request.signal.aborted || current !== revision) return false
      state.error = auditError(error, detail)
      return false
    } finally {
      if (current === revision) { state.loading = false; controller = null }
    }
  }
  return { state, load, clear, dispose() { disposed = true; clear() } }
}
