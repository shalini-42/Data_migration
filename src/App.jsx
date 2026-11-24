import React from 'react'
import Layout from './layouts/Layout.jsx'
import { useApp } from './hooks/useApp.jsx'
import { Empty } from './components/ui.jsx'
import { Overview, Analysis, Quality } from './pages/DashboardPages.jsx'
import { UploadPage, Preview, Cleaning, Migration } from './pages/DataPages.jsx'
import { Reports, PptxPage, PdfPage, Downloads, HistoryPage, SettingsPage } from './pages/OutputPages.jsx'

const NEEDS_FILE = { overview: Overview, preview: Preview, analysis: Analysis, cleaning: Cleaning, migration: Migration, quality: Quality, reports: Reports, pptx: PptxPage, pdf: PdfPage }
const OTHER = { upload: UploadPage, downloads: Downloads, history: HistoryPage, settings: SettingsPage }
export default function App() {
  const { page, file, sheet } = useApp()
  const Other = OTHER[page], Page = NEEDS_FILE[page]
  return <Layout>{Other ? <Other /> : !file ? <Empty text="Upload an Excel or CSV file on the Upload page to begin." /> : !file.results[sheet] ? <Empty text="Loading…" /> : <Page />}</Layout>
}
