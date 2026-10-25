import api from './api'
import {
  ASYNC_EXECUTION_STATES,
  clearExecutionRecord,
  generateExecutionId,
  loadExecutionRecord,
  pollAsyncExecution,
  saveExecutionRecord
} from './asyncExecutionService'
import { buildCampaignRulesPayload, formatCampaignChannel, formatDate, percentToDecimal } from './campaignMappers'
import { formatCompetenceCode, formatCompetenceLabel, getCompetenceDateRange, groupSalesByCompetence, normalizeCompetence } from './competenceUtils'
import { checkProposalCoverage } from './coverageService'
import { dataService } from './dataService'

export const COMMERCIAL_MONTH_DAYS = 30

export const SIMULATION_SCENARIO_FACTORS = [
  { key: '80', factor: 0.8, percentage: '80%', label: 'Cenário de retração (80%)', classification: 'Retração (-20%)' },
  { key: '100', factor: 1.0, percentage: '100%', label: 'Referência histórica (100%)', classification: 'Referência base (100%)' },
  { key: '120', factor: 1.2, percentage: '120%', label: 'Cenário de crescimento (120%)', classification: 'Crescimento (+20%)' },
  { key: '150', factor: 1.5, percentage: '150%', label: 'Cenário de alta tração (150%)', classification: 'Expansão (+50%)' }
]

const FALLBACK_REFERENCE_COMPETENCES = [
  {
    competencia: '2026-04',
    label: 'Abril de 2026',
    origemDados: 'Base oficial cadastrada em Dados (Vendas + RH + Base Contratual tb_basecomiss)',
    totalVendas: 6
  },
  {
    competencia: '2026-03',
    label: 'Março de 2026',
    origemDados: 'Base oficial cadastrada em Dados (Vendas + RH + Base Contratual tb_basecomiss)',
    totalVendas: 4
  },
  {
    competencia: '2026-02',
    label: 'Fevereiro de 2026',
    origemDados: 'Base oficial cadastrada em Dados (Vendas + RH + Base Contratual tb_basecomiss)',
    totalVendas: 2
  }
]

const FALLBACK_REFERENCE_SALES = [
  { id: 'V-202604-01', competencia: '2026-04', dataVenda: '2026-04-03', matricula: '10421', colaborador: 'Ana Carolina Souza', codLoja: 12, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 14500.0, canal: 'LOJA_FISICA' },
  { id: 'V-202604-02', competencia: '2026-04', dataVenda: '2026-04-07', matricula: '10422', colaborador: 'Bruno Henrique Lima', codLoja: 12, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 9200.0, canal: 'LOJA_FISICA' },
  { id: 'V-202604-03', competencia: '2026-04', dataVenda: '2026-04-11', matricula: '10489', colaborador: 'Carla Mendes', codLoja: 18, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 18400.0, canal: 'ONLINE' },
  { id: 'V-202604-04', competencia: '2026-04', dataVenda: '2026-04-15', matricula: '10510', colaborador: 'Diego Alves', codLoja: 18, codMarca: 10, descrMarca: 'Aurora', codCargo: 102, descriCargo: 'Consultor', valorVenda: 22100.0, canal: 'LOJA_FISICA' },
  { id: 'V-202604-05', competencia: '2026-04', dataVenda: '2026-04-19', matricula: '10601', colaborador: 'Eduarda Rocha', codLoja: 25, codMarca: 20, descrMarca: 'Vértice', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 11800.0, canal: 'LOJA_FISICA' },
  { id: 'V-202604-06', competencia: '2026-04', dataVenda: '2026-04-24', matricula: '10640', colaborador: 'Felipe Martins', codLoja: 25, codMarca: 20, descrMarca: 'Vértice', codCargo: 102, descriCargo: 'Consultor', valorVenda: 16300.0, canal: 'ONLINE' },
  { id: 'V-202603-01', competencia: '2026-03', dataVenda: '2026-03-05', matricula: '10421', colaborador: 'Ana Carolina Souza', codLoja: 12, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 13200.0, canal: 'LOJA_FISICA' },
  { id: 'V-202603-02', competencia: '2026-03', dataVenda: '2026-03-12', matricula: '10422', colaborador: 'Bruno Henrique Lima', codLoja: 12, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 10800.0, canal: 'LOJA_FISICA' },
  { id: 'V-202603-03', competencia: '2026-03', dataVenda: '2026-03-18', matricula: '10489', colaborador: 'Carla Mendes', codLoja: 18, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 15900.0, canal: 'ONLINE' },
  { id: 'V-202603-04', competencia: '2026-03', dataVenda: '2026-03-25', matricula: '10601', colaborador: 'Eduarda Rocha', codLoja: 25, codMarca: 20, descrMarca: 'Vértice', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 12400.0, canal: 'LOJA_FISICA' },
  { id: 'V-202602-01', competencia: '2026-02', dataVenda: '2026-02-10', matricula: '10601', colaborador: 'Eduarda Rocha', codLoja: 25, codMarca: 20, descrMarca: 'Vértice', codCargo: 101, descriCargo: 'Vendedor', valorVenda: 11000.0, canal: 'LOJA_FISICA' },
  { id: 'V-202602-02', competencia: '2026-02', dataVenda: '2026-02-18', matricula: '10640', colaborador: 'Felipe Martins', codLoja: 25, codMarca: 20, descrMarca: 'Vértice', codCargo: 102, descriCargo: 'Consultor', valorVenda: 14900.0, canal: 'ONLINE' }
]

const FALLBACK_BASE_COMISS = [
  { id: 1, codMarca: 10, descrMarca: 'Aurora', codCargo: 101, descriCargo: 'Vendedor', pctComiss: 2.5, origem: 'tb_basecomiss (importação oficial)', competencia: '2026-04' },
  { id: 2, codMarca: 10, descrMarca: 'Aurora', codCargo: 102, descriCargo: 'Consultor', pctComiss: 3.0, origem: 'tb_basecomiss (importação oficial)', competencia: '2026-04' },
  { id: 3, codMarca: 20, descrMarca: 'Vértice', codCargo: 101, descriCargo: 'Vendedor', pctComiss: 2.0, origem: 'tb_basecomiss (importação oficial)', competencia: '2026-04' },
  { id: 4, codMarca: 20, descrMarca: 'Vértice', codCargo: 102, descriCargo: 'Consultor', pctComiss: 2.8, origem: 'tb_basecomiss (importação oficial)', competencia: '2026-04' }
]

