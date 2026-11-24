import React from 'react'
import { Download, Trash2 } from 'lucide-react'
import { useApp } from '../hooks/useApp.jsx'
import { Card, Empty, Kpi, fmt } from '../components/ui.jsx'
import { REPORTS } from '../utils/frames.js'

const B = ({ onClick, children, primary }) => <button className={`btn ${primary ? 'primary' : ''}`} onClick={onClick}><Download size={15} /> {children}</button>
const QUALITY = ['Executive Summary', 'Data Quality Report', 'Column Statistics', 'Missing Records', 'Duplicate Records', 'Invalid Records']

export function Reports() {
  const { exportNow, file } = useApp()
  const all = async () => { await exportNow('xlsx'); await exportNow('pptx'); await exportNow('pdf') }
  return <Card title={`Excel reports – ${file.name}`} wide><div className="bar wrapbar">
    <B onClick={() => exportNow('original')}>Download Original Excel</B><B onClick={() => exportNow('xlsx', { names: ['Cleaned Data'], label: 'Cleaned' })}>Download Cleaned Excel</B>
    <B primary onClick={() => exportNow('xlsx')}>Download Complete Analysis</B><B onClick={() => exportNow('xlsx', { names: QUALITY, label: 'Data_Quality_Report' })}>Download Data Quality Report</B>
    <B onClick={() => exportNow('xlsx', { names: ['Migration Mapping', 'Migration Results'], label: 'Migration_Report' })}>Download Migration Report</B><B primary onClick={all}>Download All Reports (XLSX + PPTX + PDF)</B></div>
    <h4>Individual worksheets</h4><div className="bar wrapbar">{REPORTS.map((r) => <B key={r} onClick={() => exportNow('xlsx', { names: [r], label: r.replace(/ /g, '_') })}>{r}</B>)}</div>
    <p className="hint">Reports use your approved cleaning settings and your latest migration for this file. If your browser blocks multiple downloads, allow them for this page.</p></Card>
}
export const PptxPage = () => { const { exportNow } = useApp(); return <Card title="PowerPoint generator"><p>Builds an editable corporate deck (editable text, tables and native charts) from your analysis and latest migration: introduction, summary, overview, KPIs, quality, migration, charts, insights, recommendations and conclusion.</p><B primary onClick={() => exportNow('pptx')}>Download PowerPoint</B></Card> }
export const PdfPage = () => { const { exportNow } = useApp(); return <Card title="PDF report generator"><p>Executive summary, dataset analysis, quality, charts, migration results and recommendations.</p><B primary onClick={() => exportNow('pdf')}>Download PDF</B></Card> }

export function Downloads() {
  const { downloads, setDownloads } = useApp()
  return <Card title="Download history (this browser)" wide actions={downloads.length > 0 && <button className="btn" onClick={() => setDownloads([])}>Clear</button>}>{downloads.length ? <div className="tablewrap"><table><thead><tr><th>When</th><th>File</th><th>Source</th><th>Size</th></tr></thead><tbody>{downloads.map((d, i) => <tr key={i}><td>{d.when}</td><td>{d.name}</td><td>{d.file}</td><td>{fmt(Math.ceil(d.size / 1024))} KB</td></tr>)}</tbody></table></div> : <Empty text="No downloads yet. Generate files from Reports, PowerPoint or PDF pages." />}</Card>
}
export function HistoryPage() {
  const { history, setHistory, files, removeFile, setActiveId, setSheet, setPage } = useApp()
  return <Card title="Upload history" wide actions={history.length > 0 && <button className="btn" onClick={() => setHistory([])}>Clear history</button>}>
    <p className="hint">History keeps file names and statistics only. File contents stay in memory for this session and are gone after you close or refresh the tab – re-upload to analyse again.</p>
    {history.length ? <div className="tablewrap"><table><thead><tr><th>File</th><th>Uploaded</th><th>Sheets</th><th>Records</th><th>Quality</th><th>Status</th><th></th></tr></thead><tbody>{history.map((h) => { const live = files.find((f) => f.id === h.id)
      return <tr key={h.id}><td>{live ? <a href="#" onClick={(e) => { e.preventDefault(); setActiveId(h.id); setSheet(''); setPage('overview') }}>{h.name}</a> : h.name}</td><td>{h.when}</td><td>{h.sheets}</td><td>{fmt(h.records)}</td><td>{h.quality}%</td><td>{live ? <span className="tag ok">loaded</span> : <span className="tag">not loaded</span>}</td>
        <td><button className="icon" title="Remove" onClick={() => { if (live) removeFile(h.id); setHistory(history.filter((x) => x.id !== h.id)) }}><Trash2 size={14} /></button></td></tr> })}</tbody></table></div> : <Empty text="No uploads yet." />}</Card>
}
export function SettingsPage() {
  const { theme, setTheme, setHistory, setDownloads, toast } = useApp()
  return <><Card title="Appearance"><div className="bar"><button className={`btn ${theme === 'light' ? 'primary' : ''}`} onClick={() => setTheme('light')}>Light</button><button className={`btn ${theme === 'dark' ? 'primary' : ''}`} onClick={() => setTheme('dark')}>Dark</button></div></Card>
    <Card title="Privacy & data"><p>All processing happens in your browser. No data is sent to any server. Only file names, statistics and download history are stored in this browser's localStorage.</p>
      <button className="btn" onClick={() => { setHistory([]); setDownloads([]); localStorage.removeItem('hist'); localStorage.removeItem('dls'); toast('Local history cleared') }}>Clear all stored history</button></Card>
    <Card title="Limits"><p>Maximum file size: 50 MB per file. Very large workbooks (hundreds of thousands of rows) may take time and memory in the browser.</p></Card></>
}
