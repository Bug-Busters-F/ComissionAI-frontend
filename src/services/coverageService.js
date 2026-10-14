import { formatCompetenceCode, normalizeCompetence } from './competenceUtils'

const COVERAGE_KEYWORDS = [
  'tb_basecomiss',
  'taxa de comissão não encontrada',
  'taxa de comissao nao encontrada',
  'nenhuma taxa padrão foi encontrada',
  'nenhuma taxa padrao foi encontrada',
  'taxa padrão cadastrada em tb_basecomiss',
  'taxa padrao cadastrada em tb_basecomiss',
  'requer taxa base contratual'
]

const EXCLUDED_CADASTRAL_PATTERNS = [
  /venda sem vínculo com colaborador/i,
  /venda sem vinculo com colaborador/i,
  /matr[íi]cula ausente ou não efetivada/i,
  /matr[íi]cula ausente ou nao efetivada/i,
  /sem cargo vinculado/i,
  /anterior [àa] admiss/i,
  /posterior [àa] demiss/i,
  /venda sem marca vinculada/i,
  /valor da venda inválido/i,
  /valor da venda invalido/i,
  /conflito de regras/i
]

/**
 * Identifica se um motivo de impedimento retornado pelo backend
 * refere-se estritamente à falta de cobertura de taxa base (tb_basecomiss / tb_regra).
 */
export function isCoverageImpediment(motivo) {
  if (!motivo || typeof motivo !== 'string') return false

  const text = motivo.trim()
  if (!text) return false

  // Se for explicitamente um erro cadastral ou de vínculo RH, não é impedimento de cobertura de base
  for (const pattern of EXCLUDED_CADASTRAL_PATTERNS) {
    if (pattern.test(text)) {
      return false
    }
  }

  const lower = text.toLowerCase()
  return COVERAGE_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Extrai Marca, Cargo e Competência de uma mensagem de impedimento de cobertura.
 * Suporta os padrões do backend oficial (fallback e regras com ajuste).
 */
export function parseCoverageDetails(motivo, dataVenda = null, defaultCompetence = null) {
  let marca = 'Não informada'
  let cargo = 'Não informado'

  if (motivo && typeof motivo === 'string') {
    // Padrão 1: "(Marca: {marca}, Cargo: {cargo})" ou "Marca: {marca}, Cargo: {cargo}"
    const match1 = motivo.match(/Marca:\s*([^,\)]+),\s*Cargo:\s*([^,\)]+)/i)
    if (match1) {
      marca = match1[1].trim()
      cargo = match1[2].trim()
    } else {
      // Padrão 2: "Marca '{marca}' e Cargo '{cargo}'" ou 'Marca "{marca}" e Cargo "{cargo}"'
      const match2 = motivo.match(/Marca\s*['"“]([^'"”]+)['"”]\s*e\s*Cargo\s*['"“]([^'"”]+)['"”]/i)
      if (match2) {
        marca = match2[1].trim()
        cargo = match2[2].trim()
      } else {
        // Padrão 3: busca isolada caso venham separados
        const marcaMatch = motivo.match(/Marca[:\s]+['"]?([^,'"\)]+)['"]?/i)
        const cargoMatch = motivo.match(/Cargo[:\s]+['"]?([^,'"\)]+)['"]?/i)
        if (marcaMatch) marca = marcaMatch[1].trim()
        if (cargoMatch) cargo = cargoMatch[1].trim()
      }
    }
  }

  let competenciaKey = ''
  let competencia = 'Não informada'

  if (dataVenda && typeof dataVenda === 'string') {
    const rawKey = dataVenda.slice(0, 7)
    const norm = normalizeCompetence(rawKey)
    if (norm) {
      competenciaKey = norm
      competencia = formatCompetenceCode(norm)
    }
  }

  if (!competenciaKey && defaultCompetence) {
    const norm = normalizeCompetence(defaultCompetence)
    if (norm) {
      competenciaKey = norm
      competencia = formatCompetenceCode(norm)
    }
  }

  return {
    marca,
    cargo,
    competencia,
    competenciaKey
  }
}

/**
 * Agrupa vendas bloqueadas por falta de cobertura de base por chave única de (competencia, marca, cargo).
 */
