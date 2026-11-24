import React from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import { useApp } from '../hooks/useApp.jsx'
import { Kpi, Card, Empty, fmt } from '../components/ui.jsx'

export const COLORS = ['#2e86de', '#10ac84', '#ff9f43', '#ee5253', '#8e44ad', '#01a3a4', '#576574', '#f368e0']
const H = 260
const useA = () => { const { file, sheet } = useApp(); return file.results[sheet].a }

export function Overview() {
  const a = useA(), cat = Object.entries(a.categories)[0], cv = Object.entries(a.category_values)[0], tr = a.trends
  const nums = a.stats.filter((s) => s.mean !== undefined && s.mean !== null).slice(0, 10).map((s) => ({ name: s.column, mean: s.mean }))
  const qd = [{ name: 'Valid', value: Math.max(a.valid, 0) }, { name: 'Duplicates', value: a.duplicates }, { name: 'Invalid', value: a.invalid }]
  return <>
    <div className="kpis"><Kpi label="Total records" value={a.records} /><Kpi label="Valid records" value={a.valid} tone="good" /><Kpi label="Missing values" value={a.missing_cells} tone="warn" />
      <Kpi label="Duplicates" value={a.duplicates} tone="warn" /><Kpi label="Invalid" value={a.invalid} tone="bad" /><Kpi label="Quality score %" value={a.quality} tone="good" /></div>
    <div className="grid">
      {cat && <Card title={`Category: ${cat[0]}`}><ResponsiveContainer height={H}><BarChart data={cat[1]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#2e86de" /></BarChart></ResponsiveContainer></Card>}
      {cat && <Card title={`Share by ${cat[0]}`}><ResponsiveContainer height={H}><PieChart><Pie data={cat[1]} dataKey="value" nameKey="name" outerRadius={90} label>{cat[1].map((_, i) => <Cell key={i} fill={COLORS[i % 8]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Card>}
      {cv && <Card title={`Total ${cv[1].value_column} by ${cv[0]}`}><ResponsiveContainer height={H}><BarChart data={cv[1].data} layout="vertical"><XAxis type="number" /><YAxis type="category" dataKey="name" width={90} /><Tooltip /><Bar dataKey="value" fill="#10ac84" /></BarChart></ResponsiveContainer></Card>}
      {tr.records_by_month && <Card title={`Records per month (${tr.records_by_month.date_column})`}><ResponsiveContainer height={H}><AreaChart data={tr.records_by_month.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Area dataKey="count" stroke="#8e44ad" fill="#8e44ad55" /></AreaChart></ResponsiveContainer></Card>}
      {tr.sum_by_month && <Card title={`Monthly trend: ${tr.sum_by_month.value_column}`}><ResponsiveContainer height={H}><LineChart data={tr.sum_by_month.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="value" stroke="#ff9f43" strokeWidth={2} /></LineChart></ResponsiveContainer></Card>}
      {nums.length > 0 && <Card title="Numerical analysis – average per column"><ResponsiveContainer height={H}><BarChart data={nums}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="mean" fill="#01a3a4" /></BarChart></ResponsiveContainer></Card>}
      <Card title="Data quality (donut)"><ResponsiveContainer height={H}><PieChart><Pie data={qd} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>{qd.map((_, i) => <Cell key={i} fill={['#10ac84', '#ff9f43', '#ee5253'][i]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></Card>
    </div>
    <Card title="Business insights" wide><ul>{a.insights.map((i, k) => <li key={k}>{i}</li>)}</ul></Card></>
}

export function Analysis() {
  const a = useA()
  return <><div className="kpis">{Object.entries(a.types).map(([t, n]) => <Kpi key={t} label={`${t} columns`} value={n} />)}<Kpi label="Empty columns" value={a.empty_columns} tone="warn" /></div>
    <Card title="Column statistics" wide><div className="tablewrap"><table><thead><tr>{['Column', 'Type', 'Missing', 'Missing %', 'Unique', 'Min', 'Max', 'Mean', 'Median', 'Sum'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{a.stats.map((r) => <tr key={r.column}><td>{r.column}</td><td><span className="tag">{r.type}</span></td><td>{r.missing}</td><td>{r.missing_pct}</td><td>{r.unique}</td><td>{fmt(r.min)}</td><td>{fmt(r.max)}</td><td>{fmt(r.mean)}</td><td>{fmt(r.median)}</td><td>{fmt(r.sum)}</td></tr>)}</tbody></table></div></Card>
    {Object.entries(a.categories).length > 0 && <div className="grid">{Object.entries(a.categories).slice(0, 4).map(([c, d]) => <Card key={c} title={`Category counts: ${c}`}><ResponsiveContainer height={H}><BarChart data={d}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="value" fill="#8e44ad" /></BarChart></ResponsiveContainer></Card>)}</div>}</>
}

export function Quality() {
  const { file } = useApp(), rows = Object.entries(file.results).map(([n, { a }]) => ({ name: n, quality: a.quality, missing: a.missing_cells, duplicates: a.duplicates, invalid: a.invalid }))
  if (!rows.length) return <Empty text="No worksheets" />
  return <><Card title="Quality % per worksheet" wide><ResponsiveContainer height={280}><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="quality" fill="#10ac84" /></BarChart></ResponsiveContainer></Card>
    <Card title="Issues per worksheet" wide><ResponsiveContainer height={280}><BarChart data={rows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="missing" fill="#ff9f43" /><Bar dataKey="duplicates" fill="#8e44ad" /><Bar dataKey="invalid" fill="#ee5253" /></BarChart></ResponsiveContainer></Card>
    <Card title="Worksheet detail" wide><div className="tablewrap"><table><thead><tr>{['Worksheet', 'Records', 'Missing cells', 'Rows with missing', 'Duplicates', 'Invalid', 'Empty rows', 'Quality %'].map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{Object.entries(file.results).map(([n, { a }]) => <tr key={n}><td>{n}</td><td>{fmt(a.records)}</td><td>{a.missing_cells}</td><td>{a.missing_rows}</td><td>{a.duplicates}</td><td>{a.invalid}</td><td>{a.empty_rows}</td><td>{a.quality}</td></tr>)}</tbody></table></div></Card></>
}
