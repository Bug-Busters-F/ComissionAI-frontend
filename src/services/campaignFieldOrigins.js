const KEYS = { codMarca: 'marca', descrMarca: 'marca', codCargo: 'cargo', descriCargo: 'cargo', codLoja: 'loja',
  taxaPercentual: 'taxa', valorMinimo: 'condicaoValor', valorMaximo: 'condicaoValor', minimoInclusivo: 'condicaoValor', maximoInclusivo: 'condicaoValor' }
const LABELS = { TEXTO: 'Texto informado', CONTEXTO: 'Contexto recebido', BASE_DADOS: 'Cadastro consultado', PADRAO_SISTEMA: 'Padrão do sistema' }
export function describeFieldOrigin(proposal, field) {
  if (!proposal) return 'Origem não informada.'
  if (proposal.camposManuais.includes(field)) return 'Edição manual.' + (field === 'taxaPercentual' ? ' O percentual foi definido diretamente e substitui a operação anterior sobre a base.' : '')
  const metadata = proposal.metadadosRecebidos || {}
  if (metadata.origensDesatualizadas) return 'Origem não confirmada para os campos atuais; o público foi editado. As referências anteriores permanecem apenas como histórico.'
  const operation = metadata.operacaoBase
  if (field === 'taxaPercentual' && operation && operation.tipoOperacao !== 'DEFINIR_TAXA') {
    return 'Operação calculada: ' + operation.tipoOperacao + '. Ajuste: ' + (operation.valorAjuste ?? 'não informado') +
      '. Base de comissão: ' + (operation.referenciaBase?.taxaBaseConsultada ?? 'não localizada') +
      (operation.referenciaBase?.descricao ? ' — ' + operation.referenciaBase.descricao : '') + '.'
  }
  const source = metadata.origensPorCampo?.[field] || metadata.origensPorCampo?.[KEYS[field]]
  if (source === 'CONTEXTO' && ['dataInicio', 'dataFim'].includes(field)) return 'Vigência herdada do período comum enviado à interpretação.'
  return (LABELS[source] || 'Origem não informada') + '.'
}