export function groupCoverageImpediments(impedimentos = [], defaultCompetence = null) {
  if (!Array.isArray(impedimentos) || impedimentos.length === 0) {
    return []
  }

  const groupsMap = new Map()

  for (const item of impedimentos) {
    if (!item || !isCoverageImpediment(item.motivo)) {
      continue
    }

    const details = parseCoverageDetails(item.motivo, item.dataVenda, defaultCompetence)
    const key = `${details.competenciaKey || 'SEM_COMP'}_${details.marca.toUpperCase()}_${details.cargo.toUpperCase()}`

    let group = groupsMap.get(key)
    if (!group) {
      group = {
        key,
        marca: details.marca,
        cargo: details.cargo,
        competencia: details.competencia,
        competenciaKey: details.competenciaKey,
        totalVendas: 0,
        valorTotal: 0,
        documentoNecessario: 'Tabela de Comissões Base (COMISS)',
        mensagem: `Importe a tabela de comissões (COMISS) cobrindo a Marca "${details.marca}" e o Cargo "${details.cargo}" para a competência ${details.competencia}.`,
        vendas: []
      }
      groupsMap.set(key, group)
    }

    group.totalVendas += 1
    const valor = Number(item.valorVenda) || 0
    group.valorTotal = Math.round((group.valorTotal + valor) * 100) / 100
    if (item.idVenda) {
      group.vendas.push(item.idVenda)
    }
  }

  return Array.from(groupsMap.values()).sort((a, b) => b.totalVendas - a.totalVendas)
}

/**
 * Separa os impedimentos cadastrais (RH, matrícula, vigência, etc.) dos impedimentos de falta de base.
 */
export function filterCadastralImpediments(impedimentos = []) {
  if (!Array.isArray(impedimentos)) return []
  return impedimentos.filter((item) => item && !isCoverageImpediment(item.motivo))
}

/**
 * Validador de cobertura para o fluxo de simulação e proposta de campanhas.
 * Garante que projeções fictícias sejam bloqueadas caso não haja base contratual aplicável.
 */
export function checkProposalCoverage({ form = {}, interpretation = {}, catalogOrBases = null } = {}) {
  // 1. Verifica pendências retornadas pelo serviço de interpretação
  const pending = Array.isArray(interpretation?.pending) ? interpretation.pending : []
  const coveragePending = pending.filter((msg) =>
    /base|cobertura|tb_basecomiss|taxa\s+padr[aã]o|contratual|tabela de comiss/i.test(msg)
  )

  if (coveragePending.length > 0) {
    const marca = form?.descrMarca || form?.codMarca || 'Não informada'
    const cargo = form?.descriCargo || form?.codCargo || 'Não informado'
    return {
      isBlocked: true,
      canSimulate: false,
      reason: 'PENDING_INTERPRETATION',
      messages: coveragePending,
      missingBases: [{ marca, cargo }],
      mensagem: 'Simulação bloqueada: base contratual ausente ou pendente de validação para o público-alvo.'
    }
  }

  // 2. Se catálogo de bases ativas for fornecido, valida se o público da proposta existe no catálogo
  if (Array.isArray(catalogOrBases) && catalogOrBases.length > 0) {
    const targetMarca = String(form?.codMarca || form?.descrMarca || '').trim().toUpperCase()
    const targetCargo = String(form?.codCargo || form?.descriCargo || '').trim().toUpperCase()

    if (targetMarca || targetCargo) {
      const isCovered = catalogOrBases.some((base) => {
        const baseMarcaCod = String(base?.codMarca || '').trim().toUpperCase()
        const baseMarcaDescr = String(base?.descrMarca || '').trim().toUpperCase()
        const baseCargoCod = String(base?.codCargo || '').trim().toUpperCase()
        const baseCargoDescr = String(base?.descriCargo || '').trim().toUpperCase()

        const matchMarca = !targetMarca || targetMarca === baseMarcaCod || targetMarca === baseMarcaDescr
        const matchCargo = !targetCargo || targetCargo === baseCargoCod || targetCargo === baseCargoDescr

        return matchMarca && matchCargo
      })

      if (!isCovered) {
        const marca = form?.descrMarca || form?.codMarca || 'Não informada'
        const cargo = form?.descriCargo || form?.codCargo || 'Não informado'
        return {
          isBlocked: true,
          canSimulate: false,
          reason: 'MISSING_BASE_IN_CATALOG',
          messages: [
            `Nenhuma taxa contratual cadastrada em tb_basecomiss para Marca "${marca}" e Cargo "${cargo}".`
          ],
          missingBases: [{ marca, cargo }],
          mensagem: 'Simulação bloqueada: nenhuma base contratual cadastrada cobre a combinação de Marca e Cargo da campanha.'
        }
      }
    }
  }

  // 3. Suporte a flag de simulação sem base para testes controlados
  if (form?.simulacaoSemBase === true) {
    const marca = form?.descrMarca || form?.codMarca || 'Marca Teste'
    const cargo = form?.descriCargo || form?.codCargo || 'Cargo Teste'
    return {
      isBlocked: true,
      canSimulate: false,
      reason: 'TEST_NO_COVERAGE',
      messages: ['Base de comissão ausente configurada no cenário de teste.'],
      missingBases: [{ marca, cargo }],
      mensagem: 'Simulação bloqueada: base contratual ausente para o público da proposta.'
    }
  }

  return {
    isBlocked: false,
    canSimulate: true,
    messages: [],
    missingBases: [],
    mensagem: ''
  }
}
