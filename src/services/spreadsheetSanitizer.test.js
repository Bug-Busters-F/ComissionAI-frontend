import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  inspectCommissionsSpreadsheet,
  buildSanitizedCommissionsFile
} from './spreadsheetSanitizer'

describe('spreadsheetSanitizer', () => {
  it('detects identical duplicates and conflicting rates', async () => {
    const rows = [
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 100, Descri_Cargo: 'VENDEDOR LOJA', '%_Comiss': 0.025 },
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 100, Descri_Cargo: 'VENDEDOR LOJA', '%_Comiss': 0.025 }, // Identical duplicate
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 150, Descri_Cargo: 'GERENTE DE LOJA', '%_Comiss': 0.010 }, // Conflict 1
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 150, Descri_Cargo: 'GERENTE QUIOSQUE', '%_Comiss': 0.0075 }, // Conflict 2
      { Cod_Marca: 20, Descr_Marca: 'BRANCO', Cod_Cargo: 200, Descri_Cargo: 'VENDEDOR BALCAO', '%_Comiss': 0.03 }
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const file = new File([buf], 'TEST_COMMISS.xlsx')

    const inspection = await inspectCommissionsSpreadsheet(file)
    expect(inspection.hasIssues).toBe(true)
    expect(inspection.identicalDuplicates.length).toBe(1)
    expect(inspection.identicalDuplicates[0].posCode).toBe(100)
    expect(inspection.rateConflicts.length).toBe(1)
    expect(inspection.rateConflicts[0].posCode).toBe(150)
    expect(inspection.rateConflicts[0].options.length).toBe(2)
  })

  it('builds a clean sanitized file applying selected option for conflict', async () => {
    const rows = [
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 100, Descri_Cargo: 'VENDEDOR LOJA', '%_Comiss': 0.025 },
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 100, Descri_Cargo: 'VENDEDOR LOJA', '%_Comiss': 0.025 }, // Duplicate
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 150, Descri_Cargo: 'GERENTE DE LOJA', '%_Comiss': 0.010 }, // Option 0
      { Cod_Marca: 10, Descr_Marca: 'PRETO', Cod_Cargo: 150, Descri_Cargo: 'GERENTE QUIOSQUE', '%_Comiss': 0.0075 } // Option 1
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const file = new File([buf], 'TEST_COMMISS.xlsx')

    const inspection = await inspectCommissionsSpreadsheet(file)
    const cleanFile = buildSanitizedCommissionsFile({
      originalFile: file,
      rawRows: inspection.rawRows,
      rateConflicts: inspection.rateConflicts,
      conflictResolutions: { '10:150': 1 } // Choose option 1 (0.0075)
    })

    const cleanBuf = await cleanFile.arrayBuffer()
    const cleanWb = XLSX.read(cleanBuf, { type: 'array' })
    const cleanRows = XLSX.utils.sheet_to_json(cleanWb.Sheets[cleanWb.SheetNames[0]])

    expect(cleanRows.length).toBe(2)
    const pos150 = cleanRows.find((r) => r.Cod_Cargo === 150)
    expect(pos150.Descri_Cargo).toBe('GERENTE QUIOSQUE')
    expect(pos150['%_Comiss']).toBe(0.0075)
  })
})
