export const MONTH_NAMES = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro'
}

export function normalizeCompetence(value) {
  const text = String(value || '').trim()
  if (/^\d{4}-\d{2}$/.test(text)) {
    const month = Number(text.slice(5, 7))
    return month >= 1 && month <= 12 ? text : ''
  }

  const displayMatch = text.match(/^(\d{1,2})\/(\d{4})$/)
  if (displayMatch) {
    const month = Number(displayMatch[1])
    return month >= 1 && month <= 12 ? `${displayMatch[2]}-${String(month).padStart(2, '0')}` : ''
  }

  return ''
}

export function formatCompetenceCode(value) {
  const normalized = normalizeCompetence(value)
  if (!normalized) return String(value || '')
  const [year, month] = normalized.split('-')
  return `${month}/${year}`
}

export function formatCompetenceLabel(value) {
  const normalized = normalizeCompetence(value)
  if (!normalized) return 'Competência'
  const [year, month] = normalized.split('-')
  return `${MONTH_NAMES[month] || month} ${year}`
}

export function getCompetenceDateRange(value) {
  const normalized = normalizeCompetence(value)
  if (!normalized) return { dataInicio: '', dataFim: '' }

  const [year, month] = normalized.split('-').map(Number)
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return {
    dataInicio: `${normalized}-01`,
    dataFim: `${normalized}-${String(lastDay).padStart(2, '0')}`
  }
}

export function groupSalesByCompetence(sales = []) {
  const grouped = new Map()

  for (const sale of sales) {
    const key = typeof sale?.saleDate === 'string' ? sale.saleDate.slice(0, 7) : ''
    const normalized = normalizeCompetence(key)
    if (!normalized) continue

    const current = grouped.get(normalized) || { competence: normalized, salesCount: 0 }
    current.salesCount += 1
    grouped.set(normalized, current)
  }

  return [...grouped.values()].sort((left, right) => right.competence.localeCompare(left.competence))
}

const MONTH_ALIASES = [
  { month: '01', tokens: ['JANEIRO', 'JAN'] },
  { month: '02', tokens: ['FEVEREIRO', 'FEV', 'FEB'] },
  { month: '03', tokens: ['MARCO', 'MARÇO', 'MAR'] },
  { month: '04', tokens: ['ABRIL', 'ABR', 'APR'] },
  { month: '05', tokens: ['MAIO', 'MAI', 'MAY'] },
  { month: '06', tokens: ['JUNHO', 'JUN'] },
  { month: '07', tokens: ['JULHO', 'JUL'] },
  { month: '08', tokens: ['AGOSTO', 'AGO', 'AUG'] },
  { month: '09', tokens: ['SETEMBRO', 'SET', 'SEP'] },
  { month: '10', tokens: ['OUTUBRO', 'OUT', 'OCT'] },
  { month: '11', tokens: ['NOVEMBRO', 'NOV'] },
  { month: '12', tokens: ['DEZEMBRO', 'DEZ', 'DEC'] }
]

/**
 * Extrai o código de competência (MM/YYYY) a partir do nome do arquivo
 * Ex: "BASE RH_NOV25.xlsx" -> "11/2025", "VENDAS_2025-07.xlsx" -> "07/2025"
 */
export function extractCompetenceFromFileName(fileName) {
  if (!fileName) return ''
  const baseName = String(fileName)
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  // 1. Formato numérico explícito: YYYY-MM ou YYYY_MM
  const isoMatch = baseName.match(/(?:^|[^0-9])(20\d{2})[-_.\s](0[1-9]|1[0-2])(?:$|[^0-9])/)
  if (isoMatch) {
    return `${isoMatch[2]}/${isoMatch[1]}`
  }

  // 2. Formato numérico explícito: MM-YYYY ou MM_YYYY
  const brMatch = baseName.match(/(?:^|[^0-9])(0?[1-9]|1[0-2])[-_.\s](20\d{2})(?:$|[^0-9])/)
  if (brMatch) {
    return `${String(brMatch[1]).padStart(2, '0')}/${brMatch[2]}`
  }

  // 3. Mês por extenso ou abreviação seguido de ano (2 ou 4 dígitos): ex: NOV25, NOV_25, NOV2025, NOVEMBRO_2025
  for (const { month, tokens } of MONTH_ALIASES) {
    for (const token of tokens) {
      const regexWithYear = new RegExp(`(?:^|[^A-Z])${token}[-_.\\s]*(20\\d{2}|\\d{2})(?:$|[^0-9])`)
      const match = baseName.match(regexWithYear)
      if (match) {
        const rawYear = match[1]
        const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
        return `${month}/${year}`
      }
    }
  }

  // 4. Ano antes do nome/abreviação do mês: ex: 2025_NOV, 25_NOVEMBRO
  for (const { month, tokens } of MONTH_ALIASES) {
    for (const token of tokens) {
      const regexYearFirst = new RegExp(`(?:^|[^0-9])(20\\d{2}|\\d{2})[-_.\\s]*${token}(?:$|[^A-Z])`)
      const match = baseName.match(regexYearFirst)
      if (match) {
        const rawYear = match[1]
        const year = rawYear.length === 2 ? `20${rawYear}` : rawYear
        return `${month}/${year}`
      }
    }
  }

  // 5. Nome ou abreviação do mês isolado no nome do arquivo (usa ano presente no nome ou 2025 como fallback)
  const anyYearMatch = baseName.match(/(?:^|[^0-9])(20\d{2})(?:$|[^0-9])/)
  const fallbackYear = anyYearMatch ? anyYearMatch[1] : '2025'
  for (const { month, tokens } of MONTH_ALIASES) {
    for (const token of tokens) {
      const regexTokenOnly = new RegExp(`(?:^|[^A-Z])${token}(?:$|[^A-Z0-9])`)
      if (regexTokenOnly.test(baseName)) {
        return `${month}/${fallbackYear}`
      }
    }
  }

  return ''
}

