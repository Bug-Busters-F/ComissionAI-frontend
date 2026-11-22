// Presentation only: keep original messages and evidence for validation and audit.
export function userFacingText(value) {
  if (typeof value !== 'string') return value
  if (/rate_limit_exceeded|Too Many Requests|(?:HTTP|status(?: code)?)\s*:?\s*429\b|cota excedida|limite de requisições/i.test(value)) return 'O serviço de interpretação atingiu o limite de uso. Aguarde alguns instantes e tente novamente. Seus dados foram preservados.'
  if (/consultar_[a-z_]+[\s\S]*(?:não foi|nao foi|falhou)|modelo ficou indisponível|LLM_PROVIDER_ERROR|json_validate_failed|Failed to validate JSON/i.test(value)) return 'Não foi possível concluir a análise automática. Tente interpretar novamente antes de continuar. Seus dados foram preservados.'
  if (/Network Error|Failed to fetch|ECONNREFUSED|ERR_NETWORK/i.test(value)) return 'Não foi possível conectar ao sistema. Verifique sua conexão e tente novamente.'
  if (/timeout|ECONNABORTED|ETIMEDOUT/i.test(value)) return 'A operação demorou mais que o esperado. Tente novamente. Seus dados foram preservados.'
  if (/Request failed with status code|AxiosError|Internal Server Error|Bad Gateway|Traceback|NullPointerException/i.test(value)) return 'Não foi possível concluir a operação. Tente novamente. Se o problema continuar, entre em contato com o suporte.'
  if (/(?:hash|SHA-?256|assinatura).*(?:programa|código)|(?:programa|código).*(?:hash|SHA-?256|assinatura)/i.test(value)) return 'O programa foi alterado. Atualize a revisão e confira o código atual antes de aprovar ou continuar.'
  if (/SQLState|JDBC|Hibernate|could not execute statement|No static resource|org\.[\w.]+Exception/i.test(value)) return 'Não foi possível concluir a operação. Tente novamente. Se o problema continuar, entre em contato com o suporte.'
  if (/\bhash\b|SHA-?256|assinatura canônica|snapshot/i.test(value)) return 'Esta simulação precisa ser atualizada. Execute uma nova simulação e registre o aceite antes de continuar.'
  if (/Reconstrua\/reinicie o backend|backend em execução.*(?:disponibiliza|rastreabilidade)/i.test(value)) return 'Este recurso precisa de uma atualização do sistema. Recarregue a página. Se o problema continuar, entre em contato com o suporte.'
  return value
    .replace(/\b(?:filtros|condicaoValor)\./g, '')
    .replace(/\bvalorMinimo\b/g, 'Valor mínimo')
    .replace(/\bvalorMaximo\b/g, 'Valor máximo')
    .replace(/\bminInclusivo\b/g, 'Inclusão do limite mínimo')
    .replace(/\bmaxInclusivo\b/g, 'Inclusão do limite máximo')
    .replace(/\btaxaFinal\b/g, 'Taxa final')
    .replace(/\btrechoOrigem\b/g, 'Texto da regra')
    .replace(/\bMVP\b/g, 'sistema')
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
