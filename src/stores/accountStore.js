import { defineStore, getActivePinia } from 'pinia'
import { markRaw } from 'vue'
import axios from 'axios'
import { createAccountService } from '@/services/accountService'
import { onAccessDenied } from '@/services/api'
import { authSession } from '@/services/authSession'
import { validateUser } from '@/services/accountModel'

function sessionStorageIfAvailable() { try { return window.sessionStorage } catch { return null } }
export function clearAccountCaches(storage) {
  if (!storage) return
  try {
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (key?.startsWith('comissai:async-exec:') || key?.startsWith('comissionai.calculation.') || key?.startsWith('comissionai.accounts.preview.') || key === 'comissionai.workflow.preview.v1') storage.removeItem(key)
    }
  } catch { /* Preserve logout when storage is unavailable. */ }
}
let restoration = null
export const useAccountStore = defineStore('accounts', {
  state: () => ({ user: null, reason: null, users: [], roles: [], initialized: false, provider: null }),
  getters: { isAdmin: state => state.user?.role === 'ADMINISTRADOR' },
  actions: {
    initialize() {
      this.provider ||= markRaw(createAccountService())
      onAccessDenied(() => this.restore({ force: true }))
      authSession.onExpired(reason => {
        this.invalidate(reason)
        if (typeof window !== 'undefined' && window.location?.pathname !== '/login') {
          const next = window.location.pathname + window.location.search
          window.location.replace('/login?motivo=expired&retorno=' + encodeURIComponent(next))
        }
      })
    },
    invalidate(reason = null) {
      authSession.clear(); clearAccountCaches(sessionStorageIfAvailable())
      this.user = null; this.users = []; this.roles = []; this.reason = reason; this.initialized = true
      for (const store of getActivePinia()?._s.values() || []) if (store.$id !== this.$id) store.$reset?.()
    },
    async restore({ force = false } = {}) {
      this.initialize()
      if (!authSession.token) { this.invalidate(authSession.reason || this.reason); return { user: null, reason: this.reason } }
      if (this.initialized && this.user && !force) return { user: this.user, reason: null }
      if (restoration) return restoration
      const expected = authSession.revision
      restoration = (async () => {
        try {
          const user = await this.provider.me()
          authSession.assertCurrent(expected)
          if (!user.active) { this.invalidate('disabled'); return { user: null, reason: 'disabled' } }
          if (this.user && (this.user.id !== user.id || this.user.role !== user.role)) {
            clearAccountCaches(sessionStorageIfAvailable()); this.users = []; this.roles = []
          }
          this.user = user; this.reason = null; this.initialized = true
          return { user, reason: null }
        } catch (error) {
          if (error.status === 401 || error.code === 'ERR_CANCELED') return { user: null, reason: this.reason || 'expired' }
          // Never authorize from cached identity when confirmation is unavailable.
          this.user = null; this.reason = 'connection'; this.initialized = true
          return { user: null, reason: 'connection' }
        } finally { restoration = null }
      })()
      return restoration
    },
    async login(email, password) {
      this.initialize(); this.invalidate()
      const expected = authSession.revision
      const result = await this.provider.login(email, password)
      authSession.assertCurrent(expected)
      authSession.set(result.token, result.expiresAt)
      this.user = result.user; this.reason = null; this.initialized = true
    },
    async logout() {
      this.initialize()
      if (authSession.token) {
        try { await this.provider.logout() }
        catch (error) { if (error.status !== 401 && error.code !== 'ERR_CANCELED') throw error }
      }
      this.invalidate('logout')
    },
    async loadUsers() {
      this.initialize()
      if (!this.isAdmin) throw Error('Seu perfil não permite gerenciar usuários.')
      const expected = authSession.revision
      const [users, roles] = await Promise.all([this.provider.list(), this.provider.roles()])
      authSession.assertCurrent(expected)
      if (!this.isAdmin) throw new axios.CanceledError('A sessão mudou.')
      this.users = users; this.roles = roles
    },
    upsert(user) {
      this.users = this.users.some(u => u.id === user.id) ? this.users.map(u => u.id === user.id ? user : u) : [...this.users, user]
      if (user.id === this.user?.id) this.user = user
      return user
    },
    async saveUser(input, id) {
      if (!this.isAdmin) throw Error('Seu perfil não permite gerenciar usuários.')
      const fields = validateUser(input, this.users, id)
      if (Object.keys(fields).length) throw Object.assign(Error('Revise os campos destacados.'), { fields })
      const expected = authSession.revision
      const confirm = user => { authSession.assertCurrent(expected); return this.upsert(user) }
      if (!id) return confirm(await this.provider.create(input))
      const previous = this.users.find(u => u.id === id)
      if (!previous) throw Error('Atualize a lista antes de editar esta conta.')
      let updated = false
      try {
        if (input.name.trim() !== previous.name || input.email.trim() !== previous.email) { confirm(await this.provider.update(input, id)); updated = true }
        if (input.role !== previous.role) confirm(await this.provider.profile(input.role, id))
        return this.users.find(u => u.id === id)
      } catch (error) {
        if (updated && error.code !== 'ERR_CANCELED') error.message = 'Nome e e-mail foram salvos, mas o perfil não foi alterado. ' + error.message
        throw error
      }
    },
    async setActive(id, active) {
      if (!this.isAdmin) throw Error('Seu perfil não permite gerenciar usuários.')
      const expected = authSession.revision
      const user = await this.provider.setActive(id, active)
      authSession.assertCurrent(expected)
      return this.upsert(user)
    },
    async changePassword(input) {
      const expected = authSession.revision
      await this.provider.password(input)
      authSession.assertCurrent(expected)
      this.invalidate('password-changed')
    }
  }
})
