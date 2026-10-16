function formatDate(value) {
  if (!value) return ''
  const parts = String(value).split('-')
  return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(value)
}

export function formatCampaignValidity(campaign, includeInclusivity = false) {
  const start = formatDate(campaign?.dataInicio)
  const end = formatDate(campaign?.dataFim)
  let validity

  if (!start && !end) validity = 'Conforme descrição original'
  else if (!start) validity = 'Início conforme descrição original até ' + end
  else if (!end) validity = start + ' até o fim conforme descrição original'
  else validity = start + ' até ' + end

  return includeInclusivity && (start || end) ? validity + ' (datas informadas inclusivas)' : validity
}