function parseDateValueToCompetenceCode(rawValue) {
  if (rawValue == null) return ''
  const text = String(rawValue).trim()
  if (!text) return ''

  // Data ISO: YYYY-MM-DD
  const isoDate = text.match(/^(20\d{2})-(0[1-9]|1[0-2])-\d{2}/)
  if (isoDate) return `${isoDate[2]}/${isoDate[1]}`

  // Data BR: DD/MM/YYYY
  const brDate = text.match(/^\d{1,2}\/(0?[1-9]|1[0-2])\/(20\d{2})/)
  if (brDate) return `${String(brDate[1]).padStart(2, '0')}/${brDate[2]}`

  // Serial numérico do Excel (ex: 45962 -> Novembro/2025)
  const num = Number(text)
  if (Number.isFinite(num) && num > 36526 && num < 60000) {
    const utcMs = Math.round((num - 25569) * 86400 * 1000)
    const date = new Date(utcMs)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    if (year >= 2000 && year <= 2099) {
      return `${month}/${year}`
    }
  }

  return ''
}

async function inflateRawBytes(compressedBytes) {
  if (typeof DecompressionStream === 'undefined') return null
  const ds = new DecompressionStream('deflate-raw')
  const writer = ds.writable.getWriter()
  writer.write(compressedBytes)
  writer.close()
  const response = new Response(ds.readable)
  const buffer = await response.arrayBuffer()
  return new TextDecoder('utf-8').decode(buffer)
}

function readZipEntriesFromBuffer(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer)
  const view = new DataView(arrayBuffer)
  const entries = new Map()
  let offset = 0

  while (offset + 30 <= bytes.length) {
    const signature = view.getUint32(offset, true)
    if (signature !== 0x04034b50) break

    const flags = view.getUint16(offset + 6, true)
    const compression = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraFieldLength = view.getUint16(offset + 28, true)
    const nameStart = offset + 30
    const dataStart = nameStart + fileNameLength + extraFieldLength

    // Se usar data descriptor (bit 3) com compressedSize 0 no local header, interrompe leitura local
    if ((flags & 0x08) !== 0 && compressedSize === 0) break
    if (dataStart + compressedSize > bytes.length) break

    const name = new TextDecoder('utf-8').decode(bytes.subarray(nameStart, nameStart + fileNameLength))
    entries.set(name, {
      compression,
      data: bytes.subarray(dataStart, dataStart + compressedSize)
    })

    offset = dataStart + compressedSize
  }

  return entries
}

/**
 * Tenta inspecionar a primeira linha de dados de um arquivo .xlsx no navegador
 * para extrair a competência (MM/YYYY) caso o nome do arquivo não informe o mês.
 */
export async function extractCompetenceFromXlsxFile(file) {
  try {
    if (!file || typeof file.arrayBuffer !== 'function') return ''
    const buffer = await file.arrayBuffer()
    if (!buffer || buffer.byteLength < 30) return ''

    const entries = readZipEntriesFromBuffer(buffer)
    const sheetEntry = entries.get('xl/worksheets/sheet1.xml')
    if (!sheetEntry) return ''

    const decodeEntry = async (entry) => {
      if (!entry) return ''
      if (entry.compression === 0) return new TextDecoder('utf-8').decode(entry.data)
      if (entry.compression === 8) return (await inflateRawBytes(entry.data)) || ''
      return ''
    }

    const sheetXml = await decodeEntry(sheetEntry)
    if (!sheetXml) return ''

    let sharedStrings = []
    const sharedEntry = entries.get('xl/sharedStrings.xml')
    if (sharedEntry) {
      const sharedXml = await decodeEntry(sharedEntry)
      if (sharedXml) {
        sharedStrings = [...sharedXml.matchAll(/<si[\s>][\s\S]*?<\/si>/g)].map((m) =>
          [...m[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')
        )
      }
    }

    // Procura células da coluna A nas primeiras linhas de dados (A2, A3, A4)
    const cellRegex = /<c\b[^>]*\br="(A[2-5])"([^>]*)>([\s\S]*?)<\/c>/g
    for (const match of sheetXml.matchAll(cellRegex)) {
      const attrs = match[2] || ''
      const inner = match[3] || ''
      const typeMatch = attrs.match(/\bt="([^"]+)"/)
      const cellType = typeMatch ? typeMatch[1] : ''
      const vMatch = inner.match(/<v[^>]*>([\s\S]*?)<\/v>/)
      const tMatch = inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)

      let rawVal = vMatch ? vMatch[1].trim() : tMatch ? tMatch[1].trim() : ''
      if (cellType === 's' && rawVal !== '') {
        const idx = Number(rawVal)
        if (Number.isInteger(idx) && sharedStrings[idx] != null) {
          rawVal = sharedStrings[idx]
        }
      }

      const detected = parseDateValueToCompetenceCode(rawVal)
      if (detected) return detected
    }
  } catch {
    // Ignora silenciosamente caso o arquivo não seja um ZIP/XLSX padrão legível localmente
  }
  return ''
}

