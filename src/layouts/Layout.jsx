import React from 'react'
import { LayoutDashboard, Upload, Table2, BarChart3, Sparkles, ArrowLeftRight, ShieldCheck, FileText, Presentation, FileDown, Download, History, Settings, Sun, Moon, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useApp } from '../hooks/useApp.jsx'
import { Select } from '../components/ui.jsx'

export const PAGES = [['overview', 'Overview Dashboard', LayoutDashboard], ['upload', 'Upload Excel', Upload], ['preview', 'Data Preview', Table2], ['analysis', 'Data Analysis', BarChart3], ['cleaning', 'Data Cleaning', Sparkles],
  ['migration', 'Data Migration', ArrowLeftRight], ['quality', 'Data Quality', ShieldCheck], ['reports', 'Reports', FileText], ['pptx', 'PowerPoint Generator', Presentation], ['pdf', 'PDF Generator', FileDown],
  ['downloads', 'Download Center', Download], ['history', 'Upload History', History], ['settings', 'Settings', Settings]]
const NO_FILE = ['upload', 'history', 'settings', 'downloads']

export default function Layout({ children }) {
  const { page, setPage, files, file, setActiveId, sheet, setSheet, theme, setTheme, toasts, busy } = useApp()
  const sheets = file ? Object.keys(file.results) : [], title = PAGES.find((p) => p[0] === page)[1]
  return <div className="app">
    <aside><div className="logo"><img src="/src/assets/logo.svg" width="26" alt="" /> DataBridge</div>
      {PAGES.map(([k, l, I]) => <button key={k} className={page === k ? 'on' : ''} onClick={() => setPage(k)} title={l}><I size={17} /><span>{l}</span></button>)}
      <div className="privacy">🔒 Files are processed locally in your browser and never uploaded.</div></aside>
    <main><header><h1>{title}</h1><div className="bar">
      {!NO_FILE.includes(page) && files.length > 0 && <Select value={file?.id || ''} onChange={(v) => { setActiveId(v); setSheet('') }} options={files.map((f) => [f.id, f.name])} />}
      {!NO_FILE.includes(page) && sheets.length > 1 && <Select value={sheet} onChange={setSheet} options={sheets} />}
      <button className="icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div></header>
      <section key={page} className="fade">{children}</section></main>
    {busy && <div className="overlay"><div className="spinner" /><p>{busy}</p></div>}
    <div className="toasts">{toasts.map((t) => <div key={t.id} className={`toast ${t.type}`}>{t.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />} {t.msg}</div>)}</div></div>
}
