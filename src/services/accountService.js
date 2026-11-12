import api from './api'
import { USER_ROLES } from './accountModel'
import { userFacingText } from './userFacingText'
export function accountError(error) {
  if (error?.code === 'ERR_CANCELED') return error
  const fields = Object.fromEntries((error?.response?.data?.validacoes || []).map(f => [{ nome: 'name', email: 'email', papel: 'role', senha: 'password', senhaAtual: 'current', novaSenha: 'next' }[f.campo] || f.campo, f.motivo]))
  return Object.assign(Error(userFacingText(error?.response?.data?.message || (!error?.response && error?.isAxiosError ? 'Não foi possível conectar ao sistema. Verifique a conexão e tente novamente.' : error?.message) || 'Não foi possível concluir a operação. Tente novamente.')), { fields, status: error?.response?.status, cause: error })
}
export function mapAccount(raw) {
  if (!raw?.id || typeof raw.nome !== 'string' || !raw.nome.trim() || typeof raw.email !== 'string' || !USER_ROLES.some(r => r.value === raw.papel) || typeof raw.ativo !== 'boolean' || !Array.isArray(raw.permissoes) || raw.permissoes.some(p => typeof p !== 'string')) throw Error('O sistema não confirmou os dados e as permissões da conta. Tente novamente.')
  return { id: raw.id, name: raw.nome, email: raw.email, role: raw.papel, roleName: raw.nomePerfil || USER_ROLES.find(r => r.value === raw.papel).label, permissions: [...raw.permissoes], active: raw.ativo }
}
export function createAccountService(client = api) {
  const call = async (method, path, body, config = {}) => {
    try { return (await client.request({ method, url: path, ...(body === undefined ? {} : { data: body }), ...config })).data }
    catch (e) { throw accountError(e) }
  }
  return {
    async login(email, password) {
      const raw = await call('POST', '/auth/login', { email: email.trim(), senha: password }, { authenticated: false, timeout: 30000 })
      const user = mapAccount(raw?.usuario)
      if (!user.active || raw.tipo !== 'Bearer' || typeof raw.token !== 'string' || !raw.token || !(Date.parse(raw.expiraEm) > Date.now())) throw Error('O sistema não confirmou uma sessão válida. Tente novamente.')
      return { user, token: raw.token, expiresAt: raw.expiraEm }
    },
    async me() { return mapAccount(await call('GET', '/auth/me', undefined, { timeout: 30000 })) },
    logout: () => call('POST', '/auth/logout', undefined, { timeout: 15000 }),
    async roles() {
      const raw = await call('GET', '/auth/perfis')
      if (!Array.isArray(raw) || raw.length !== 5 || new Set(raw.map(r => r.id)).size !== 5 || raw.some(r => !USER_ROLES.some(known => known.value === r.id) || typeof r.nome !== 'string' || !Array.isArray(r.permissoes))) throw Error('Não foi possível confirmar os perfis de acesso. Atualize a página.')
      return raw.map(r => ({ value: r.id, label: r.nome, description: USER_ROLES.find(known => known.value === r.id).description }))
    },
    async list() { const raw = await call('GET', '/usuarios'); if (!Array.isArray(raw)) throw Error('Não foi possível confirmar a lista de usuários.'); return raw.map(mapAccount) },
    async create(input) { return mapAccount(await call('POST', '/usuarios', { nome: input.name.trim(), email: input.email.trim(), senha: input.password, papel: input.role })) },
    async update(input, id) { return mapAccount(await call('PUT', `/usuarios/${encodeURIComponent(id)}`, { nome: input.name.trim(), email: input.email.trim() })) },
    async profile(role, id) { return mapAccount(await call('PATCH', `/usuarios/${encodeURIComponent(id)}/perfil`, { papel: role })) },
    async setActive(id, active) { return mapAccount(await call('PATCH', `/usuarios/${encodeURIComponent(id)}/ativo?ativo=${active}`)) },
    password: input => call('PATCH', '/auth/me/senha', { senhaAtual: input.current, novaSenha: input.next })
  }
}