/**
 * Arredondamento financeiro padrão (HALF_UP para 2 casas decimais),
 * espelhando BigDecimal.setScale(2, RoundingMode.HALF_UP) do backend.
 */
export function roundHalfUp(value, decimals = 2) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  const factor = 10 ** decimals
  const sign = num < 0 ? -1 : 1
  return (sign * Math.floor(Math.abs(num) * factor + 0.5 + 1e-12)) / factor
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function normalizeNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const numeric = Number(String(value).replace(',', '.'))
  return Number.isFinite(numeric) ? numeric : null
}

function normalizeDecimalRateToPct(value) {
  const num = normalizeNumber(value)
  if (num === null) return null
  return num <= 1 && num > 0 ? roundHalfUp(num * 100, 4) : roundHalfUp(num, 4)
}

/**
 * Calcula a duração da campanha em dias corridos (inclusivo) e o fator de projeção
 * sobre o mês comercial de 30 dias (sem arredondamento antecipado do fator).
 */
export function calculateCampaignDuration(dataInicio, dataFim) {
  const startStr = String(dataInicio || '').trim()
  const endStr = String(dataFim || '').trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(startStr) && /^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    const [sy, sm, sd] = startStr.split('-').map(Number)
    const [ey, em, ed] = endStr.split('-').map(Number)
    const startUtc = Date.UTC(sy, sm - 1, sd)
    const endUtc = Date.UTC(ey, em - 1, ed)

    if (endUtc >= startUtc) {
      const dias = Math.round((endUtc - startUtc) / 86400000) + 1
      const fatorDuracao = dias / COMMERCIAL_MONTH_DAYS
      const fatorTexto = `${dias}/${COMMERCIAL_MONTH_DAYS} dias (${fatorDuracao.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}x)`
      return {
        dataInicio: startStr,
        dataFim: endStr,
        dias,
        mesComercial: COMMERCIAL_MONTH_DAYS,
        mesComercialDias: COMMERCIAL_MONTH_DAYS,
        fator: fatorDuracao,
        fatorDuracao,
        fatorTexto,
        fatorFormatado: fatorTexto,
        periodoFormatado: `${formatDate(startStr)} até ${formatDate(endStr)} (${dias} ${dias === 1 ? 'dia corrido' : 'dias corridos'}, inclusive)`,
        isDefault: false,
        premissaDuracao: `Projeção calculada pela duração inclusiva de ${dias} dias sobre o mês comercial de ${COMMERCIAL_MONTH_DAYS} dias (fator ${dias}/${COMMERCIAL_MONTH_DAYS}).`
      }
    }
  }

  const defaultFatorTexto = `30/30 dias (1,0000x)`
  return {
    dataInicio: startStr || null,
    dataFim: endStr || null,
    dias: COMMERCIAL_MONTH_DAYS,
    mesComercial: COMMERCIAL_MONTH_DAYS,
    mesComercialDias: COMMERCIAL_MONTH_DAYS,
    fator: 1,
    fatorDuracao: 1,
    fatorTexto: defaultFatorTexto,
    fatorFormatado: defaultFatorTexto,
    periodoFormatado: startStr ? `A partir de ${formatDate(startStr)} (padrão de 30 dias)` : 'Vigência padrão de 30 dias corridos',
    isDefault: true,
    premissaDuracao: `Projeção calculada para o ciclo padrão de ${COMMERCIAL_MONTH_DAYS} dias sobre o mês comercial de ${COMMERCIAL_MONTH_DAYS} dias (fator 30/30 = 1).`
  }
}

/**
 * Extrai e normaliza as regras da proposta a partir do form (suportando múltiplas regras e condições de faixa).
 */
export function extractCampaignRules(form = {}) {
  const defaultRatePct = normalizeDecimalRateToPct(percentToDecimal(form.taxaPercentual) ?? form.taxaPercentual) ?? 0
  const rawRegras = Array.isArray(form.regras) && form.regras.length > 0
    ? form.regras
    : [
        {
          ordem: 1,
          nomeRegra: form.titulo ? `Regra principal (${form.titulo})` : 'Regra principal da campanha',
          codMarca: form.codMarca,
          descrMarca: form.descrMarca,
          codLoja: form.codLoja,
          codCargo: form.codCargo,
          descriCargo: form.descriCargo,
          matricula: form.matricula,
          canal: form.canal && form.canal !== 'TODOS' ? form.canal : null,
          taxaPadrao: percentToDecimal(form.taxaPercentual) ?? (defaultRatePct / 100),
          condicoes: Array.isArray(form.condicoes) ? form.condicoes : []
        }
      ]

  return rawRegras.map((regra, idx) => {
    const ratePct =
      normalizeDecimalRateToPct(regra.taxaPadrao ?? regra.taxa ?? regra.taxaPercentual) ?? defaultRatePct
    const condicoes = Array.isArray(regra.condicoes) ? [...regra.condicoes] : []

    if (
      condicoes.length === 0 &&
      (regra.valorMinimo !== undefined && regra.valorMinimo !== null && regra.valorMinimo !== '' ||
        regra.valorMaximo !== undefined && regra.valorMaximo !== null && regra.valorMaximo !== '')
    ) {
      condicoes.push({
        ordem: 1,
        campo: 'VALOR_VENDA',
        operador: regra.valorMaximo != null && regra.valorMaximo !== '' ? 'BETWEEN' : (regra.minInclusivo === false ? 'GT' : 'GTE'),
        valorMinimo: normalizeNumber(regra.valorMinimo),
        valorMaximo: normalizeNumber(regra.valorMaximo),
        taxa: ratePct / 100
      })
    }

    return {
      id: `R-${idx + 1}`,
      ordem: Number(regra.ordem ?? idx + 1),
      nomeRegra: regra.nomeRegra || regra.nome || `Regra #${idx + 1}`,
      codMarca: normalizeNumber(regra.codMarca ?? form.codMarca),
      descrMarca: String(regra.descrMarca ?? form.descrMarca ?? '').trim(),
      codLoja: normalizeNumber(regra.codLoja ?? form.codLoja),
      codCargo: normalizeNumber(regra.codCargo ?? form.codCargo),
      descriCargo: String(regra.descriCargo ?? form.descriCargo ?? '').trim(),
      matricula: String(regra.matricula ?? form.matricula ?? '').trim(),
      canal:
        regra.canal && regra.canal !== 'TODOS' && regra.canal !== 'PADRAO'
          ? String(regra.canal).trim()
          : form.canal && form.canal !== 'TODOS' && form.canal !== 'PADRAO'
            ? String(form.canal).trim()
            : '',
      tipoOperacao: regra.tipoOperacao || 'DEFINIR_TAXA',
      valorAjuste: normalizeNumber(regra.valorAjuste),
      taxaPadraoPct: ratePct,
      bonusPercentualPct: normalizeDecimalRateToPct(regra.bonusPercentual) ?? 0,
      bonusValorFixo: roundHalfUp(normalizeNumber(regra.bonusValorFixo) ?? 0),
      condicoes: condicoes.map((cond, cIdx) => ({
        ordem: Number(cond.ordem ?? cIdx + 1),
        campo: cond.campo || 'VALOR_VENDA',
        operador: String(cond.operador || 'GTE').toUpperCase(),
        valorMinimo: normalizeNumber(cond.valorMinimo),
        valorMaximo: normalizeNumber(cond.valorMaximo),
        taxaPct: normalizeDecimalRateToPct(cond.taxa ?? cond.taxaPercentual) ?? ratePct
      }))
    }
  })
}

