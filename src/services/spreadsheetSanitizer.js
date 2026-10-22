import * as XLSX from 'xlsx'

/**
 * Normaliza os nomes de colunas de uma linha de planilha para facilitar a leitura flexível.
 */
function normalizeRowKeys(rawRow = {}) {
  const normalized = {}
  for (const [key, val] of Object.entries(rawRow)) {
    const cleanKey = String(key)
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')

    normalized[cleanKey] = val
  }

  // Identificação flexível de colunas
  const brandCode =
    rawRow.Cod_Marca ??
    rawRow.codMarca ??
    normalized.codmarca ??
    normalized.codigomarca ??
    normalized.marca ??
    null

  const brandDesc =
    rawRow.Descr_Marca ??
    rawRow.descrMarca ??
    normalized.descrmarca ??
    normalized.descricaomarca ??
    normalized.nomeMarca ??
    ''

  const posCode =
    rawRow.Cod_Cargo ??
    rawRow.codCargo ??
    normalized.codcargo ??
    normalized.codigocargo ??
    normalized.cargo ??
    null

  const posDesc =
    rawRow.Descri_Cargo ??
    rawRow.descriCargo ??
    normalized.descricargo ??
    normalized.descricaocargo ??
    normalized.nomeCargo ??
    ''

  const rawRate =
    rawRow['%_Comiss'] ??
    rawRow.pctComiss ??
    rawRow.percentual ??
    normalized.comiss ??
    normalized.pctcomiss ??
    normalized.percentual ??
    normalized.taxa ??
    0

  const numericRate =
    typeof rawRate === 'string'
      ? parseFloat(rawRate.replace(',', '.').replace('%', '').trim())
      : Number(rawRate)

  return {
    raw: rawRow,
    brandCode: brandCode !== null ? Number(brandCode) : null,
    brandDesc: String(brandDesc || '').trim(),
    posCode: posCode !== null ? Number(posCode) : null,
    posDesc: String(posDesc || '').trim(),
    rate: Number.isFinite(numericRate) ? numericRate : 0
  }
}

/**
 * Lê e analisa uma planilha de taxas de comissão (.xlsx ou .xls),
 * identificando linhas duplicadas idênticas e conflitos de taxa para a mesma Marca e Cargo.
 */
export async function inspectCommissionsSpreadsheet(file) {
  if (!file) return { hasIssues: false, identicalDuplicates: [], rateConflicts: [], rows: [] }

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { hasIssues: false, identicalDuplicates: [], rateConflicts: [], rows: [] }
  }

  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  if (!rawRows.length) {
    return { hasIssues: false, identicalDuplicates: [], rateConflicts: [], rows: [] }
  }

  const seenMap = new Map() // key -> { index, row, rate, posDesc, brandDesc }
  const identicalDuplicates = []
  const rateConflictsMap = new Map() // key -> { id, brandCode, brandDesc, posCode, options: [...] }

  rawRows.forEach((raw, idx) => {
    const lineNum = idx + 2 // Linha 1 é o cabeçalho
    const parsed = normalizeRowKeys(raw)

    if (parsed.brandCode === null || parsed.posCode === null) {
      return
    }

    const key = `${parsed.brandCode}:${parsed.posCode}`

    if (seenMap.has(key)) {
      const prev = seenMap.get(key)

      // Comparação de taxas (com tolerância de ponto flutuante)
      if (Math.abs(prev.rate - parsed.rate) < 0.00001) {
        // Duplicata idêntica: mesma marca, cargo e taxa
        identicalDuplicates.push({
          line: lineNum,
          prevLine: prev.line,
          brandCode: parsed.brandCode,
          posCode: parsed.posCode,
          rate: parsed.rate
        })
      } else {
        // Conflito de taxa: mesma marca e cargo, mas taxas divergentes
        if (!rateConflictsMap.has(key)) {
          rateConflictsMap.set(key, {
            id: key,
            brandCode: parsed.brandCode,
            brandDesc: prev.brandDesc || parsed.brandDesc || `Marca ${parsed.brandCode}`,
            posCode: parsed.posCode,
            options: [
              {
                id: `${key}-0`,
                line: prev.line,
                description: prev.posDesc || `Cargo ${parsed.posCode}`,
                rate: prev.rate,
                rateFormatted: `${(prev.rate * (prev.rate < 1 ? 100 : 1)).toFixed(2).replace('.', ',')}%`,
                originalRow: prev.raw
              }
            ],
            selectedOptionIndex: 0
          })
        }

        const conflict = rateConflictsMap.get(key)
        conflict.options.push({
          id: `${key}-${conflict.options.length}`,
          line: lineNum,
          description: parsed.posDesc || `Cargo ${parsed.posCode}`,
          rate: parsed.rate,
          rateFormatted: `${(parsed.rate * (parsed.rate < 1 ? 100 : 1)).toFixed(2).replace('.', ',')}%`,
          originalRow: raw
        })
      }
    } else {
      seenMap.set(key, {
        line: lineNum,
        raw,
        rate: parsed.rate,
        posDesc: parsed.posDesc,
        brandDesc: parsed.brandDesc
      })
    }
  })

  const rateConflicts = Array.from(rateConflictsMap.values())

  return {
    fileName: file.name,
    totalRows: rawRows.length,
    rawRows,
    identicalDuplicates,
    rateConflicts,
    hasIssues: identicalDuplicates.length > 0 || rateConflicts.length > 0
  }
}

/**
 * Gera um novo arquivo Excel higienizado em memória (File/Blob),
 * eliminando duplicatas idênticas e aplicando a escolha do usuário nos conflitos de taxa.
 */
export function buildSanitizedCommissionsFile({
  originalFile,
  rawRows = [],
  rateConflicts = [],
  conflictResolutions = {} // key: 'brandCode:posCode' -> selectedOptionIndex (Number)
}) {
  const chosenMap = new Map() // key -> chosenRow

  rawRows.forEach((raw) => {
    const parsed = normalizeRowKeys(raw)
    if (parsed.brandCode === null || parsed.posCode === null) return

    const key = `${parsed.brandCode}:${parsed.posCode}`
    const conflict = rateConflicts.find((c) => c.id === key)

    if (conflict) {
      const chosenIdx = conflictResolutions[key] ?? conflict.selectedOptionIndex ?? 0
      const chosenOption = conflict.options[chosenIdx] || conflict.options[0]
      if (!chosenMap.has(key)) {
        chosenMap.set(key, chosenOption.originalRow)
      }
    } else {
      // Se não tem conflito, guarda a primeira ocorrência (descarta duplicatas idênticas)
      if (!chosenMap.has(key)) {
        chosenMap.set(key, raw)
      }
    }
  })

  const cleanRows = Array.from(chosenMap.values())

  const newWb = XLSX.utils.book_new()
  const newWs = XLSX.utils.json_to_sheet(cleanRows)
  XLSX.utils.book_append_sheet(newWb, newWs, 'COMISS')

  const arrayBuffer = XLSX.write(newWb, { type: 'array', bookType: 'xlsx' })
  const cleanFileName = (originalFile?.name || 'BASE_COMMISS.xlsx').replace(
    /(\.xlsx|\.xls)$/i,
    '_HIGIENIZADA$1'
  )

  return new File([arrayBuffer], cleanFileName, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
}
