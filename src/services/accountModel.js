export const USER_ROLES = Object.freeze([
  { value: 'ADMINISTRADOR', label: 'Administrador', description: 'Gerencia usuários e acessa todas as áreas.' },
  { value: 'ANALISTA_NEGOCIOS', label: 'Analista de negócios', description: 'Prepara propostas e acompanha simulações.' },
  { value: 'ANALISTA_CODIGO', label: 'Analista de código', description: 'Confere o programa e sua revisão técnica.' },
  { value: 'GERENTE_VENDAS', label: 'Gerente de vendas', description: 'Revisa campanhas e acompanha bases e resultados.' },
  { value: 'AUDITOR', label: 'Auditor', description: 'Consulta informações e históricos para auditoria.' }
])
export const roleLabel = role => USER_ROLES.find(item => item.value === role)?.label || 'Perfil não informado'
export const initials = name => String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
export function validateUser(input, users = [], id = null) {
  const errors = {}
  if (!String(input.name || '').trim()) errors.name = 'Informe o nome completo.'
  else if (input.name.trim().length > 120) errors.name = 'Use até 120 caracteres.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email || '').trim())) errors.email = 'Informe um e-mail válido.'
  else if (String(input.email).length > 150) errors.email = 'Use até 150 caracteres.'
  else if (users.some(u => u.id !== id && u.email.toLowerCase() === input.email.trim().toLowerCase())) errors.email = 'Este e-mail já está em uso.'
  if (!USER_ROLES.some(role => role.value === input.role)) errors.role = 'Selecione um dos cinco perfis disponíveis.'
  if (!id && (!input.password || input.password.length < 8 || new TextEncoder().encode(input.password).length > 72)) errors.password = 'Use uma senha inicial com pelo menos 8 caracteres e até 72 bytes.'
  return errors
}
export function validatePassword({ current, next, confirmation }) {
  const errors = {}
  if (!current) errors.current = 'Informe sua senha atual.'
  if (!next || next.length < 8 || new TextEncoder().encode(next).length > 72) errors.next = 'Use pelo menos 8 caracteres e até 72 bytes.'
  else if (next === current) errors.next = 'Escolha uma senha diferente da atual.'
  if (!confirmation || next !== confirmation) errors.confirmation = 'As senhas não coincidem.'
  return errors
}
