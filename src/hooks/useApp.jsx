import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { parseFile } from '../services/parse.js'
import { analyzeSheet, totals, DEFAULT_CLEAN } from '../utils/engine.js'
import { buildFrames, REPORTS } from '../utils/frames.js'
import { workbookBlob, save } from '../services/excel.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)
const ls = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const now = () => new Date().toLocaleString()
const tick = () => new Promise((r) => setTimeout(r, 30))

export function AppProvider({ children }) {
  const [page, setPage] = useState('upload'), [files, setFiles] = useState([]), [activeId, setActiveId] = useState(null), [sheet, setSheet] = useState('')
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light'), [toasts, setToasts] = useState([]), [busy, setBusy] = useState('')
  const [history, setHistory] = useState(() => ls('hist', [])), [downloads, setDownloads] = useState(() => ls('dls', []))
  const [clean, setClean] = useState({}), [mig, setMig] = useState({})
  const file = files.find((f) => f.id === activeId) || null
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('theme', theme) }, [theme])
  useEffect(() => { try { localStorage.setItem('hist', JSON.stringify(history.slice(0, 100))); localStorage.setItem('dls', JSON.stringify(downloads.slice(0, 200))) } catch {} }, [history, downloads])
  useEffect(() => { if (file && !file.results[sheet]) setSheet(Object.keys(file.results)[0]) }, [file, sheet])

  const toast = useCallback((msg, type = 'ok') => { const id = Math.random(); setToasts((t) => [...t, { id, msg, type }]); setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500) }, [])

  
const addFiles = async (list) => {
  const selectedFiles = Array.from(list || []);

  if (!selectedFiles.length) {
    toast('No file selected. Please choose an Excel or CSV file.', 'error');
    return;
  }

  setBusy('Reading and analysing files…');
  await tick();

  let last = null;

  try {
    for (const f of selectedFiles) {
      try {
        console.log('Selected file:', f.name, f.type, f.size);

        const { ext, sheets } = await parseFile(f);

        console.log('Parsed worksheets:', Object.keys(sheets));

        const results = {};

        Object.entries(sheets).forEach(([name, data]) => {
          results[name] = analyzeSheet(data);
        });

        const T = totals(results);

        const rec = {
          id: crypto.randomUUID(),
          name: f.name,
          size: f.size,
          ext,
          blob: f,
          sheets,
          results,
          added: now(),
          T
        };

        setFiles((current) => [...current, rec]);

        last = rec.id;

        setHistory((history) => [
          {
            id: rec.id,
            name: f.name,
            size: f.size,
            when: rec.added,
            sheets: T.sheets,
            records: T.records,
            quality: T.quality
          },
          ...history
        ]);

        toast(
          `${f.name}: ${T.sheets} sheet(s), ${T.records.toLocaleString()} records`
        );

      } catch (error) {
        console.error('Excel processing error:', f.name, error);
        toast(`${f.name}: ${error.message || String(error)}`, 'error');
      }
    }

    if (last) {
      setActiveId(last);
      setSheet('');
      setPage('overview');
    }

  } finally {
    setBusy('');
  }
};

  const removeFile = (id) => { setFiles((x) => x.filter((f) => f.id !== id)); if (activeId === id) setActiveId(null); setClean(({ [id]: _, ...r }) => r); setMig(({ [id]: _, ...r }) => r); toast('File removed from this session') }
  const cleanOpts = (f) => clean[f?.id]?.opts || DEFAULT_CLEAN

  /** type: original | xlsx | pptx | pdf | migration */
  const exportNow = async (type, opt = {}) => {
    if (!file) return toast('Upload a file first.', 'error')
    setBusy('Generating file…'); await tick()
    try {
      const base = file.name.replace(/\.[^.]+$/, ''), m = mig[file.id] || null; let blob, name
      if (type === 'original') { blob = file.blob; name = file.name }
      else if (type === 'xlsx') { const { frames } = buildFrames(file.results, cleanOpts(file), m); blob = workbookBlob(frames, opt.names || REPORTS); name = `${base}_${opt.label || 'Complete_Analysis'}.xlsx` }
      else if (type === 'pptx') { const { buildPptx, pptxBlob } = await import('../services/pptx.js'); blob = await pptxBlob(buildPptx(file.results, file.name, m, file.T)); name = `${base}_Presentation.pptx` }
      else if (type === 'pdf') { const { buildPdf } = await import('../services/pdf.js'); blob = buildPdf(file.results, file.name, m, file.T); name = `${base}_Report.pdf` }
      save(blob, name); setDownloads((d) => [{ when: now(), name, file: file.name, size: blob.size }, ...d]); toast(`Downloaded ${name}`)
    } catch (e) { console.error(e); toast('Export failed: ' + (e.message || e), 'error') }
    setBusy('')
  }
  const value = { page, setPage, files, file, activeId, setActiveId, sheet, setSheet, theme, setTheme, toasts, toast, busy, setBusy, history, setHistory, downloads, setDownloads,
    clean, setClean, mig, setMig, addFiles, removeFile, exportNow, cleanOpts }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
