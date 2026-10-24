// Deliberately limited demo fixtures, never used as a fallback for API failures.
export async function reinterpretRuleDemo(input, { signal } = {}) {
  await new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new Error('Interpretação cancelada.')) }
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, 1000)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
  })
  const scenario = input.cenarioDemonstrativo
  if (scenario === 'falha') throw new Error('Falha demonstrativa. A regra atual foi preservada; você pode tentar novamente.')
  if (scenario === 'vazio') return { demonstrativo: true, propostas: [] }
  const campos = {}
  const rate = input.texto.match(/(\d+(?:[.,]\d+)?)\s*%/)
  const store = input.texto.match(/loja\s+(\d+)/i)
  if (rate) campos.taxaPercentual = rate[1]
  if (store) campos.codLoja = store[1]
  for (const [name, code] of [['PRETO', '10'], ['BRANCO', '20']]) {
    if (new RegExp('marca\\s+' + name + '\\b', 'i').test(input.texto)) {
      Object.assign(campos, { codMarca: code, descrMarca: name })
    }
  }
  if (scenario === 'novoFiltro') campos.codLoja = '75'
  if (!Object.keys(campos).length) throw new Error('Na demonstração, informe uma taxa como 4%, marca PRETO/BRANCO ou loja 75.')
  const proposal = {
    campos, resumo: input.texto.trim(), pendencias: [],
    metadados: { explicacao: 'Resposta demonstrativa: percentual, marca e loja identificados em um exemplo controlado.', origens: Object.fromEntries(Object.keys(campos).map((field) => [field, { texto: input.texto, origem: 'DEMONSTRACAO' }])) }
  }
  return { demonstrativo: true, propostas: scenario === 'multiplas' ? [proposal, proposal] : [proposal] }
}
