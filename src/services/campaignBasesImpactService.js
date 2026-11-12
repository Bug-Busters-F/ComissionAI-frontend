import { normalizeCompetence, formatCompetenceCode, getCompetenceDateRange } from './competenceUtils'

/**
 * Serviço responsável por calcular e avaliar a transparência de bases globais corporativas
 * e indicar quais outras campanhas cadastradas no sistema são potencialmente afetadas
 * quando uma base de RH ou Vendas de determinada competência é adicionada ou alterada ([FRONT-4], [BACK-5], [BACK-6]).
 *
 * Utiliza estritamente comparação léxica de strings ISO (YYYY-MM-DD), evitando divergências de fuso horário.
 */
export function findAffectedCampaigns(competencia, campaigns = [], currentCampaignId = null) {
  const normComp = normalizeCompetence(competencia)
  if (!normComp || !Array.isArray(campaigns) || campaigns.length === 0) {
    return {
      competencia: normComp || competencia,
      competenciaFormatada: formatCompetenceCode(normComp || competencia) || '—',
      totalAfetadas: 0,
      totalOutrasAfetadas: 0,
      possuiAtivas: false,
      outrasCampanhas: [],
      todasAfetadas: [],
      avisoCorporativo:
        'As bases de RH e Vendas possuem escopo corporativo e são compartilhadas entre todas as campanhas da mesma competência.'
    }
  }

  const { dataInicio: compInicio, dataFim: compFim } = getCompetenceDateRange(normComp)

  const afetadas = []

  for (const c of campaigns) {
    if (!c.dataInicio) continue

    // Extrai a parte da data no formato YYYY-MM-DD
    const inicioStr = String(c.dataInicio).slice(0, 10)
    const fimStr = c.dataFim ? String(c.dataFim).slice(0, 10) : null

    // Regra canônica de sobreposição temporal sem conversão de Date (imune a fuso horário):
    // campanha.dataInicio <= compFim && (campanha.dataFim == null || campanha.dataFim >= compInicio)
    const sobrepoe = inicioStr <= compFim && (!fimStr || fimStr >= compInicio)

    if (sobrepoe) {
      const isCurrent = currentCampaignId != null && String(c.id) === String(currentCampaignId)
      const estadoUpper = String(c.estado || c.status || '').toUpperCase()

      let severidade = 'BAIXA'
      let riscoLabel = 'Informativo'
      let motivoImpacto = 'Exigirá re-recorte de público auditado e recalibração.'

      if (estadoUpper === 'ATIVA' || estadoUpper === 'ACTIVE' || estadoUpper === 'PUBLICADA') {
        severidade = 'CRITICA'
        riscoLabel = 'Impacto Crítico'
        motivoImpacto = 'Campanha ativa: impacta diretamente o fechamento e a apuração financeira de comissões.'
      } else if (c.simulacaoAceita || c.simulacaoAceitaId || c.statusSimulacao === 'CONCLUIDA' || c.simulacaoId) {
        severidade = 'MEDIA'
        riscoLabel = 'Re-simulação Necessária'
        motivoImpacto = 'Rascunho com simulação prévia: o aceite anterior será invalidado, exigindo nova simulação.'
      }

      afetadas.push({
        id: c.id,
        titulo: c.titulo || c.nome || `Campanha #${c.id}`,
        estado: estadoUpper || 'RASCUNHO',
        dataInicio: inicioStr,
        dataFim: fimStr || 'Indeterminada',
        severidade,
        riscoLabel,
        motivoImpacto,
        isCurrent
      })
    }
  }

  const outrasCampanhas = afetadas.filter((c) => !c.isCurrent)
  const possuiAtivas = outrasCampanhas.some((c) => c.severidade === 'CRITICA')

  return {
    competencia: normComp,
    competenciaFormatada: formatCompetenceCode(normComp),
    totalAfetadas: afetadas.length,
    totalOutrasAfetadas: outrasCampanhas.length,
    possuiAtivas,
    outrasCampanhas,
    todasAfetadas: afetadas,
    avisoCorporativo:
      'Atenção: As bases de RH e Vendas são corporativas e compartilhadas entre todas as campanhas da mesma competência. Alterações ou adições nesta base impactam diretamente todas as campanhas em vigência no período.'
  }
}
