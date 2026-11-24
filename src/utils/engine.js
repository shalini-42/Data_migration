// Pure analysis / cleaning / migration engine. No library dependencies.
const CUR = /^[$€£₹]\s?-?[\d,]+(\.\d+)?$/, PCT = /^-?[\d.]+\s?%$/
export const isNil = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
const tidy = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v)
const pad = (n) => String(n).padStart(2, '0')
export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
export const parseDate = (v) => {
  if (v instanceof Date) return isNaN(v) ? null : v
  if (typeof v !== 'string') return null
  const s = v.trim(); if (!/[-/]|^[A-Za-z]{3,9} \d/.test(s)) return null
  const d = new Date(s); return isNaN(d) ? null : d
}
export const toNum = (v) => { if (typeof v === 'number') return v; const n = parseFloat(String(v).replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n }
const round = (x) => (x === null || x === undefined || isNaN(x) ? null : Math.round(x * 100) / 100)
export const DEFAULT_CLEAN = { trim: true, removeEmpty: true, dedupe: true, convert: true, dropInvalid: true }

export function dedupeHeaders(h) {
  const seen = {}
  return h.map((x, i) => { let n = isNil(x) ? `Column_${i + 1}` : String(x).trim(); if (seen[n]) { seen[n]++; n = `${n}_${seen[n]}` } else seen[n] = 1; return n })
}

export function colType(values, name = '') {
  const nn = values.filter((v) => !isNil(v)); if (!nn.length) return 'empty'
  const frac = (f) => nn.filter(f).length / nn.length, uniq = new Set(nn.map(String)).size / nn.length
  if (frac((v) => v instanceof Date) > 0.8) return 'date'
  if (frac((v) => typeof v === 'number') > 0.9) return /(^|[_\s])(id|code|no|number)$/i.test(name.trim()) && uniq > 0.95 ? 'identifier' : 'numeric'
  if (frac((v) => typeof v === 'boolean') > 0.9) return 'category'
  const str = (f) => nn.filter((v) => typeof v === 'string' && f(v.trim())).length / nn.length
  if (str((s) => CUR.test(s)) > 0.8) return 'currency'
  if (str((s) => PCT.test(s)) > 0.8) return 'percentage'
  if (str((s) => parseDate(s) !== null) > 0.8) return 'date'
  if (nn.length > 1 && uniq > 0.95) return 'identifier'
  if (new Set(nn.map(String)).size <= Math.max(20, 0.05 * nn.length)) return 'category'
  return 'text'
}
const convertValue = (v, t) => {
  if (isNil(v)) return null
  if (t === 'currency' || t === 'percentage' || t === 'numeric') return toNum(v)
  if (t === 'date') return parseDate(v)
  return v
}
const keyOf = (row) => JSON.stringify(row.map((v) => (v instanceof Date ? v.getTime() : v)))

/** sheet = {headers:[], rows:[[...]]}. Returns issue sets keyed by Excel row number (header = row 1). */
export function prepare(sheet) {
  const headers = sheet.headers
  const all = sheet.rows.map((r, i) => ({ n: i + 2, orig: headers.map((_, j) => (r[j] === undefined ? null : r[j])) }))
  all.forEach((it) => { it.raw = it.orig.map((v) => { const t = tidy(v); return isNil(t) ? null : t }) })
  const empty = all.filter((it) => it.raw.every((v) => v === null)), work = all.filter((it) => !it.raw.every((v) => v === null))
  const types = headers.map((h, j) => colType(work.map((it) => it.raw[j]), h))
  const invalid = new Set(), dup = new Set(), missing = new Set(), seen = new Set()
  work.forEach((it) => {
    it.conv = it.raw.map((v, j) => {
      if (!['currency', 'percentage', 'date', 'numeric'].includes(types[j])) return v
      const c = convertValue(v, types[j]); if (v !== null && c === null) invalid.add(it.n); return c
    })
    if (it.raw.some((v) => v === null)) missing.add(it.n)
    const k = keyOf(it.conv); if (seen.has(k)) dup.add(it.n); else seen.add(k)
  })
  return { headers, types, all, work, empty, invalid, dup, missing }
}

export function cleanedRows(p, o = DEFAULT_CLEAN) {
  const items = o.removeEmpty ? p.work : p.all
  return items.filter((it) => !(o.dedupe && p.dup.has(it.n)) && !(o.dropInvalid && p.invalid.has(it.n)))
    .map((it) => (o.convert && it.conv ? it.conv : o.trim ? it.raw : it.orig))
}
export const rowsBy = (p, set) => p.work.filter((it) => set.has(it.n))

export function analyzeSheet(sheet) {
  const p = prepare(sheet), { headers, types, work } = p, n = work.length, cols = headers.length
  const mcells = work.reduce((s, it) => s + it.raw.filter((v) => v === null).length, 0)
  const quality = n ? Math.max(0, round(100 * (1 - (mcells + p.invalid.size) / Math.max(n * cols, 1)) * (1 - p.dup.size / n))) : 0
  const col = (j) => work.map((it) => it.conv[j])
  const stats = headers.map((h, j) => {
    const vals = col(j), nn = vals.filter((v) => !isNil(v)), t = types[j]
    const miss = work.filter((it) => it.raw[j] === null).length
    const r = { column: h, type: t, missing: miss, missing_pct: n ? round((100 * miss) / n) : 0, unique: new Set(nn.map((v) => (v instanceof Date ? v.getTime() : v))).size }
    if (['numeric', 'currency', 'percentage'].includes(t) && nn.length) {
      const nums = nn.filter((v) => typeof v === 'number').sort((a, b) => a - b), s = nums.reduce((a, b) => a + b, 0)
      Object.assign(r, { min: nums[0], max: nums[nums.length - 1], mean: round(s / nums.length), median: nums.length % 2 ? nums[(nums.length - 1) / 2] : round((nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2), sum: round(s) })
    } else if (t === 'date' && nn.length) { const ds = nn.filter((v) => v instanceof Date).sort((a, b) => a - b); if (ds.length) Object.assign(r, { min: fmtDate(ds[0]), max: fmtDate(ds[ds.length - 1]) }) }
    return r
  })
  const idx = (f) => types.map((t, j) => (f(t) ? j : -1)).filter((j) => j >= 0)
  const catIdx = idx((t) => t === 'category'), numIdx = idx((t) => ['numeric', 'currency', 'percentage'].includes(t)), dateIdx = idx((t) => t === 'date')
  const categories = {}, category_values = {}, trends = {}
  catIdx.forEach((j) => {
    const m = new Map(); work.forEach((it) => { const v = it.raw[j]; if (v !== null) m.set(String(v), (m.get(String(v)) || 0) + 1) })
    categories[headers[j]] = [...m].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, value]) => ({ name, value }))
    if (numIdx.length) {
      const s = new Map(); work.forEach((it) => { const v = it.raw[j], x = it.conv[numIdx[0]]; if (v !== null && typeof x === 'number') s.set(String(v), (s.get(String(v)) || 0) + x) })
      category_values[headers[j]] = { value_column: headers[numIdx[0]], data: [...s].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value: round(value) })) }
    }
  })
  if (dateIdx.length) {
    const j = dateIdx[0], cnt = new Map(), sum = new Map()
    work.forEach((it) => { const d = it.conv[j]; if (!(d instanceof Date)) return; const k = monthKey(d); cnt.set(k, (cnt.get(k) || 0) + 1)
      if (numIdx.length && typeof it.conv[numIdx[0]] === 'number') sum.set(k, (sum.get(k) || 0) + it.conv[numIdx[0]]) })
    const sorted = (m) => [...m].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    trends.records_by_month = { date_column: headers[j], data: sorted(cnt).map(([month, count]) => ({ month, count })) }
    if (numIdx.length) trends.sum_by_month = { value_column: headers[numIdx[0]], data: sorted(sum).map(([month, value]) => ({ month, value: round(value) })) }
  }
  const insights = [`${n.toLocaleString()} records and ${cols} columns were analysed; data quality is ${quality}%.`]
  if (p.dup.size) insights.push(`${p.dup.size} duplicate records (${((100 * p.dup.size) / n).toFixed(1)}%) should be removed before migration.`)
  const worst = [...stats].sort((a, b) => b.missing_pct - a.missing_pct)[0]
  if (worst && worst.missing > 0) insights.push(`Column '${worst.column}' has the most missing values (${worst.missing_pct}%).`)
  if (p.invalid.size) insights.push(`${p.invalid.size} records contain values that do not match their detected column type.`)
  Object.entries(category_values).slice(0, 2).forEach(([c, d]) => d.data[0] && insights.push(`By '${c}', '${d.data[0].name}' has the highest total ${d.value_column}.`))
  const empties = headers.filter((_, j) => types[j] === 'empty'); if (empties.length) insights.push(`${empties.length} column(s) are completely empty: ${empties.join(', ')}.`)
  const tc = {}; types.forEach((t) => (tc[t] = (tc[t] || 0) + 1))
  return { p, a: { records: n, columns: cols, missing_cells: mcells, missing_rows: p.missing.size, duplicates: p.dup.size, empty_rows: p.empty.length, empty_columns: empties.length, invalid: p.invalid.size,
    valid: n - p.invalid.size - p.dup.size, quality, stats, categories, category_values, trends, insights, types: tc } }
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')
const lev = (a, b) => { const m = a.length, n = b.length; if (!m || !n) return 0; let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur }
  return 1 - prev[n] / Math.max(m, n) }
