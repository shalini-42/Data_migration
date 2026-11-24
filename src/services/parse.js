import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { dedupeHeaders } from '../utils/engine.js'

export const MAX_MB = 50
const toSheet = (aoa) => {
  const width = aoa.reduce((m, r) => Math.max(m, r.length), 0)
  const head = dedupeHeaders(Array.from({ length: width }, (_, j) => (aoa[0] || [])[j]))
  return { headers: head, rows: aoa.slice(1).map((r) => head.map((_, j) => (r[j] === undefined ? null : r[j]))) }
}
/** Parses XLSX / XLS / CSV entirely in the browser. Nothing is uploaded anywhere. */
export async function parseFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!['xlsx', 'xls', 'csv'].includes(ext)) throw new Error(`"${file.name}": unsupported format. Use XLSX, XLS or CSV.`)
  if (file.size > MAX_MB * 1024 * 1024) throw new Error(`"${file.name}" is larger than ${MAX_MB} MB.`)
  const sheets = {}
  if (ext === 'csv') {
    const r = Papa.parse(await file.text(), { dynamicTyping: true, skipEmptyLines: 'greedy' })
    sheets[file.name.replace(/\.csv$/i, '') || 'Sheet1'] = toSheet(r.data)
  } else {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
    wb.SheetNames.forEach((n) => { sheets[n] = toSheet(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: null, raw: true, blankrows: true })) })
  }
  if (!Object.keys(sheets).length) throw new Error(`"${file.name}" contains no worksheets.`)
  return { ext, sheets }
}
