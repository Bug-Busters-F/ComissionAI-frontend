import { describe, it, expect } from 'vitest'
import { userFacingText } from './userFacingText'
describe('mensagens compreensíveis sem alterar as evidências', () => {
  it.each(['Request failed with status code 500', 'AxiosError: Internal Server Error', 'JDBC SQLState 23505'])('traduz falhas internas: %s', raw => {
    expect(userFacingText(raw)).toContain('Não foi possível concluir')
    expect(userFacingText(raw)).not.toContain(raw)
  })
  it('orienta nova interpretação para consultas não concluídas', () => {
    expect(userFacingText("A consulta consultar_regras_concorrentes(dataInicio='2026-01-01') não foi feita")).toContain('Tente interpretar novamente')
    expect(userFacingText('rate_limit_exceeded 429')).toContain('limite de uso')
  })
  it('mantém o motivo de negócio e traduz nomes dos controles', () => {
    expect(userFacingText('filtros.codLoja: valor inválido')).toBe('Loja: valor inválido')
    expect(userFacingText('condicaoValor.valorMinimo: obrigatório')).toBe('Valor mínimo: obrigatório')
    expect(userFacingText('429')).toBe('429')
    expect(userFacingText('consultar_taxa_base')).toBe('consultar_taxa_base')
    const overlap = 'Esta regra se sobrepõe a outra do mesmo público. Revise os limites ou o público.'
    expect(userFacingText(overlap)).toBe(overlap)
  })
  it('distingue revisão do programa de atualização da simulação', () => {
    expect(userFacingText('Checksum SHA256 do programa diferente')).toContain('Atualize a revisão')
    expect(userFacingText('snapshot da simulação desatualizado')).toContain('nova simulação')
  })
})
