import React, { useState, useEffect, useMemo } from 'react'
import { Upload, Trash2, Download as Dl } from 'lucide-react'
import { useApp } from '../hooks/useApp.jsx'
import { Kpi, Card, Empty, Select, DataTable, fmt, show } from '../components/ui.jsx'
import { cleanedRows, suggestMapping, compatible, migrate, DEFAULT_CLEAN } from '../utils/engine.js'
import { save } from '../services/excel.js'
import { workbookBlob } from '../services/excel.js'

const kb = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.ceil(n / 1024) + ' KB')

export function UploadPage() {
  const { addFiles, files, removeFile, setActiveId, setSheet, setPage, exportNow } = useApp(), [drag, setDrag] = useState(false)
  return <>
    <div className={`drop ${drag ? 'drag' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}>
      <Upload size={42} /><h2>Drop Excel or CSV files here</h2><p>.xlsx, .xls, .csv · multiple files and worksheets · processed 100% in your browser</p>
      <label className="btn primary">Choose files<input type="file" hidden multiple accept=".xlsx,.xls,.csv" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} /></label></div>
    {files.length > 0 && <Card title="Files in this session" wide><div className="tablewrap"><table><thead><tr><th>File</th><th>Size</th><th>Worksheets</th><th>Records</th><th>Columns</th><th>Quality</th><th></th></tr></thead><tbody>
      {files.map((f) => <tr key={f.id}><td><a href="#" onClick={(e) => { e.preventDefault(); setActiveId(f.id); setSheet(''); setPage('overview') }}>{f.name}</a></td><td>{kb(f.size)}</td>
        <td>{Object.keys(f.sheets).join(', ')}</td><td>{fmt(f.T.records)}</td><td>{f.T.columns}</td><td>{f.T.quality}%</td>
        <td className="nowrap"><button className="icon" title="Download original" onClick={() => { setActiveId(f.id); setTimeout(() => exportNow('original'), 0) }}><Dl size={15} /></button><button className="icon" title="Remove" onClick={() => removeFile(f.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div></Card>}</>
}

export function Preview() {
  const { file, sheet } = useApp(), { p } = file.results[sheet], rows = useMemo(() => p.all.map((it) => it.orig), [p])
  return <Card title={`${file.name} › ${sheet}  (${rows.length.toLocaleString()} rows × ${p.headers.length} columns, original data)`} wide>
    <div className="chips">{p.headers.map((h, j) => <span key={h} className="tag">{h}: {p.types[j]}</span>)}</div><DataTable key={file.id + sheet} headers={p.headers} rows={rows} /></Card>
}

const OPTS = [['trim', 'Trim extra spaces'], ['removeEmpty', 'Remove empty rows'], ['dedupe', 'Remove duplicate records'], ['convert', 'Convert data types (currency, %, dates, numbers)'], ['dropInvalid', 'Remove rows with invalid values']]
export function Cleaning() {
  const { file, sheet, clean, setClean, toast, exportNow } = useApp(), { p, a } = file.results[sheet]
  const saved = clean[file.id], [opts, setOpts] = useState(saved?.opts || DEFAULT_CLEAN), [view, setView] = useState('cleaned')
  useEffect(() => setOpts(clean[file.id]?.opts || DEFAULT_CLEAN), [file.id])
  const cleaned = useMemo(() => cleanedRows(p, opts), [p, opts])
  const views = { cleaned, original: p.all.map((i) => i.orig), duplicates: p.work.filter((i) => p.dup.has(i.n)).map((i) => i.raw), invalid: p.work.filter((i) => p.invalid.has(i.n)).map((i) => i.raw), missing: p.work.filter((i) => p.missing.has(i.n)).map((i) => i.raw) }
  return <>
    <div className="kpis"><Kpi label="Original rows" value={p.all.length} /><Kpi label="After cleaning" value={cleaned.length} tone="good" /><Kpi label="Empty rows" value={a.empty_rows} tone="warn" /><Kpi label="Duplicates" value={a.duplicates} tone="warn" /><Kpi label="Invalid" value={a.invalid} tone="bad" /><Kpi label="Rows with missing" value={a.missing_rows} tone="warn" /></div>
    <Card title="Cleaning options (the original file is never modified)" wide>
      <div className="opts">{OPTS.map(([k, l]) => <label key={k} className="chk"><input type="checkbox" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} /> {l}</label>)}</div>
      <div className="bar"><button className="btn primary" onClick={() => { setClean({ ...clean, [file.id]: { opts, approved: true } }); toast('Cleaning changes approved – exports will use them.') }}>Approve changes</button>
        <button className="btn" onClick={() => exportNow('xlsx', { names: ['Cleaned Data'], label: 'Cleaned' })}><Dl size={15} /> Download cleaned Excel</button>
        <span className="hint">{saved?.approved ? '✔ Approved settings are applied to all reports' : 'Not yet approved – defaults (all options on) are used for reports'}</span></div></Card>
    <Card title="Preview / compare" wide><div className="bar">{Object.keys(views).map((k) => <button key={k} className={`btn ${view === k ? 'primary' : ''}`} onClick={() => setView(k)}>{k} ({views[k].length.toLocaleString()})</button>)}</div>
      {views[view].length ? <DataTable key={view + file.id + sheet} headers={p.headers} rows={views[view]} /> : <Empty text="No rows in this category 🎉" />}</Card></>
}

const T2D = { numeric: 'number', currency: 'number', percentage: 'number', date: 'date' }
const TYPES = ['text', 'number', 'integer', 'date', 'boolean']
export function Migration() {
  const { files, file, sheet, mig, setMig, toast, exportNow, setBusy } = useApp()
  const [srcId, setSrcId] = useState(file.id), [srcSheet, setSrcSheet] = useState(sheet), [target, setTarget] = useState('custom'), [dest, setDest] = useState([]), [map, setMap] = useState([]), [prev, setPrev] = useState(null), [ok, setOk] = useState(false)
  const src = files.find((f) => f.id === srcId) || file, res = src.results[srcSheet] || src.results[Object.keys(src.results)[0]], p = res.p
  const targets = files.flatMap((f) => Object.keys(f.results).map((s) => [`${f.id}|${s}`, `${f.name} › ${s}`]))
  const mirror = () => p.headers.map((h, j) => ({ name: h, type: T2D[p.types[j]] || 'text', required: false }))
  useEffect(() => { setDest(mirror()); setMap([]); setPrev(null); setOk(false); setTarget('custom') }, [srcId, srcSheet])
  const pickTarget = (v) => { setTarget(v); setMap([]); setPrev(null); if (v === 'custom') return setDest(mirror()); const [fid, sn] = v.split('|'), t = files.find((f) => f.id === fid).results[sn].p
    setDest(t.headers.map((h, j) => ({ name: h, type: T2D[t.types[j]] || 'text', required: false }))) }
  const setD = (i, k, v) => setDest(dest.map((d, j) => (j === i ? { ...d, [k]: v } : d)))
  const setM = (i, k, v) => { setMap(map.map((m, j) => (j === i ? { ...m, [k]: v } : m))); setPrev(null); setOk(false) }
  const srcType = (s) => (s ? p.types[p.headers.indexOf(s)] : null)
  const doPreview = () => setPrev(migrate(p, map, { preview: true, limit: 50 }))
  const run = async () => { setBusy('Running migration…'); await new Promise((r) => setTimeout(r, 30)); const r = migrate(p, map); setMig({ ...mig, [src.id]: { ...r, mapping: map, sheet: srcSheet } }); setBusy(''); toast(`Migration done: ${r.ok.length} succeeded, ${r.bad.length} failed`, r.bad.length ? 'error' : 'ok') }
  const result = mig[src.id]
  const dlResults = () => { const heads = result.mapping.map((m) => m.dest); const blob = workbookBlob({ 'Migrated Records': [heads, ...result.ok.map((r) => heads.map((h) => r[h] ?? null))], 'Failed Records': [[...heads, 'Source row', 'Errors'], ...result.bad.map((r) => [...heads.map((h) => r[h] ?? null), r._source_row, r._errors])], 'Log': [['Log'], ...(result.log.length ? result.log : ['No errors']).map((l) => [l])] }, ['Migrated Records', 'Failed Records', 'Log']); save(blob, `Migration_${src.name.replace(/\.[^.]+$/, '')}.xlsx`) }
  return <>
    <Card title="1. Source & destination" wide><div className="bar"><b>Source:</b><Select value={srcId} onChange={(v) => { setSrcId(v); setSrcSheet(Object.keys(files.find((f) => f.id === v).results)[0]) }} options={files.map((f) => [f.id, f.name])} />
      <Select value={srcSheet} onChange={setSrcSheet} options={Object.keys(src.results)} /></div>
      <div className="bar"><b>Destination schema:</b><Select value={target} onChange={pickTarget} options={[['custom', 'Custom schema (editable)'], ...targets.map(([k, l]) => [k, 'Worksheet: ' + l])]} /></div>
      <div className="tablewrap"><table><thead><tr><th>Destination field</th><th>Type</th><th>Required</th><th></th></tr></thead><tbody>{dest.map((d, i) => <tr key={i}>
        <td><input value={d.name} onChange={(e) => setD(i, 'name', e.target.value)} /></td><td><Select value={d.type} onChange={(v) => setD(i, 'type', v)} options={TYPES} /></td>
        <td><input type="checkbox" checked={d.required} onChange={(e) => setD(i, 'required', e.target.checked)} /></td><td><button className="icon" onClick={() => setDest(dest.filter((_, j) => j !== i))}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
      <div className="bar"><button className="btn" onClick={() => setDest([...dest, { name: 'new_field', type: 'text', required: false }])}>+ Add field</button><button className="btn primary" onClick={() => { setMap(suggestMapping(p.headers, dest)); setPrev(null); setOk(false) }}>2. Auto-suggest mapping</button></div></Card>
    {map.length > 0 && <Card title="3. Column mapping (editable) & compatibility" wide><div className="tablewrap"><table><thead><tr><th>Destination</th><th>Source column</th><th>Confidence</th><th>Compatibility</th></tr></thead><tbody>{map.map((m, i) => { const st = srcType(m.source), good = !m.source || compatible(st, m.type)
      return <tr key={i}><td>{m.dest} <span className="tag">{m.type}</span>{m.required && <span className="tag bad">required</span>}</td>
        <td><Select value={m.source || ''} onChange={(v) => setM(i, 'source', v || null)} options={[['', '— not mapped —'], ...p.headers.map((h) => [h, h])]} /></td><td>{m.source ? Math.round(m.confidence * 100) + '%' : '—'}</td>
        <td>{!m.source ? (m.required ? <span className="tag bad">missing required</span> : '—') : good ? <span className="tag ok">✔ {st} → {m.type}</span> : <span className="tag bad">⚠ {st} → {m.type}</span>}</td></tr> })}</tbody></table></div>
      <div className="bar"><button className="btn primary" onClick={doPreview}>4. Preview transformation</button></div></Card>}
    {prev && <Card title={`Preview of first ${prev.ok.length + prev.bad.length} rows: ${prev.ok.length} OK · ${prev.bad.length} failed`} wide>
      {prev.ok.length > 0 && <DataTable key={'p' + prev.ok.length} headers={map.map((m) => m.dest)} rows={prev.ok.map((r) => map.map((m) => r[m.dest]))} pageSize={10} />}
      {prev.bad.length > 0 && <ul className="errs">{prev.log.slice(0, 10).map((l, i) => <li key={i}>{l}</li>)}</ul>}
      <label className="chk"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> I have reviewed the preview and approve running this migration on all {p.work.length.toLocaleString()} records</label>
      <button className="btn primary" disabled={!ok} onClick={run}>5. Execute migration (local transform)</button></Card>}
    {result && <Card title="Migration results" wide><div className="kpis"><Kpi label="Successful records" value={result.ok.length} tone="good" /><Kpi label="Failed records" value={result.bad.length} tone="bad" /></div>
      {result.log.length > 0 && <div className="tablewrap" style={{ maxHeight: 220 }}><ul className="errs">{result.log.slice(0, 300).map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
      <div className="bar"><button className="btn primary" onClick={dlResults}><Dl size={15} /> Download migration results</button><button className="btn" onClick={() => exportNow('xlsx', { names: ['Migration Mapping', 'Migration Results'], label: 'Migration_Report' })}><Dl size={15} /> Migration report</button></div>
      <p className="hint">This is a local transformation. No data was written to any external database.</p></Card>}</>
}
