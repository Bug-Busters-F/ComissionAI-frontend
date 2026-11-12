import { describe, expect, it, vi } from 'vitest'
import { createAccountService, mapAccount } from './accountService'
import { USER_ROLES, validateUser, validatePassword } from './accountModel'
const raw = () => ({ id: 'uuid', nome: 'Ana', email: 'ana@empresa.com', papel: 'ADMINISTRADOR', nomePerfil: 'Administrador', permissoes: ['ACESSO_COMPLETO'], ativo: true })
const setup = data => { const request = vi.fn().mockResolvedValue({ data }); return { request, api: createAccountService({ request }) } }
describe('account HTTP contract', () => {
  it('logs in with Portuguese fields and accepts only identity returned by the server', async () => {
    const s = setup({ token: 'opaque', tipo: 'Bearer', expiraEm: new Date(Date.now() + 60000).toISOString(), usuario: raw() })
    const result = await s.api.login(' ana@empresa.com ', 'password')
    expect(result.user.name).toBe('Ana'); expect(result.user.role).toBe('ADMINISTRADOR')
    expect(s.request.mock.calls[0][0]).toMatchObject({ url: '/auth/login', authenticated: false, data: { email: 'ana@empresa.com', senha: 'password' } })
  })
  it('rejects malformed identity, unknown roles and inactive login', async () => {
    expect(() => mapAccount({ ...raw(), papel: 'USUARIO' })).toThrow()
    expect(() => mapAccount({ ...raw(), permissoes: undefined })).toThrow()
    const s = setup({ token: 't', tipo: 'Bearer', expiraEm: new Date(Date.now() + 60000).toISOString(), usuario: { ...raw(), ativo: false } })
    await expect(s.api.login('ana@empresa.com', 'pw')).rejects.toThrow('sessão válida')
  })
  it('creates, edits and changes role through separate real operations', async () => {
    const s = setup(raw()), input = { name: 'Ana', email: 'ana@empresa.com', password: 'Inicial@123', role: 'ADMINISTRADOR' }
    await s.api.create(input); expect(s.request.mock.calls[0][0]).toMatchObject({ method: 'POST', url: '/usuarios', data: { nome: 'Ana', email: input.email, senha: input.password, papel: input.role } })
    await s.api.update(input, 'uuid'); expect(s.request.mock.calls[1][0].data).toEqual({ nome: 'Ana', email: input.email })
    await s.api.profile(input.role, 'uuid'); expect(s.request.mock.calls[2][0]).toMatchObject({ method: 'PATCH', url: '/usuarios/uuid/perfil', data: { papel: input.role } })
  })
  it('maps field errors and never produces mock success on rejection', async () => {
    const request = vi.fn().mockRejectedValue({ response: { status: 409, data: { message: 'E-mail já cadastrado.', validacoes: [{ campo: 'email', motivo: 'Duplicado' }] } } })
    const api = createAccountService({ request })
    await expect(api.create({ name: 'Ana', email: 'ana@empresa.com', role: 'AUDITOR' })).rejects.toMatchObject({ status: 409, fields: { email: 'Duplicado' } })
  })
  it('requires exactly the five official profiles', async () => {
    const s = setup(USER_ROLES.map(r => ({ id: r.value, nome: r.label, permissoes: [] })))
    expect((await s.api.roles()).map(r => r.value)).toEqual(USER_ROLES.map(r => r.value))
    s.request.mockResolvedValue({ data: [{ id: 'ADMIN', nome: 'Admin' }] }); await expect(s.api.roles()).rejects.toThrow('perfis')
  })
  it('sends only current/new password and validates initial password locally', async () => {
    const s = setup(null); await s.api.password({ current: 'old', next: 'new', confirmation: 'never-sent' })
    expect(s.request.mock.calls[0][0]).toMatchObject({ url: '/auth/me/senha', data: { senhaAtual: 'old', novaSenha: 'new' } })
    expect(validateUser({ name: 'Ana', email: 'ana@empresa.com', role: 'AUDITOR' }).password).toBeTruthy()
    expect(validateUser({ name: 'Ana', email: 'ana@empresa.com', role: 'AUDITOR' }, [], 'existing').password).toBeUndefined()
    expect(validatePassword({ current: 'old', next: 'á'.repeat(40), confirmation: 'á'.repeat(40) }).next).toBeTruthy()
  })
})
