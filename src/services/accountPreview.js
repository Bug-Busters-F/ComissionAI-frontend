// Isolated UI preview. Replace this provider with BACK-1/2/3; it is not authentication.
export const USER_ROLES = Object.freeze([
  { value: 'ADMINISTRADOR', label: 'Administrador', description: 'Gerencia usuários e acessa todas as áreas.' },
  { value: 'ANALISTA_NEGOCIOS', label: 'Analista de negócios', description: 'Prepara propostas e acompanha simulações.' },
  { value: 'ANALISTA_CODIGO', label: 'Analista de código', description: 'Confere o programa e sua revisão técnica.' },
  { value: 'GERENTE_VENDAS', label: 'Gerente', description: 'Revisa campanhas e acompanha as bases e os resultados.' },
  { value: 'AUDITOR', label: 'Auditor', description: 'Consulta informações e históricos para auditoria.' }
])
export const PREVIEW_PASSWORD = 'Demo@2026'
export const SESSION_KEY = 'comissionai.accounts.preview.session.v1'
const USERS_KEY = 'comissionai.accounts.preview.users.v1'
const seeds = [
  ['u1', 'Marina Costa', 'admin@comissionai.exemplo', 'ADMINISTRADOR', true],
  ['u2', 'Rafael Lima', 'negocios@comissionai.exemplo', 'ANALISTA_NEGOCIOS', true],
  ['u3', 'Beatriz Santos', 'codigo@comissionai.exemplo', 'ANALISTA_CODIGO', true],
  ['u4', 'Lucas Almeida', 'gerente@comissionai.exemplo', 'GERENTE_VENDAS', true],
  ['u5', 'Camila Rocha', 'auditor@comissionai.exemplo', 'AUDITOR', true],
  ['u6', 'Pedro Ribeiro', 'inativo@comissionai.exemplo', 'ANALISTA_NEGOCIOS', false]
].map(([id, name, email, role, active]) => ({ id, name, email, role, active, createdAt: '2026-11-01T12:00:00Z', updatedAt: '2026-11-01T12:00:00Z' }))
export const roleLabel = role => USER_ROLES.find(item => item.value === role)?.label || 'Perfil não informado'
export const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
export function validateUser(input, users = [], id = null) {
  const errors = {}
  if (!String(input.name || '').trim()) errors.name = 'Informe o nome completo.'
  else if (input.name.trim().length > 120) errors.name = 'Use até 120 caracteres.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email || '').trim())) errors.email = 'Informe um e-mail válido.'
  else if (users.some(u => u.id !== id && u.email.toLowerCase() === input.email.trim().toLowerCase())) errors.email = 'Este e-mail já está em uso.'
  if (!USER_ROLES.some(role => role.value === input.role)) errors.role = 'Selecione um dos cinco perfis disponíveis.'
  return errors
}
export function validatePassword({ current, next, confirmation }) {
  const errors = {}
  if (!current) errors.current = 'Informe sua senha atual.'
  if (!next || next.length < 8) errors.next = 'Use pelo menos 8 caracteres.'
  else if (next === current) errors.next = 'Escolha uma senha diferente da atual.'
  if (!confirmation || next !== confirmation) errors.confirmation = 'As senhas não coincidem.'
  return errors
}
export function createAccountPreview({ storage, now = () => Date.now() } = {}) {
  let users = seeds.map(user => ({ ...user }))
  let session = null
  try {
    const saved = JSON.parse(storage?.getItem(USERS_KEY) || 'null')
    if (Array.isArray(saved) && saved.length && saved.every(u => u.id && typeof u.active === 'boolean' && !Object.keys(validateUser(u)).length) && saved.some(u => u.active && u.role === 'ADMINISTRADOR')) users = saved
    session = JSON.parse(storage?.getItem(SESSION_KEY) || 'null')
  } catch { /* Corrupt/unavailable storage falls back to a clean preview. */ }
  const persistUsers = () => { try { storage?.setItem(USERS_KEY, JSON.stringify(users)) } catch {} }
  const logout = () => { session = null; try { storage?.removeItem(SESSION_KEY) } catch {} }
  function status() {
    if (!session) return { user: null, reason: null }
    const user = users.find(u => u.id === session.userId)
    const reason = !user?.active ? 'disabled' : !Number.isFinite(session.expiresAt) || session.expiresAt <= now() ? 'expired' : null
    if (reason) { logout(); return { user: null, reason } }
    return { user: { ...user }, reason: null }
  }
  function requireAdmin() {
    if (status().user?.role !== 'ADMINISTRADOR') throw Error('Somente administradores podem gerenciar usuários.')
  }
  function protect(user, changes) {
    if (user.id === status().user?.id && (changes.active === false || changes.role !== user.role)) throw Error('Você não pode desativar seu próprio acesso nem alterar seu próprio perfil por esta tela.')
    if (user.role === 'ADMINISTRADOR' && user.active && (changes.active === false || changes.role !== 'ADMINISTRADOR') && users.filter(u => u.active && u.role === 'ADMINISTRADOR').length === 1) throw Error('Mantenha pelo menos um administrador ativo.')
  }
  return {
    status, logout,
    login(email, password) {
      const user = users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase())
      if (!user || password !== PREVIEW_PASSWORD) throw Error('E-mail ou senha incorretos. Confira os dados e tente novamente.')
      if (!user.active) throw Error('Seu acesso está desativado. Entre em contato com o administrador.')
      session = { userId: user.id, expiresAt: now() + 8 * 60 * 60 * 1000 }
      try { storage?.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
      return { ...user }
    },
    list() { requireAdmin(); return users.map(user => ({ ...user })) },
    save(input, id = null) {
      requireAdmin()
      const errors = validateUser(input, users, id)
      if (Object.keys(errors).length) throw Object.assign(Error('Revise os campos destacados.'), { fields: errors })
      const existing = id ? users.find(u => u.id === id) : null
      if (id && !existing) throw Error('Usuário não encontrado. Atualize a listagem.')
      const changes = { name: input.name.trim(), email: input.email.trim().toLowerCase(), role: input.role, active: existing?.active ?? true }
      if (existing) protect(existing, changes)
      const user = { ...existing, ...changes, id: existing?.id || crypto.randomUUID(), createdAt: existing?.createdAt || new Date(now()).toISOString(), updatedAt: new Date(now()).toISOString() }
      users = existing ? users.map(u => u.id === id ? user : u) : [...users, user]
      persistUsers()
      return { ...user }
    },
    setActive(id, active) {
      requireAdmin()
      const user = users.find(u => u.id === id)
      if (!user) throw Error('Usuário não encontrado. Atualize a listagem.')
      protect(user, { ...user, active })
      users = users.map(u => u.id === id ? { ...u, active, updatedAt: new Date(now()).toISOString() } : u)
      persistUsers()
    },
    checkPassword(input) {
      if (!status().user) throw Error('Sua sessão expirou. Entre novamente.')
      if (Object.keys(validatePassword(input)).length) throw Error('Revise os campos destacados.')
      if (input.current !== PREVIEW_PASSWORD) throw Error('A senha atual não confere com a conta de demonstração.')
      // Passwords are deliberately not stored or changed by this UI provider.
    }
  }
}
