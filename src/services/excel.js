import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

export const save = (blob, name) => saveAs(blob, name)
/** frames: {sheetName: AOA}. names: which sheets to include. Returns a Blob. */
export function workbookBlob(frames, names) {
  const wb = XLSX.utils.book_new()
  names.forEach((n) => {
    const aoa = frames[n] || [['No data']], ws = XLSX.utils.aoa_to_sheet(aoa)
    const w = (aoa[0] || []).map((_, j) => ({ wch: Math.min(Math.max(...aoa.slice(0, 200).map((r) => String(r[j] ?? '').length), 8) + 2, 50) }))
    ws['!cols'] = w; if (aoa.length > 1 && aoa[0].length) ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: aoa[0].length - 1 } }) }
    XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31))
  })
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}