export function computeRuleSpecificity(rule = {}) {
  let filterCount = 0
  if (rule.codMarca !== null && rule.codMarca !== undefined || rule.descrMarca) filterCount += 1
  if (rule.codLoja !== null && rule.codLoja !== undefined) filterCount += 1
  if (rule.codCargo !== null && rule.codCargo !== undefined || rule.descriCargo) filterCount += 1
  if (rule.matricula) filterCount += 1
  if (rule.canal && rule.canal !== 'TODOS' && rule.canal !== 'PADRAO') filterCount += 1
  return filterCount
}

export function doesSaleMatchRuleAudience(sale = {}, rule = {}) {
  if (rule.codMarca !== null && rule.codMarca !== undefined && sale.codMarca !== null && sale.codMarca !== undefined) {
    if (Number(rule.codMarca) !== Number(sale.codMarca)) return false
  } else if (rule.descrMarca) {
    if (normalizeText(rule.descrMarca) !== normalizeText(sale.descrMarca)) return false
  }

  if (rule.codLoja !== null && rule.codLoja !== undefined) {
    if (Number(rule.codLoja) !== Number(sale.codLoja)) return false
  }

  if (rule.codCargo !== null && rule.codCargo !== undefined && sale.codCargo !== null && sale.codCargo !== undefined) {
    if (Number(rule.codCargo) !== Number(sale.codCargo)) return false
  } else if (rule.descriCargo) {
    const rCargo = normalizeText(rule.descriCargo)
    const sCargo = normalizeText(sale.descriCargo)
    if (!sCargo || (!sCargo.includes(rCargo) && !rCargo.includes(sCargo))) return false
  }

  if (rule.matricula) {
    if (normalizeText(rule.matricula) !== normalizeText(sale.matricula)) return false
  }

  if (rule.canal && rule.canal !== 'TODOS' && rule.canal !== 'PADRAO') {
    if (normalizeText(rule.canal) !== normalizeText(sale.canal || 'LOJA_FISICA')) return false
  }

  return true
}

