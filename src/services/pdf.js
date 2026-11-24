import { jsPDF } from 'jspdf'

const L = (s) => String(s ?? '').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '?')
export function buildPdf(results, filename, mig, T) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }), W = 595, M = 40; let y = M
  const need = (h) => { if (y + h > 800) { doc.addPage(); y = M } }
  const h1 = (t) => { need(40); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(31, 58, 95); doc.text(L(t), M, y); y += 24 }
  const p = (t, size = 10) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(40); doc.splitTextToSize(L(t), W - 2 * M).forEach((ln) => { need(14); doc.text(ln, M, y); y += 14 }) ; y += 2 }
  const table = (head, rows) => {
    const cw = (W - 2 * M) / head.length, row = (cells, hd, i) => { need(18)
      if (hd) { doc.setFillColor(31, 58, 95); doc.rect(M, y - 11, W - 2 * M, 17, 'F'); doc.setTextColor(255) } else { if (i % 2) { doc.setFillColor(242, 246, 250); doc.rect(M, y - 11, W - 2 * M, 17, 'F') } doc.setTextColor(40) }
      doc.setFont('helvetica', hd ? 'bold' : 'normal'); doc.setFontSize(8); cells.forEach((c, j) => doc.text(L(c).slice(0, Math.floor(cw / 4.2)), M + j * cw + 3, y)); y += 17 }
    row(head, true, 0); rows.slice(0, 45).forEach((r, i) => row(r, false, i)); y += 8 }
  const bars = (title, items) => { h1(title); const max = Math.max(...items.map((i) => i.value || 0), 1)
    items.slice(0, 10).forEach((it) => { need(20); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(40); doc.text(L(it.name).slice(0, 22), M, y)
      const w = ((it.value || 0) / max) * 300; doc.setFillColor(46, 134, 222); doc.rect(M + 130, y - 9, Math.max(w, 1), 11, 'F'); doc.text(String(Math.round((it.value || 0) * 100) / 100), M + 136 + w, y); y += 18 }); y += 6 }

  doc.setFillColor(31, 58, 95); doc.rect(0, 0, W, 110, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24); doc.text('Data Migration & Analytics Report', M, 55)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.text(L(`Source file: ${filename}`), M, 80); y = 140
  h1('Executive Summary'); p(`${T.sheets} worksheet(s) with ${T.records.toLocaleString()} records were analysed. Overall data quality is ${T.quality}%.`)
  table(['Metric', 'Value'], [['Total records', T.records], ['Total columns', T.columns], ['Missing cells', T.missing_cells], ['Duplicate records', T.duplicates], ['Invalid records', T.invalid], ['Empty rows', T.empty_rows], ['Data quality %', T.quality]])
  bars('Data quality issues', [{ name: 'Missing cells', value: T.missing_cells }, { name: 'Duplicates', value: T.duplicates }, { name: 'Invalid', value: T.invalid }, { name: 'Empty rows', value: T.empty_rows }])
  Object.entries(results).forEach(([n, { a }]) => {
    h1(`Dataset analysis – ${n}`); table(['Column', 'Type', 'Missing', 'Unique', 'Min', 'Max', 'Mean'], a.stats.map((x) => [x.column, x.type, x.missing, x.unique, x.min, x.max, x.mean]))
    const [c, d] = Object.entries(a.category_values)[0] || []; if (c) bars(`Total ${d.value_column} by ${c}`, d.data); else { const [cc, list] = Object.entries(a.categories)[0] || []; if (cc) bars(`Records by ${cc}`, list) }
    const tr = a.trends.sum_by_month; if (tr) bars(`Monthly trend – ${tr.value_column}`, tr.data.map((x) => ({ name: x.month, value: x.value })))
    h1('Insights'); a.insights.forEach((i) => p('• ' + i))
  })
  h1('Migration Results'); p(mig ? `Worksheet "${mig.sheet}": ${mig.ok.length} records migrated successfully, ${mig.bad.length} failed. Executed locally as a transform-and-export workflow.` : 'No migration has been executed yet.')
  if (mig) table(['Destination', 'Source', 'Type', 'Required'], mig.mapping.map((m) => [m.dest, m.source || '(not mapped)', m.type, m.required ? 'Yes' : 'No']))
  h1('Recommendations'); const r = []; if (T.duplicates) r.push('Remove duplicate records.'); if (T.missing_cells) r.push('Resolve missing values.'); if (T.invalid) r.push('Fix invalid values.'); if (T.empty_rows) r.push('Delete empty rows.')
  ;(r.length ? r : ['Data is clean; proceed with migration.']).forEach((x) => p('• ' + x))
  return doc.output('blob')
}
