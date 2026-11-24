import React, { useMemo, useState } from 'react'
import { fmtDate } from '../utils/engine.js'

export const fmt = (n) => (typeof n === 'number' ? n.toLocaleString() : n === null || n === undefined ? '—' : String(n))
export const show = (v) => (v instanceof Date ? fmtDate(v) : v === null || v === undefined ? null : String(v))
export const Kpi = ({ label, value, tone }) => <div className={`kpi ${tone || ''}`}><span>{label}</span><b>{fmt(value)}</b></div>
export const Card = ({ title, children, wide, actions }) => <div className={`card ${wide ? 'wide' : ''}`}><div className="cardhead"><h3>{title}</h3>{actions}</div>{children}</div>
export const Empty = ({ text }) => <div className="empty">{text}</div>
export const Select = ({ value, onChange, options, ...r }) => <select value={value} onChange={(e) => onChange(e.target.value)} {...r}>{options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o}>{o}</option>))}</select>

/** Searchable, sortable, filterable, paged table over arrays of arrays. */
export function DataTable({ headers, rows, pageSize = 25 }) {
  const [q, setQ] = useState(''), [sort, setSort] = useState(null), [page, setPage] = useState(1), [fc, setFc] = useState(''), [fv, setFv] = useState('')
  const data = useMemo(() => {
    let r = rows
    if (q) { const s = q.toLowerCase(); r = r.filter((row) => row.some((v) => (show(v) || '').toLowerCase().includes(s))) }
    if (fc !== '' && fv) { const j = Number(fc), s = fv.toLowerCase(); r = r.filter((row) => (show(row[j]) || '').toLowerCase().includes(s)) }
    if (sort) { const { j, d } = sort; r = [...r].sort((a, b) => { const x = a[j], y = b[j]; if (x === null || x === undefined) return 1; if (y === null || y === undefined) return -1; return (x > y ? 1 : x < y ? -1 : 0) * (d ? -1 : 1) }) }
    return r
  }, [rows, q, fc, fv, sort])
  const pages = Math.max(1, Math.ceil(data.length / pageSize)), p = Math.min(page, pages)
  return <>
    <div className="bar"><input placeholder="Search all columns…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <select value={fc} onChange={(e) => { setFc(e.target.value); setPage(1) }}><option value="">Filter column…</option>{headers.map((h, j) => <option key={j} value={j}>{h}</option>)}</select>
      {fc !== '' && <input placeholder="contains…" value={fv} onChange={(e) => { setFv(e.target.value); setPage(1) }} />}<span className="hint">{data.length.toLocaleString()} rows</span></div>
    <div className="tablewrap"><table><thead><tr>{headers.map((h, j) => <th key={j} onClick={() => setSort({ j, d: sort?.j === j ? !sort.d : false })}>{h}{sort?.j === j ? (sort.d ? ' ▼' : ' ▲') : ''}</th>)}</tr></thead>
      <tbody>{data.slice((p - 1) * pageSize, p * pageSize).map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{show(v) ?? <i className="nil">—</i>}</td>)}</tr>)}</tbody></table></div>
    <div className="bar"><button className="btn" disabled={p <= 1} onClick={() => setPage(p - 1)}>Prev</button><span>Page {p} / {pages}</span><button className="btn" disabled={p >= pages} onClick={() => setPage(p + 1)}>Next</button></div></>
}
