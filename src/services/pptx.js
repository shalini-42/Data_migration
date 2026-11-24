import PptxGenJS from 'pptxgenjs'
import { REPORTS } from '../utils/frames.js'

const NAVY = '1F3A5F', BLUE = '2E86DE', GREY = '576574'
const COLORS = ['2E86DE', '10AC84', 'FF9F43', 'EE5253', '8E44AD', '01A3A4', '576574', 'F368E0']
export { REPORTS }

export function buildPptx(results, filename, mig, T) {
  const pptx = new PptxGenJS(); pptx.layout = 'LAYOUT_WIDE'; pptx.title = 'Data Migration & Analytics Report'
  const slide = (title) => { const s = pptx.addSlide(); s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1, fill: { color: NAVY } })
    s.addText(title, { x: 0.5, y: 0.15, w: 12.3, h: 0.7, fontSize: 28, bold: true, color: 'FFFFFF', fontFace: 'Calibri' })
    s.addText(`Source: ${filename}`, { x: 0.5, y: 7.05, w: 9, h: 0.3, fontSize: 10, color: GREY }); return s }
  const bullets = (s, lines) => s.addText(lines.map((t) => ({ text: t, options: { bullet: true, breakLine: true } })), { x: 0.6, y: 1.4, w: 12, h: 5.4, fontSize: 20, color: '1C2733', valign: 'top', paraSpaceAfter: 10 })
  const table = (s, head, rows, y = 1.4) => s.addTable([head.map((h) => ({ text: String(h), options: { bold: true, color: 'FFFFFF', fill: { color: NAVY } } })),
    ...rows.slice(0, 13).map((r, i) => r.map((v) => ({ text: v === null || v === undefined ? '' : String(v), options: { fill: { color: i % 2 ? 'F2F6FA' : 'FFFFFF' } } })))],
    { x: 0.6, y, w: 12.1, fontSize: 12, border: { type: 'solid', color: 'D0D7E2', pt: 0.5 } })
  const chart = (s, type, labels, values, name) => s.addChart(type, [{ name, labels: labels.map(String), values: values.map((v) => v || 0) }],
    { x: 0.8, y: 1.3, w: 11.7, h: 5.6, chartColors: COLORS, showLegend: type === pptx.charts.PIE || type === pptx.charts.DOUGHNUT, legendPos: 'r', showValue: type !== pptx.charts.LINE, catAxisLabelFontSize: 11, valAxisLabelFontSize: 11 })
  const entries = Object.entries(results), first = entries[0][1].a

  let s = pptx.addSlide(); s.background = { color: NAVY }
  s.addText('Data Migration & Analytics Report', { x: 0.8, y: 2.4, w: 11.5, h: 1.2, fontSize: 44, bold: true, color: 'FFFFFF' })
  s.addText(`Project introduction – analysis of "${filename}" using actual uploaded data. Processed locally in the browser.`, { x: 0.8, y: 3.8, w: 11.5, h: 1, fontSize: 20, color: 'BFD7F2' })
  s = slide('Executive Summary'); bullets(s, [`${T.sheets} worksheet(s) and ${T.records.toLocaleString()} records analysed; overall data quality ${T.quality}%.`, ...first.insights.slice(1, 5)])
  s = slide('Dataset Overview'); table(s, ['Worksheet', 'Records', 'Columns', 'Quality %'], entries.map(([n, { a }]) => [n, a.records, a.columns, a.quality]))
  s = slide('KPI Statistics'); table(s, ['Metric', 'Value'], [['Total records', T.records], ['Total columns', T.columns], ['Missing cells', T.missing_cells], ['Duplicate records', T.duplicates], ['Invalid records', T.invalid], ['Empty rows', T.empty_rows], ['Data quality %', T.quality]])
  entries.slice(0, 6).forEach(([n, { a }]) => { s = slide(`Data Analysis – ${n}`.slice(0, 60)); table(s, ['Column', 'Type', 'Missing', 'Unique', 'Min', 'Max', 'Mean'], a.stats.map((x) => [x.column, x.type, x.missing, x.unique, x.min, x.max, x.mean])) })
  s = slide('Data Quality Analysis'); chart(s, pptx.charts.BAR, ['Missing cells', 'Duplicates', 'Invalid', 'Empty rows'], [T.missing_cells, T.duplicates, T.invalid, T.empty_rows], 'Count')
  s = slide('Missing & Duplicate Records'); table(s, ['Worksheet', 'Rows with missing', 'Duplicates', 'Invalid', 'Empty rows'], entries.map(([n, { a }]) => [n, a.missing_rows, a.duplicates, a.invalid, a.empty_rows]))
  s = slide('Migration Overview'); bullets(s, mig ? [`Source worksheet: ${mig.sheet}`, `Destination fields: ${mig.mapping.length}`, `Successful records: ${mig.ok.length}`, `Failed records: ${mig.bad.length}`, 'Migration was executed locally as a transform-and-export workflow.'] : ['No migration has been executed yet. Use the Data Migration page to map, preview, approve and run one.'])
  s = slide('Column Mapping'); table(s, ['Destination', 'Source', 'Type', 'Required'], mig ? mig.mapping.map((m) => [m.dest, m.source || '(not mapped)', m.type, m.required ? 'Yes' : 'No']) : [['—', '—', '—', '—']])
  s = slide('Migration Results'); chart(s, pptx.charts.DOUGHNUT, ['Successful', 'Failed'], [mig ? mig.ok.length : 0, mig ? mig.bad.length : 0], 'Records')
  entries.slice(0, 3).forEach(([n, { a }]) => {
    const [c, d] = Object.entries(a.category_values)[0] || []
    if (c) { s = slide(`Graphical Analysis – ${c}`.slice(0, 60)); chart(s, pptx.charts.BAR, d.data.map((x) => x.name), d.data.map((x) => x.value), `Total ${d.value_column}`) }
    else { const [cc, list] = Object.entries(a.categories)[0] || []; if (cc) { s = slide(`Graphical Analysis – ${cc}`.slice(0, 60)); chart(s, pptx.charts.PIE, list.map((x) => x.name), list.map((x) => x.value), cc) } }
    const tr = a.trends.sum_by_month; if (tr) { s = slide(`Monthly Trend – ${tr.value_column}`.slice(0, 60)); chart(s, pptx.charts.LINE, tr.data.map((x) => x.month), tr.data.map((x) => x.value), tr.value_column) }
  })
  s = slide('Business Insights'); bullets(s, entries.flatMap(([, { a }]) => a.insights).slice(0, 8))
  const recs = []; if (T.duplicates) recs.push('Remove duplicate records before migration.'); if (T.missing_cells) recs.push('Fill or validate missing values, starting with the sparsest columns.')
  if (T.invalid) recs.push('Correct values that do not match their detected column type.'); if (T.empty_rows) recs.push('Delete empty rows from the source files.')
  s = slide('Recommendations'); bullets(s, recs.length ? recs : ['Data is clean; proceed with migration.'])
  s = slide('Conclusion'); bullets(s, [`Overall data quality: ${T.quality}%.`, 'Review the column mapping and approve the migration once the issues above are resolved.', 'All processing happened locally; no data left your device.'])
  return pptx
}
export const pptxBlob = (pptx) => pptx.write({ outputType: 'blob' })