export function suggestMapping(sourceHeaders, dest) {
  const used = new Set()
  return dest.map((d) => {
    let best = null, score = 0
    sourceHeaders.forEach((s) => { if (used.has(s)) return; const a = norm(s), b = norm(d.name); let r = lev(a, b); if (a && b && (a.includes(b) || b.includes(a))) r = Math.max(r, 0.85); if (r > score) { best = s; score = r } })
    if (best && score >= 0.6) used.add(best)
    return { dest: d.name, type: d.type || 'text', required: !!d.required, source: best && score >= 0.6 ? best : null, confidence: round(score) }
  })
}
export function compatible(srcType, destType) {
  if (destType === 'text') return true
  if (destType === 'number' || destType === 'integer') return ['numeric', 'currency', 'percentage', 'identifier'].includes(srcType)
  if (destType === 'date') return srcType === 'date'
  return true
}

/** mapping: [{dest,source,type,required}] -> {ok:[{...}], bad:[{..., _source_row, _errors}], log:[]} */
export function migrate(p, mapping, { preview = false, limit = 50 } = {}) {
  const ok = [], bad = [], log = [], seen = new Set(), srcIdx = (s) => p.headers.indexOf(s)
  for (const it of p.work) {
    const rec = {}, errs = []
    for (const m of mapping) {
      const j = m.source ? srcIdx(m.source) : -1
      if (j < 0) { rec[m.dest] = null; if (m.required) errs.push(`${m.dest}: no source mapped`); continue }
      let v = it.raw[j]
      if (v === null) { rec[m.dest] = null; if (m.required) errs.push(`${m.dest}: required value missing`); continue }
      if (m.type === 'number' || m.type === 'integer') { const x = toNum(v); if (x === null) { errs.push(`${m.dest}: cannot convert '${v}' to ${m.type}`); v = null } else v = m.type === 'integer' ? Math.trunc(x) : x }
      else if (m.type === 'date') { const d = parseDate(v); if (!d) { errs.push(`${m.dest}: cannot convert '${v}' to date`); v = null } else v = fmtDate(d) }
      else if (m.type === 'boolean') v = ['1', 'true', 'yes', 'y'].includes(String(v).trim().toLowerCase())
      else v = v instanceof Date ? fmtDate(v) : String(v)
      rec[m.dest] = v
    }
    const k = JSON.stringify(Object.values(rec)); if (!errs.length && seen.has(k)) errs.push('duplicate record'); seen.add(k)
    if (errs.length) { bad.push({ ...rec, _source_row: it.n, _errors: errs.join('; ') }); log.push(`Row ${it.n}: FAILED - ${errs.join('; ')}`) } else ok.push(rec)
    if (preview && ok.length + bad.length >= limit) break
  }
  return { ok, bad, log }
}

export function totals(results) {
  const list = Object.values(results).map((r) => r.a), sum = (k) => list.reduce((s, a) => s + a[k], 0), rec = sum('records')
  return { sheets: list.length, records: rec, columns: sum('columns'), missing_cells: sum('missing_cells'), duplicates: sum('duplicates'), invalid: sum('invalid'), empty_rows: sum('empty_rows'),
    quality: rec ? round(list.reduce((s, a) => s + a.quality * a.records, 0) / rec) : 0 }
}