export function evaluateRuleValueConditions(rule = {}, saleValue = 0) {
  const val = Number(saleValue || 0)
  const condicoes = Array.isArray(rule.condicoes) ? rule.condicoes : []

  if (!condicoes.length) {
    return {
      satisfied: true,
      ratePct: rule.taxaPadraoPct,
      conditionDescription: 'Sem restrição de faixa de valor (aplica-se a qualquer valor positivo da venda)'
    }
  }

  for (const cond of condicoes) {
    const op = cond.operador
    const min = cond.valorMinimo
    const max = cond.valorMaximo

    if ((op === 'GTE' || op === 'MAIOR_OU_IGUAL' || op === '>=') && min !== null && val >= min) {
      return {
        satisfied: true,
        ratePct: cond.taxaPct,
        conditionDescription: `Valor da venda >= R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    }
    if ((op === 'GT' || op === 'MAIOR_QUE' || op === '>') && min !== null && val > min) {
      return {
        satisfied: true,
        ratePct: cond.taxaPct,
        conditionDescription: `Valor da venda > R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    }
    if ((op === 'LTE' || op === 'MENOR_OU_IGUAL' || op === '<=') && (max !== null ? val <= max : min !== null && val <= min)) {
      const limit = max ?? min
      return {
        satisfied: true,
        ratePct: cond.taxaPct,
        conditionDescription: `Valor da venda <= R$ ${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    }
    if ((op === 'LT' || op === 'MENOR_QUE' || op === '<') && (max !== null ? val < max : min !== null && val < min)) {
      const limit = max ?? min
      return {
        satisfied: true,
        ratePct: cond.taxaPct,
        conditionDescription: `Valor da venda < R$ ${limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    }
    if ((op === 'BETWEEN' || op === 'ENTRE') && min !== null && max !== null && val >= min && val <= max) {
      return {
        satisfied: true,
        ratePct: cond.taxaPct,
        conditionDescription: `Faixa R$ ${min.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a R$ ${max.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      }
    }
  }

  return {
    satisfied: false,
    ratePct: null,
    conditionDescription: 'Valor da venda fora da faixa configurada na regra (mantém comissão base contratual)'
  }
}

export function findBaseRateForSale(sale = {}, bases = []) {
  const sMarca = normalizeText(sale.descrMarca)
  const sCargo = normalizeText(sale.descriCargo)
  const sCodMarca = normalizeNumber(sale.codMarca)
  const sCodCargo = normalizeNumber(sale.codCargo)

  return (bases || []).find((base) => {
    const bMarca = normalizeText(base.descrMarca ?? base.marca)
    const bCargo = normalizeText(base.descriCargo ?? base.cargo)
    const bCodMarca = normalizeNumber(base.codMarca)
    const bCodCargo = normalizeNumber(base.codCargo)

    const brandMatches =
      (sCodMarca !== null && bCodMarca !== null && sCodMarca === bCodMarca) ||
      (sMarca && bMarca && sMarca === bMarca)
    const roleMatches =
      (sCodCargo !== null && bCodCargo !== null && sCodCargo === bCodCargo) ||
      (sCargo && bCargo && (sCargo === bCargo || sCargo.includes(bCargo) || bCargo.includes(sCargo)))

    return brandMatches && roleMatches
  }) || null
}

/**
 * Executa o recorte do público (união OU entre regras, E dentro da regra, sem duplicar vendas)
 * e valida vendas, vínculos de RH, cobertura de tb_basecomiss e empates de especificidade ([FRONT-4]).
 */
export function sliceAndValidatePublicLocally({ competencia, rules = [], sales = [], bases = [] }) {
  const compNorm = normalizeCompetence(competencia) || String(competencia || '').trim()

  const competenceSales = (sales || []).filter((s) => {
    const sComp = s.competencia || String(s.dataVenda || s.saleDate || '').slice(0, 7)
    return sComp === compNorm
  })

  const uniqueSalesById = new Map()
  const overlapWarnings = []
  const specificityTieErrors = []
  const rhImpediments = []
  const missingBaseMap = new Map()

  for (const rawSale of competenceSales) {
    const saleId = String(rawSale.id ?? rawSale.saleId ?? `${rawSale.matricula}-${rawSale.dataVenda}-${rawSale.valorVenda}`)
    if (uniqueSalesById.has(saleId)) continue

    const sale = {
      id: saleId,
      saleId,
      competencia: compNorm,
      dataVenda: rawSale.dataVenda || rawSale.saleDate || `${compNorm}-10`,
      matricula: String(rawSale.matricula ?? rawSale.registration?.registration ?? '').trim(),
      colaborador: rawSale.colaborador || rawSale.nomeColaborador || rawSale.registration?.name || '',
      codLoja: normalizeNumber(rawSale.codLoja ?? rawSale.store?.code) ?? 1,
      codMarca: normalizeNumber(rawSale.codMarca ?? rawSale.brand?.code),
      descrMarca: String(rawSale.descrMarca ?? rawSale.marca ?? rawSale.brand?.description ?? '').trim(),
      codCargo: normalizeNumber(rawSale.codCargo ?? rawSale.registration?.position?.code),
      descriCargo: String(rawSale.descriCargo ?? rawSale.cargo ?? rawSale.registration?.position?.description ?? '').trim(),
      valorVenda: roundHalfUp(rawSale.valorVenda ?? rawSale.value ?? 0),
      canal: String(rawSale.canal ?? rawSale.channel ?? 'LOJA_FISICA').trim()
    }

    const matchingRules = rules.filter((rule) => doesSaleMatchRuleAudience(sale, rule))
    if (matchingRules.length === 0) continue

    const scored = matchingRules
      .map((rule) => ({
        rule,
        specificity: computeRuleSpecificity(rule)
      }))
      .sort((a, b) => b.specificity - a.specificity)

    if (scored.length > 1) {
      if (scored[0].specificity === scored[1].specificity) {
        specificityTieErrors.push(
          `Conflito por empate de especificidade na venda ${saleId} (Matrícula ${sale.matricula}): "${scored[0].rule.nomeRegra}" e "${scored[1].rule.nomeRegra}" possuem o mesmo número de filtros (${scored[0].specificity}).`
        )
      } else {
        overlapWarnings.push(
          `Sobreposição resolvida na venda ${saleId} (Matrícula ${sale.matricula}): "${scored[0].rule.nomeRegra}" prevaleceu por maior especificidade (${scored[0].specificity} filtro(s) vs ${scored[1].specificity}).`
        )
      }
    }

    if (!sale.matricula || !sale.descriCargo) {
      rhImpediments.push(
        `Venda ${saleId} possui vínculo cadastral incompleto no RH (matrícula ou cargo ausente).`
      )
    }

    const matchedBase = findBaseRateForSale(sale, bases)
    if (!matchedBase) {
      const marcaLabel = sale.descrMarca || (sale.codMarca ? `Código ${sale.codMarca}` : 'Não informada')
      const cargoLabel = sale.descriCargo || (sale.codCargo ? `Código ${sale.codCargo}` : 'Não informado')
      const key = `${normalizeText(marcaLabel)}|${normalizeText(cargoLabel)}`
      if (!missingBaseMap.has(key)) {
        missingBaseMap.set(key, { marca: marcaLabel, cargo: cargoLabel })
      }
    }

    const baseRateVal = matchedBase
      ? normalizeDecimalRateToPct(matchedBase.pctComiss ?? matchedBase.taxaBase ?? matchedBase.percentual) ?? 0
      : null

    uniqueSalesById.set(saleId, {
      saleId,
      sale,
      winningRule: scored[0].rule,
      specificityScore: scored[0].specificity,
      overlappingRulesCount: scored.length,
      baseEntry: matchedBase
        ? {
            ...matchedBase,
            pctComiss: baseRateVal,
            origem: matchedBase.origem || `tb_basecomiss (${compNorm})`,
            competencia: matchedBase.competencia || compNorm
          }
        : null
    })
  }

  const slicedSales = Array.from(uniqueSalesById.values())
  const missingBases = Array.from(missingBaseMap.values())
  const impediments = []

  if (competenceSales.length === 0) {
    impediments.push({
      code: 'INSUFFICIENT_REFERENCE',
      severity: 'blocking',
      title: 'Referência insuficiente: competência sem vendas',
      message: `A competência ${compNorm} não possui vendas cadastradas para servir como base de simulação.`
    })
  } else if (slicedSales.length === 0) {
    impediments.push({
      code: 'INSUFFICIENT_REFERENCE',
      severity: 'blocking',
      title: 'Referência insuficiente para o público da campanha',
      message: `A competência ${compNorm} possui ${competenceSales.length} venda(s) no total, porém nenhuma venda atende aos filtros do público desta campanha. A ausência de vendas para o público não é exibida como R$ 0,00.`
    })
  }

  if (missingBases.length > 0) {
    impediments.push({
      code: 'MISSING_BASE_COVERAGE',
      severity: 'blocking',
      title: 'Ausência de cobertura na base de comissão (tb_basecomiss)',
      message: 'Existem vendas do público sem taxa base contratual cadastrada em tb_basecomiss. Importe ou atualize a base em Dados antes de simular.',
      missingBases
    })
  }

  if (rhImpediments.length > 0) {
    impediments.push({
      code: 'RH_LINK_ERROR',
      severity: 'blocking',
      title: 'Impedimento de vínculos cadastrais (RH)',
      message: rhImpediments[0],
      details: rhImpediments
    })
  }

  if (specificityTieErrors.length > 0) {
    impediments.push({
      code: 'RULE_SPECIFICITY_TIE',
      severity: 'blocking',
      title: 'Empate de especificidade entre regras sobrepostas',
      message: specificityTieErrors[0],
      details: specificityTieErrors
    })
  }

  const basesFingerprint = (bases || [])
    .map((b) => `${normalizeText(b.descrMarca ?? b.marca)}|${normalizeText(b.descriCargo ?? b.cargo)}:${b.pctComiss ?? b.taxaBase ?? b.percentual}`)
    .sort()
    .join(';')

  return {
    competencia: compNorm,
    origemDados: 'Base oficial cadastrada em Dados (Vendas + Vínculos de RH + Base Contratual tb_basecomiss)',
    totalVendasCompetencia: competenceSales.length,
    totalVendasRecortadas: slicedSales.length,
    canExecute: impediments.length === 0 && slicedSales.length > 0,
    isBlocked: impediments.length > 0 || slicedSales.length === 0,
    impediments,
    missingBases,
    overlapWarnings: Array.from(new Set(overlapWarnings)),
    slicedSales,
    basesFingerprint
  }
}

/**
 * Calcula a tabela detalhada, memória do cálculo por venda, totais históricos, projeções por dias/30
 * e cards de cenários (80%, 100%, 120%, 150%) recalculando faixa de valor venda a venda ([FRONT-5]).
 */
export function buildSimulationOutcome({
  simulationId,
  competencia,
  form = {},
  referenceValidation
}) {
  const duration = calculateCampaignDuration(form.dataInicio, form.dataFim)
  const slicedSales = referenceValidation?.slicedSales || []

  function evaluateSliceForMultiplier(multiplier = 1) {
    let totalSalesValue = 0
    let totalBaseCommission = 0
    let totalProposedCommission = 0
    let rangeSwitchesCount = 0

    const rows = slicedSales.map((item) => {
      const { sale, winningRule, specificityScore, baseEntry } = item
      const originalValue = roundHalfUp(sale.valorVenda)
      const simulatedValue = multiplier === 1 ? originalValue : roundHalfUp(originalValue * multiplier)
      const baseRatePct = roundHalfUp(baseEntry?.pctComiss ?? 0, 4)

      const condAt100 = evaluateRuleValueConditions(winningRule, originalValue)
      const condAtScenario = evaluateRuleValueConditions(winningRule, simulatedValue)

      if (multiplier !== 1 && condAt100.satisfied !== condAtScenario.satisfied) {
        rangeSwitchesCount += 1
      }

      const appliedRatePct = condAtScenario.satisfied
        ? roundHalfUp(condAtScenario.ratePct, 4)
        : baseRatePct

      const baseCommission = roundHalfUp((simulatedValue * baseRatePct) / 100)
      const baseProposed = roundHalfUp((simulatedValue * appliedRatePct) / 100)
      const bonusPctAmount =
        condAtScenario.satisfied && Number(winningRule.bonusPercentualPct) > 0
          ? roundHalfUp((simulatedValue * Number(winningRule.bonusPercentualPct)) / 100)
          : 0
      const bonusFixedAmount =
        condAtScenario.satisfied && Number(winningRule.bonusValorFixo) > 0
          ? roundHalfUp(Number(winningRule.bonusValorFixo))
          : 0
      const proposedCommission = roundHalfUp(baseProposed + bonusPctAmount + bonusFixedAmount)
      const difference = roundHalfUp(proposedCommission - baseCommission)

      totalSalesValue = roundHalfUp(totalSalesValue + simulatedValue)
      totalBaseCommission = roundHalfUp(totalBaseCommission + baseCommission)
      totalProposedCommission = roundHalfUp(totalProposedCommission + proposedCommission)

      const bonusFormulaSuffix = [
        bonusPctAmount > 0 ? `+ bônus ${Number(winningRule.bonusPercentualPct).toLocaleString('pt-BR')}% (R$ ${bonusPctAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : '',
        bonusFixedAmount > 0 ? `+ bônus fixo R$ ${bonusFixedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''
      ].filter(Boolean).join(' ')

      return {
        saleId: item.saleId,
        dataVenda: sale.dataVenda,
        matricula: sale.matricula,
        colaborador: sale.colaborador || '',
        loja: sale.codLoja ?? '-',
        marca: sale.descrMarca || (sale.codMarca ? `Marca ${sale.codMarca}` : '-'),
        cargo: sale.descriCargo || (sale.codCargo ? `Cargo ${sale.codCargo}` : '-'),
        canal: sale.canal || 'TODOS',
        valorVenda: simulatedValue,
        taxaBasePct: baseRatePct,
        comissaoBase: baseCommission,
        taxaPropostaPct: appliedRatePct,
        comissaoProposta: proposedCommission,
        diferenca: difference,
        changedRangeInScenario: multiplier !== 1 && condAt100.satisfied !== condAtScenario.satisfied,
        memoriaCalculo: {
          identificadorVenda: item.saleId,
          dataVenda: sale.dataVenda,
          origemDados: referenceValidation?.origemDados || 'Base oficial cadastrada em Dados',
          taxaBasePct: baseRatePct,
          documentoOrigemBase: baseEntry?.origem || `tb_basecomiss (${competencia})`,
          competenciaOrigemBase: baseEntry?.competencia || competencia,
          regraAplicada: condAtScenario.satisfied
            ? winningRule.nomeRegra
            : `Manteve regra base (${winningRule.nomeRegra} não satisfez faixa de valor)`,
          manteveRegraBase: !condAtScenario.satisfied,
          condicaoOuFaixaSatisfeita: condAtScenario.conditionDescription,
          scoreEspecificidade: specificityScore,
          taxaFinalPct: appliedRatePct,
          criterioArredondamento: 'HALF_UP para 2 casas decimais em cada comissão individual',
          formulaCalculo: bonusFormulaSuffix
            ? `R$ ${simulatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × ${appliedRatePct.toLocaleString('pt-BR')}% ${bonusFormulaSuffix} = R$ ${proposedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            : `R$ ${simulatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} × ${appliedRatePct.toLocaleString('pt-BR')}% = R$ ${proposedCommission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          comissaoBase: baseCommission,
          comissaoProposta: proposedCommission,
          diferenca: difference
        }
      }
    })

    const totalDifference = roundHalfUp(totalProposedCommission - totalBaseCommission)
    const projectedSalesValue = roundHalfUp((totalSalesValue * duration.dias) / COMMERCIAL_MONTH_DAYS)
    const projectedBaseCommission = roundHalfUp((totalBaseCommission * duration.dias) / COMMERCIAL_MONTH_DAYS)
    const projectedProposedCommission = roundHalfUp((totalProposedCommission * duration.dias) / COMMERCIAL_MONTH_DAYS)
    const projectedDifference = roundHalfUp(projectedProposedCommission - projectedBaseCommission)
    const impactPct = projectedBaseCommission > 0
      ? roundHalfUp((projectedDifference / projectedBaseCommission) * 100, 2)
      : 0

    return {
      multiplier,
      rows,
      rangeSwitchesCount,
      historico: {
        totalVendas: totalSalesValue,
        comissaoBase: totalBaseCommission,
        comissaoProposta: totalProposedCommission,
        diferenca: totalDifference,
        impactoPct: totalBaseCommission > 0 ? roundHalfUp((totalDifference / totalBaseCommission) * 100, 2) : 0
      },
      projetado: {
        totalVendas: projectedSalesValue,
        comissaoBase: projectedBaseCommission,
        comissaoProposta: projectedProposedCommission,
        diferenca: projectedDifference,
        impactoPct: impactPct
      }
    }
  }

  const base100 = evaluateSliceForMultiplier(1.0)
  const scenario80 = evaluateSliceForMultiplier(0.8)
  const scenario120 = evaluateSliceForMultiplier(1.2)
  const scenario150 = evaluateSliceForMultiplier(1.5)

  const scenarios = [
    {
      key: '80',
      percentage: '80%',
      multiplier: 0.8,
      classification: 'Retração (-20% no valor de cada venda)',
      sales: scenario80.projetado.totalVendas,
      withoutProposal: scenario80.projetado.comissaoBase,
      withProposal: scenario80.projetado.comissaoProposta,
      impact: scenario80.projetado.diferenca,
      impactPct: scenario80.projetado.impactoPct,
      vendasQueMudaramDeFaixa: scenario80.rangeSwitchesCount,
      historico: scenario80.historico,
      projetado: scenario80.projetado
    },
    {
      key: '100',
      percentage: '100%',
      multiplier: 1.0,
      classification: 'Referência Base (100% das vendas recortadas)',
      sales: base100.projetado.totalVendas,
      withoutProposal: base100.projetado.comissaoBase,
      withProposal: base100.projetado.comissaoProposta,
      impact: base100.projetado.diferenca,
      impactPct: base100.projetado.impactoPct,
      vendasQueMudaramDeFaixa: 0,
      historico: base100.historico,
      projetado: base100.projetado
    },
    {
      key: '120',
      percentage: '120%',
      multiplier: 1.2,
      classification: 'Crescimento (+20% no valor de cada venda)',
      sales: scenario120.projetado.totalVendas,
      withoutProposal: scenario120.projetado.comissaoBase,
      withProposal: scenario120.projetado.comissaoProposta,
      impact: scenario120.projetado.diferenca,
      impactPct: scenario120.projetado.impactoPct,
      vendasQueMudaramDeFaixa: scenario120.rangeSwitchesCount,
      historico: scenario120.historico,
      projetado: scenario120.projetado
    },
    {
      key: '150',
      percentage: '150%',
      multiplier: 1.5,
      classification: 'Expansão (+50% no valor de cada venda)',
      sales: scenario150.projetado.totalVendas,
      withoutProposal: scenario150.projetado.comissaoBase,
      withProposal: scenario150.projetado.comissaoProposta,
      impact: scenario150.projetado.diferenca,
      impactPct: scenario150.projetado.impactoPct,
      vendasQueMudaramDeFaixa: scenario150.rangeSwitchesCount,
      historico: scenario150.historico,
      projetado: scenario150.projetado
    }
  ]

  const fingerprint = createSimulationFingerprint({
    competencia,
    form,
    basesFingerprint: referenceValidation?.basesFingerprint || ''
  })

  return {
    simulationId,
    competencia,
    origemDados: referenceValidation?.origemDados || 'Base oficial cadastrada em Dados',
    executedAt: new Date().toISOString(),
    duration,
    premises: {
      publicoConsiderado: `União das vendas elegíveis às regras (${base100.rows.length} venda(s) únicas do público; vendas fora do público não entram nos totais).`,
      mesComercial: `Mês comercial de ${COMMERCIAL_MONTH_DAYS} dias (projeção proporcional por ${duration.fatorTexto} sem arredondamento antecipado do fator).`,
      variacaoUniforme: 'Nos cenários de 80%, 120% e 150%, aplica-se variação uniforme ao valor de cada venda do público, reavaliando faixa de valor e recalculando comissão venda a venda.'
    },
    totals: {
      totalVendasConsideradas: base100.rows.length,
      duracaoCampanhaDias: duration.dias,
      mesComercialDias: COMMERCIAL_MONTH_DAYS,
      fatorDuracao: duration.fatorDuracao,
      fatorDuracaoTexto: duration.fatorTexto,
      historico: base100.historico,
      projetado: base100.projetado
    },
    rows: base100.rows,
    scenarios,
    fingerprint,
    basesFingerprint: referenceValidation?.basesFingerprint || '',
    formSnapshot: {
      dataInicio: String(form.dataInicio || ''),
      dataFim: String(form.dataFim || ''),
      canal: String(form.canal || ''),
      taxaPercentual: String(form.taxaPercentual || '')
    }
  }
}

/**
 * Pagina os itens da tabela da simulação preservando os totais de todo o recorte ([FRONT-5]).
 */
export function paginateSimulationItems(items = [], page = 1, pageSize = 10) {
  const safeItems = Array.isArray(items) ? items : []
  const size = Math.max(1, Number(pageSize) || 10)
  const totalItems = safeItems.length
  const totalPages = Math.max(1, Math.ceil(totalItems / size))
  const currentPage = Math.min(totalPages, Math.max(1, Number(page) || 1))
  const startOffset = (currentPage - 1) * size
  const pageItems = safeItems.slice(startOffset, startOffset + size)

  return {
    items: pageItems,
    content: pageItems,
    page: currentPage,
    pageSize: size,
    size,
    totalItems,
    totalElements: totalItems,
    totalPages,
    startIndex: totalItems === 0 ? 0 : startOffset + 1,
    endIndex: Math.min(totalItems, startOffset + pageItems.length),
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages
  }
}

/**
 * Cria o fingerprint determinístico da simulação aceita para detectar invalidações ([FRONT-6]).
 */
export function createSimulationFingerprint({ competencia, selectedCompetencia, form = {}, basesFingerprint = '', basesSignature = '' } = {}) {
  const targetComp = String(competencia || selectedCompetencia || '').trim()
  const targetBases = String(basesFingerprint || basesSignature || '')
  const rules = extractCampaignRules(form).map((r) => ({
    ordem: r.ordem,
    codMarca: r.codMarca,
    descrMarca: normalizeText(r.descrMarca),
    codLoja: r.codLoja,
    codCargo: r.codCargo,
    descriCargo: normalizeText(r.descriCargo),
    matricula: normalizeText(r.matricula),
    canal: normalizeText(r.canal),
    taxaPadraoPct: r.taxaPadraoPct,
    condicoes: r.condicoes
  }))

  return JSON.stringify({
    competencia: targetComp,
    dataInicio: String(form.dataInicio || '').trim(),
    dataFim: String(form.dataFim || '').trim(),
    canal: String(form.canal || 'TODOS').trim(),
    taxaPercentual: String(form.taxaPercentual || '').trim(),
    rules,
    basesFingerprint: targetBases
  })
}

/**
 * Avalia se a simulação aceita permanece válida ou se deve ser invalidada por mudanças
 * nas regras, competência, vigência ou base contratual ([FRONT-6]).
 */
export function evaluateSimulationValidity({
  acceptedSimulation,
  acceptedState,
  currentForm = {},
  currentCompetencia = '',
  currentBasesFingerprint,
  currentBasesSignature
} = {}) {
  const sim = acceptedSimulation || acceptedState
  if (!sim || !sim.fingerprint) {
    return { valid: false, isValid: false, isInvalidated: false, reasons: ['Nenhuma simulação concluída e aceita disponível.'] }
  }

  const reasons = []
  if (sim.competencia && currentCompetencia && sim.competencia !== currentCompetencia) {
    reasons.push(`A competência de referência foi alterada (${sim.competencia} → ${currentCompetencia}).`)
  }

  if (
    sim.formSnapshot &&
    (String(currentForm.dataInicio || '') !== String(sim.formSnapshot.dataInicio || '') ||
      String(currentForm.dataFim || '') !== String(sim.formSnapshot.dataFim || ''))
  ) {
    reasons.push('O período de vigência da campanha (data de início ou fim) foi alterado.')
  }

  const targetBasesFp = currentBasesFingerprint ?? currentBasesSignature ?? sim.basesFingerprint ?? ''
  if (
    targetBasesFp &&
    sim.basesFingerprint &&
    targetBasesFp !== sim.basesFingerprint
  ) {
    reasons.push('A base de dados ou cobertura contratual (tb_basecomiss) foi atualizada no servidor.')
  }

  const expectedFingerprint = createSimulationFingerprint({
    competencia: currentCompetencia || sim.competencia,
    form: currentForm,
    basesFingerprint: targetBasesFp
  })

  const storedHash = typeof sim.fingerprint === 'string' ? sim.fingerprint : sim.fingerprint?.hash
  if (expectedFingerprint !== storedHash && reasons.length === 0) {
    reasons.push('As regras, taxas ou filtros do público da campanha foram alterados após a simulação.')
  }

  return {
    valid: reasons.length === 0,
    isValid: reasons.length === 0,
    isInvalidated: reasons.length > 0,
    reasons
  }
}

async function loadSalesAndBasesFromBackendOrFallback({ isDemo = false, signal } = {}) {
  if (isDemo) {
    return {
      sales: FALLBACK_REFERENCE_SALES,
      bases: FALLBACK_BASE_COMISS,
      source: 'demo'
    }
  }

  try {
    const [salesList, basesRes] = await Promise.all([
      dataService.listAllSales({ signal }).catch(() => []),
      dataService.fetchComissoes({ page: 0, size: 500 }).catch(() => ({ content: [] }))
    ])

    const rawSales = Array.isArray(salesList) ? salesList : []
    const rawBases = Array.isArray(basesRes?.content)
      ? basesRes.content
      : Array.isArray(basesRes)
        ? basesRes
        : []

    if (rawSales.length > 0 || rawBases.length > 0) {
      return {
        sales: rawSales.length > 0 ? rawSales : FALLBACK_REFERENCE_SALES,
        bases: rawBases.length > 0 ? rawBases : FALLBACK_BASE_COMISS,
        source: 'backend'
      }
    }
  } catch {
    // Fallback local
  }

  return {
    sales: FALLBACK_REFERENCE_SALES,
    bases: FALLBACK_BASE_COMISS,
    source: 'local-fallback'
  }
}

export const campaignSimulationService = {
  async listReferenceCompetences({ isDemo = false, signal } = {}) {
    if (!isDemo) {
      try {
        const { data } = await api.get('/referencias/competencias', { signal })
        const rawList = Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : []
        if (rawList.length > 0) {
          return {
            items: rawList.map((item) => {
              const comp = normalizeCompetence(item.competencia ?? item.codigo ?? item) || String(item.competencia || item)
              return {
                competencia: comp,
                label: item.descricao || item.label || formatCompetenceLabel(comp),
                origemDados: item.origemDados || 'Base oficial cadastrada em Dados (Vendas + RH + Base Contratual tb_basecomiss)',
                totalVendas: Number(item.totalVendas ?? item.quantidadeVendas ?? 0)
              }
            }),
            source: 'backend'
          }
        }
      } catch {
        // Continua para agrupamento a partir das vendas ou fallback
      }
    }

    const { sales, source } = await loadSalesAndBasesFromBackendOrFallback({ isDemo, signal })
    const grouped = groupSalesByCompetence(sales)
    if (grouped.length > 0) {
      return {
        items: grouped.map((g) => ({
          competencia: g.competence,
          label: formatCompetenceLabel(g.competence),
          origemDados: 'Base oficial cadastrada em Dados (Vendas + RH + Base Contratual tb_basecomiss)',
          totalVendas: g.salesCount
        })),
        source
      }
    }

    return {
      items: FALLBACK_REFERENCE_COMPETENCES,
      source: isDemo ? 'demo' : 'local-fallback'
    }
  },

  async validateAndSliceReference({ competencia, form = {}, isDemo = false, signal } = {}) {
    const compNorm = normalizeCompetence(competencia) || String(competencia || '').trim()
    const rules = extractCampaignRules(form)

    if (!isDemo && compNorm) {
      try {
        const regrasPayload = buildCampaignRulesPayload(form)
        const [sliceResponse, basesRes] = await Promise.all([
          api.post(
            '/referencias/recortar-publico',
            {
              competencia: compNorm,
              regras: regrasPayload,
              pagina: 0,
              limite: 10000
            },
            { signal }
          ),
          dataService.fetchComissoes({ page: 0, size: 500 }).catch(() => ({ content: [] }))
        ])

        const data = sliceResponse?.data
        const rawBases = Array.isArray(basesRes?.content)
          ? basesRes.content
          : Array.isArray(basesRes)
            ? basesRes
            : []
        const bases = rawBases.length > 0 ? rawBases : FALLBACK_BASE_COMISS

        if (data && Array.isArray(data.vendas)) {
          const totalCompetencia = Number(data.totalVendasCompetencia ?? 0)
          const backendSales = data.vendas.map((v) => ({
            id: v.id,
            competencia: compNorm,
            dataVenda: v.dataVenda,
            matricula: v.matricula,
            codLoja: v.codLoja,
            codMarca: v.codMarca,
            descrMarca: v.descrMarca,
            codCargo: v.codCargo,
            descriCargo: v.descriCargo,
            valorVenda: v.valorVenda,
            canal: v.canal
          }))

          const localValidation = sliceAndValidatePublicLocally({
            competencia: compNorm,
            rules,
            sales: backendSales,
            bases
          })

          // Se a competência tem vendas no banco mas o recorte do público retornou 0 vendas,
          // ajusta a mensagem para refletir que o filtro de público zerou o recorte.
          if (totalCompetencia > 0 && backendSales.length === 0) {
            localValidation.impediments = [
              {
                code: 'INSUFFICIENT_REFERENCE',
                severity: 'blocking',
                title: 'Referência insuficiente para o público da campanha',
                message: `A competência ${compNorm} possui ${totalCompetencia} venda(s) no total, porém nenhuma venda atende aos filtros do público desta campanha. A ausência de vendas para o público não é exibida como R$ 0,00.`
              }
            ]
          }

          return {
            ...localValidation,
            totalVendasCompetencia: totalCompetencia,
            totalVendasRecortadas: Number(data.totalVendasRecortadas ?? localValidation.totalVendasRecortadas),
            origemDados: 'Recorte validado pelo backend (/api/v1/referencias/recortar-publico) + Base Contratual tb_basecomiss'
          }
        }
      } catch {
        // Fallback determinístico local caso o backend esteja indisponível
      }
    }

    const { sales, bases } = await loadSalesAndBasesFromBackendOrFallback({ isDemo, signal })

    return sliceAndValidatePublicLocally({
      competencia: compNorm,
      rules,
      sales,
      bases
    })
  },

  async executeSimulation({
    competencia,
    form = {},
    referenceValidation,
    isDemo = false,
    signal,
    onStatusUpdate
  } = {}) {
    const compNorm = normalizeCompetence(competencia) || String(competencia || '').trim()
    const simulationId = generateExecutionId('SIM', compNorm)
    const contextKey = `sim-${compNorm}`

    const updateProgress = (status, progress, stageMessage, extra = {}) => {
      const record = {
        executionId: simulationId,
        status,
        progress,
        stageMessage,
        updatedAt: new Date().toISOString(),
        ...extra
      }
      saveExecutionRecord('simulation', contextKey, record)
      onStatusUpdate?.(record)
      return record
    }

    updateProgress(ASYNC_EXECUTION_STATES.AGUARDANDO, 15, 'Validando recorte do público e cobertura contratual...')

    const validation =
      referenceValidation ||
      (await this.validateAndSliceReference({ competencia: compNorm, form, isDemo, signal }))

    if (!validation.canExecute) {
      const msg = validation.impediments?.[0]?.message || 'A simulação possui impedimentos de validação.'
      updateProgress(ASYNC_EXECUTION_STATES.FALHOU, 100, msg, { errorMessage: msg })
      const err = new Error(msg)
      err.code = validation.impediments?.[0]?.code || 'SIMULATION_BLOCKED'
      throw err
    }

    updateProgress(
      ASYNC_EXECUTION_STATES.PROCESSANDO,
      55,
      `Calculando comissões base e propostas para ${validation.totalVendasRecortadas} venda(s) do público...`
    )

    if (!isDemo) {
      try {
        const regrasPayload = buildCampaignRulesPayload(form)
        const { data } = await api.post(
          '/simulacoes',
          {
            competencia: compNorm,
            dataInicio: form.dataInicio || null,
            dataFim: form.dataFim || null,
            regras: regrasPayload
          },
          { signal }
        )
        if (data?.id && data?.estado && data.estado !== 'CONCLUIDA') {
          await pollAsyncExecution({
            executionId: data.id,
            fetchStatus: async (id, opts) => {
              const res = await api.get(`/simulacoes/${encodeURIComponent(id)}`, opts)
              return res.data
            },
            onUpdate: (st) => {
              updateProgress(st.status, st.progress, st.stage)
            },
            signal
          })
        }
      } catch (err) {
        if (signal?.aborted || err?.name === 'AbortError' || err?.code === 'ERR_CANCELED') {
          throw err
        }
        // Continua com cálculo determinístico sobre o recorte validado
      }
    }

    updateProgress(
      ASYNC_EXECUTION_STATES.PROCESSANDO,
      85,
      'Projetando duração pelo mês comercial de 30 dias e cenários de 80%, 120% e 150%...'
    )

    const outcome = buildSimulationOutcome({
      simulationId,
      competencia: compNorm,
      form,
      referenceValidation: validation
    })

    updateProgress(ASYNC_EXECUTION_STATES.CONCLUIDA, 100, 'Simulação concluída com sucesso.', {
      result: outcome
    })

    return outcome
  },

  recoverSavedSimulation(competencia = 'draft') {
    return loadExecutionRecord('simulation', `sim-${competencia}`)
  },

  clearSavedSimulation(competencia = 'draft') {
    clearExecutionRecord('simulation', `sim-${competencia}`)
  }
}
