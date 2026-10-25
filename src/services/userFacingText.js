// Presentation only: keep original messages and evidence for validation and audit.
export function userFacingText(value) {
  if (typeof value !== 'string') return value
  if (/SQLState|JDBC|Hibernate|could not execute statement|No static resource|org\.[\w.]+Exception/i.test(value)) return 'Não foi possível concluir a operação. Tente novamente. Se o problema continuar, entre em contato com o suporte.'
  if (/\bhash\b|SHA-?256|assinatura canônica|snapshot/i.test(value)) return 'Esta simulação precisa ser atualizada. Execute uma nova simulação e registre o aceite antes de continuar.'
  if (/Reconstrua\/reinicie o backend|backend em execução.*(?:disponibiliza|rastreabilidade)/i.test(value)) return 'Este recurso precisa de uma atualização do sistema. Recarregue a página. Se o problema continuar, entre em contato com o suporte.'
  return value
    .replace(/tb_basecomiss/gi, 'tabela de comissões')
    .replace(/\btb_[a-z_]+\b/gi, 'cadastro')
    .replace(/\bBASE_COMISS\b/g, 'Taxa contratual')
    .replace(/\bTAXA_BASE_CONTRATUAL\b/g, 'Taxa contratual')
    .replace(/\bREGRA_CONCORRENTE\b/g, 'Regra concorrente')
    .replace(/\bDEFINIR_TAXA\b/g, 'Taxa definida diretamente')
    .replace(/\bACRESCIMO_PONTOS\b/g, 'Acréscimo sobre a taxa contratual')
    .replace(/\bDESCONTO_PONTOS\b/g, 'Desconto sobre a taxa contratual')
    .replace(/\bMULTIPLICADOR_BASE\b/g, 'Multiplicação da taxa contratual')
    .replace(/\bDIVISOR_BASE\b/g, 'Divisão da taxa contratual')
    .replace(/\b(?:cod_marca|codMarca)\b/g, 'Marca')
    .replace(/\b(?:cod_cargo|codCargo)\b/g, 'Cargo')
    .replace(/\b(?:cod_loja|codLoja)\b/g, 'Loja')
    .replace(/\bFallback\b/gi, 'Uso da')
    .replace(/\bbackend\b/gi, 'sistema')
    .replace(/\bbanco de dados\b/gi, 'sistema')
    .replace(/\bservidor\b/gi, 'sistema')
    .replace(/\bpersistência isolada\b/gi, 'histórico de simulações')
    .replace(/\bpersistid([oa]s?)\b/gi, 'salv$1')
    .replace(/\bendpoint\b/gi, 'recurso')
    .replace(/\bintegridade relacional\b/gi, 'consistência dos vínculos')
    .replace(/\s*\(ID \d+\)/g, '')
    .replace(/Venda ID [\da-f-]{36} em /gi, 'Venda de ')
}

export function isHiddenRuleNotice(pending) {
  if (pending?.severidade !== 'AVISO') return false
  return pending.codigo === 'TRECHO_NAO_MAPEADO' || /trecho[^.]{0,120}(?:não|nao)[^.]{0,60}(?:virou|usado|utilizado|aproveitado|mapeado)[^.]*regra/i.test(pending.mensagem || '')
}

export function isInformationalSimulationNotice(message) {
  return /simulação recuperada da persistência isolada|simulação recuperada.*tb_simulacao/i.test(message || '')
}
