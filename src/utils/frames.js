// Builds every report as an array-of-arrays (AOA), shared by Excel / PPT / PDF modules.
import { cleanedRows, rowsBy, totals, DEFAULT_CLEAN, fmtDate } from './engine.js'
const cell = (v) => (v instanceof Date ? fmtDate(v) : v === undefined ? null : v)
export const REPORTS = ['Executive Summary', 'Original Data', 'Cleaned Data', 'Data Analysis', 'Column Statistics', 'Missing Records', 'Duplicate Records', 'Invalid Records',
  'Data Quality Report', 'Migration Mapping', 'Migration Results', 'Business Insights']

export function buildFrames(results, clean = DEFAULT_CLEAN, mig = null) {
  const multi = Object.keys(results).length > 1, F = Object.fromEntries(REPORTS.map((r) => [r, []]))
  const data = (name, headers, rows) => { if (!F[name].length) F[name].push(multi ? ['Source Sheet', ...headers] : headers); rows.forEach((r) => F[name].push((multi ? [name_ctx, ...r] : r).map(cell))) }
  let name_ctx = ''
  const T = totals(results)
  F['Executive Summary'].push(['Sheet', 'Records', 'Columns', 'Missing cells', 'Duplicates', 'Invalid', 'Empty rows', 'Quality %'])
  F['Data Quality Report'].push(['Sheet', 'Rows with missing', 'Duplicates', 'Invalid', 'Empty rows', 'Empty columns', 'Quality %'])
  F['Column Statistics'].push(['Sheet', 'Column', 'Type', 'Missing', 'Missing %', 'Unique', 'Min', 'Max', 'Mean', 'Median', 'Sum'])
  F['Data Analysis'].push(['Sheet', 'Category column', 'Category', 'Count', 'Total (value column)'])
  F['Business Insights'].push(['Sheet', 'Insight'])
  for (const [sn, { p, a }] of Object.entries(results)) {
    name_ctx = sn
    F['Executive Summary'].push([sn, a.records, a.columns, a.missing_cells, a.duplicates, a.invalid, a.empty_rows, a.quality])
    F['Data Quality Report'].push([sn, a.missing_rows, a.duplicates, a.invalid, a.empty_rows, a.empty_columns, a.quality])
    a.stats.forEach((s) => F['Column Statistics'].push([sn, s.column, s.type, s.missing, s.missing_pct, s.unique, cell(s.min), cell(s.max), s.mean ?? null, s.median ?? null, s.sum ?? null]))
    Object.entries(a.categories).forEach(([c, list]) => list.forEach((x) => { const v = a.category_values[c]?.data.find((y) => y.name === x.name); F['Data Analysis'].push([sn, c, x.name, x.value, v ? v.value : null]) }))
    a.insights.forEach((i) => F['Business Insights'].push([sn, i]))
    data('Original Data', p.headers, p.all.map((it) => it.orig)); data('Cleaned Data', p.headers, cleanedRows(p, clean))
    data('Missing Records', ['Source Row', ...p.headers], rowsBy(p, p.missing).map((it) => [it.n, ...it.raw]))
    data('Duplicate Records', ['Source Row', ...p.headers], rowsBy(p, p.dup).map((it) => [it.n, ...it.raw]))
    data('Invalid Records', ['Source Row', ...p.headers], rowsBy(p, p.invalid).map((it) => [it.n, ...it.raw]))
  }
  // fix multi-sheet header duplication for record sheets handled by data(); ensure empty sheets get a note
  F['Migration Mapping'] = mig ? [['Destination', 'Source', 'Type', 'Required', 'Confidence'], ...mig.mapping.map((m) => [m.dest, m.source || '(not mapped)', m.type, m.required ? 'Yes' : 'No', m.confidence ?? ''])] : [['Info'], ['No mapping has been defined yet.']]
  if (mig) { const heads = mig.mapping.map((m) => m.dest); F['Migration Results'] = [['Status', 'Source row', ...heads, 'Errors'],
    ...mig.ok.map((r) => ['SUCCESS', '', ...heads.map((h) => cell(r[h])), '']), ...mig.bad.map((r) => ['FAILED', r._source_row, ...heads.map((h) => cell(r[h])), r._errors])] }
  else F['Migration Results'] = [['Info'], ['No migration has been executed yet.']]
  REPORTS.forEach((r) => { if (F[r].length <= 1 && !['Migration Mapping', 'Migration Results'].includes(r)) F[r] = [[F[r][0]?.[0] ?? 'Info'], ['No records in this category.']] })
  return { frames: F, totals: T }
}
