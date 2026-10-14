import { describe, expect, it } from 'vitest'
import {
  checkProposalCoverage,
  filterCadastralImpediments,
  groupCoverageImpediments,
  isCoverageImpediment,
  parseCoverageDetails
} from './coverageService'

describe('coverageService', () => {
  describe('isCoverageImpediment', () => {
    it('identifica mensagem oficial de fallback por falta de taxa em tb_basecomiss', () => {
      const msg = 'Taxa de comissão não encontrada: nenhuma regra ativa aplicável em tb_regra nem taxa padrão cadastrada em tb_basecomiss (Marca: PRETO, Cargo: VENDEDOR LOJA) para a venda'
      expect(isCoverageImpediment(msg)).toBe(true)
    })

    it('identifica mensagem de regra avançada com ajuste percentual sobre base ausente', () => {
      const msg = "Impedimento de cálculo: a regra ID 10 ('Campanha') requer taxa base contratual para o ajuste (ACRESCIMO_PONTOS), mas nenhuma taxa padrão foi encontrada em tb_basecomiss para Marca 'AZUL' e Cargo 'GERENTE' na competência."
      expect(isCoverageImpediment(msg)).toBe(true)
    })

    it('não considera impedimentos cadastrais ou de RH como falta de base', () => {
      expect(isCoverageImpediment('Venda sem vínculo com colaborador (matrícula ausente ou não efetivada)')).toBe(false)
      expect(isCoverageImpediment("Colaborador de matrícula 'MATRIC-001' sem cargo vinculado")).toBe(false)
      expect(isCoverageImpediment('Data da venda (2026-09-15) é anterior à admissão do colaborador (2026-10-01)')).toBe(false)
      expect(isCoverageImpediment('Data da venda (2026-09-15) é posterior à demissão do colaborador (2026-09-01)')).toBe(false)
      expect(isCoverageImpediment('Venda sem marca vinculada')).toBe(false)
      expect(isCoverageImpediment('Valor da venda inválido: deve ser estritamente positivo')).toBe(false)
      expect(isCoverageImpediment('Conflito de regras: múltiplas regras ativas concorrentes encontradas com o mesmo nível de especificidade')).toBe(false)
    })

    it('retorna false para valores nulos, vazios ou indefinidos', () => {
      expect(isCoverageImpediment(null)).toBe(false)
      expect(isCoverageImpediment(undefined)).toBe(false)
      expect(isCoverageImpediment('')).toBe(false)
      expect(isCoverageImpediment('   ')).toBe(false)
    })
  })

  describe('parseCoverageDetails', () => {
    it('extrai marca, cargo e competência do padrão "(Marca: X, Cargo: Y)"', () => {
      const msg = 'Taxa de comissão não encontrada: nenhuma regra ativa aplicável em tb_regra nem taxa padrão cadastrada em tb_basecomiss (Marca: PRETO, Cargo: VENDEDOR LOJA) para a venda'
      const details = parseCoverageDetails(msg, '2026-09-15T10:00:00')

      expect(details).toEqual({
        marca: 'PRETO',
        cargo: 'VENDEDOR LOJA',
        competencia: '09/2026',
        competenciaKey: '2026-09'
      })
    })

    it("extrai marca e cargo do padrão com aspas 'Marca X e Cargo Y'", () => {
      const msg = "requer taxa base contratual mas nenhuma taxa padrão foi encontrada em tb_basecomiss para Marca '10' e Cargo '100' na competência."
      const details = parseCoverageDetails(msg, '2026-08-01')

      expect(details).toEqual({
        marca: '10',
        cargo: '100',
        competencia: '08/2026',
        competenciaKey: '2026-08'
      })
    })

    it('usa competência default caso a data da venda não esteja disponível', () => {
      const msg = 'Taxa de comissão não encontrada em tb_basecomiss (Marca: VERMELHO, Cargo: OPERADOR)'
      const details = parseCoverageDetails(msg, null, '2026-07')

      expect(details.competencia).toBe('07/2026')
      expect(details.competenciaKey).toBe('2026-07')
      expect(details.marca).toBe('VERMELHO')
      expect(details.cargo).toBe('OPERADOR')
    })
  })

  describe('groupCoverageImpediments', () => {
    it('agrupa vendas pela combinação única de competência, marca e cargo somando valores e volumes', () => {
      const impedimentos = [
        {
          idVenda: 'v1',
          matricula: 'M1',
          dataVenda: '2026-09-10',
          valorVenda: 1000,
          motivo: 'Taxa de comissão não encontrada: nenhuma regra ativa aplicável em tb_regra nem taxa padrão cadastrada em tb_basecomiss (Marca: PRETO, Cargo: VENDEDOR LOJA) para a venda'
        },
        {
          idVenda: 'v2',
          matricula: 'M2',
          dataVenda: '2026-09-15',
          valorVenda: 2500,
          motivo: 'Taxa de comissão não encontrada: nenhuma regra ativa aplicável em tb_regra nem taxa padrão cadastrada em tb_basecomiss (Marca: PRETO, Cargo: VENDEDOR LOJA) para a venda'
        },
        {
          idVenda: 'v3',
          matricula: 'M3',
          dataVenda: '2026-09-12',
          valorVenda: 500,
          motivo: 'Taxa de comissão não encontrada: nenhuma regra ativa aplicável em tb_regra nem taxa padrão cadastrada em tb_basecomiss (Marca: AZUL, Cargo: GERENTE) para a venda'
        },
        {
          idVenda: 'v4',
          matricula: 'M4',
          dataVenda: '2026-09-14',
          valorVenda: 800,
          motivo: 'Venda sem vínculo com colaborador (matrícula ausente ou não efetivada)'
        }
      ]

      const groups = groupCoverageImpediments(impedimentos, '2026-09')

      expect(groups).toHaveLength(2)

      const groupPreto = groups.find((g) => g.marca === 'PRETO' && g.cargo === 'VENDEDOR LOJA')
      expect(groupPreto).toBeDefined()
      expect(groupPreto.totalVendas).toBe(2)
      expect(groupPreto.valorTotal).toBe(3500)
      expect(groupPreto.competencia).toBe('09/2026')
      expect(groupPreto.documentoNecessario).toBe('Tabela de Comissões Base (COMISS)')
      expect(groupPreto.vendas).toEqual(['v1', 'v2'])

      const groupAzul = groups.find((g) => g.marca === 'AZUL' && g.cargo === 'GERENTE')
      expect(groupAzul).toBeDefined()
      expect(groupAzul.totalVendas).toBe(1)
      expect(groupAzul.valorTotal).toBe(500)
    })
  })

  describe('filterCadastralImpediments', () => {
    it('retorna apenas os impedimentos cadastrais/RH', () => {
      const items = [
        { idVenda: '1', motivo: 'Taxa padrão cadastrada em tb_basecomiss não encontrada' },
        { idVenda: '2', motivo: 'Venda sem vínculo com colaborador' },
        { idVenda: '3', motivo: "Colaborador sem cargo vinculado" }
      ]

      const cadastrais = filterCadastralImpediments(items)
      expect(cadastrais).toHaveLength(2)
      expect(cadastrais.map((i) => i.idVenda)).toEqual(['2', '3'])
    })
  })

  describe('checkProposalCoverage', () => {
    it('detecta pendência de base originada na interpretação NLP', () => {
      const result = checkProposalCoverage({
        form: { descrMarca: 'PRETO', descriCargo: 'VENDEDOR' },
        interpretation: {
          pending: ['Sem base aplicável cadastrada em tb_basecomiss para este público.']
        }
      })

      expect(result.isBlocked).toBe(true)
      expect(result.canSimulate).toBe(false)
      expect(result.reason).toBe('PENDING_INTERPRETATION')
      expect(result.missingBases).toEqual([{ marca: 'PRETO', cargo: 'VENDEDOR' }])
    })

    it('detecta ausência quando catálogo de bases é fornecido e não contém a combinação', () => {
      const catalog = [
        { codMarca: '10', descrMarca: 'PRETO', codCargo: '100', descriCargo: 'VENDEDOR' }
      ]

      const result = checkProposalCoverage({
        form: { codMarca: '20', descrMarca: 'BRANCO', codCargo: '200', descriCargo: 'GERENTE' },
        catalogOrBases: catalog
      })

      expect(result.isBlocked).toBe(true)
      expect(result.canSimulate).toBe(false)
      expect(result.reason).toBe('MISSING_BASE_IN_CATALOG')
    })

    it('permite simulação quando a combinação existe no catálogo', () => {
      const catalog = [
        { codMarca: '10', descrMarca: 'PRETO', codCargo: '100', descriCargo: 'VENDEDOR' }
      ]

      const result = checkProposalCoverage({
        form: { codMarca: '10', codCargo: '100' },
        catalogOrBases: catalog
      })

      expect(result.isBlocked).toBe(false)
      expect(result.canSimulate).toBe(true)
    })

    it('permite simulação sem catálogo quando não há pendências de base', () => {
      const result = checkProposalCoverage({
        form: { titulo: 'Campanha de Natal' },
        interpretation: { pending: ['Outra pendência informativa sem relação com taxa'] }
      })

      expect(result.isBlocked).toBe(false)
      expect(result.canSimulate).toBe(true)
    })
  })
})
