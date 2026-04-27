'use client'

import { useState, useCallback, useEffect } from 'react'
import UploadZone from '@/components/UploadZone'
import FileQueue, { QueuedFile } from '@/components/FileQueue'
import BOQTable from '@/components/BOQTable'
import { DrawingAnalysis } from '@/lib/types'

const ANALYSIS_MSGS = [
  'טוען תמונה לענן...',
  'GPT-4o סורק את התכנית...',
  'מזהה אלמנטים קונסטרוקטיביים...',
  'מחשב כמויות ומידות...',
  'מסדר לפי ענפי עבודה...',
  'כמעט סיים...',
]

export default function Home() {
  const [files, setFiles] = useState<QueuedFile[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [analysisMsgIdx, setAnalysisMsgIdx] = useState(0)
  const [userInstruction, setUserInstruction] = useState('')

  const hasFiles = files.length > 0
  const activeFile = files.find(f => f.id === activeId) ?? null

  // Cycle through analysis messages while any file is analyzing
  const isAnalyzing = files.some(f => f.status === 'analyzing')
  useEffect(() => {
    if (!isAnalyzing) { setAnalysisMsgIdx(0); return }
    const t = setInterval(() => setAnalysisMsgIdx(p => (p + 1) % ANALYSIS_MSGS.length), 2400)
    return () => clearInterval(t)
  }, [isAnalyzing])

  // ── Add uploaded files to queue ──────────────────────────────────────────
  const handleFilesUploaded = useCallback((uploaded: { id: string; fileName: string; imageUrl: string }[]) => {
    const newFiles: QueuedFile[] = uploaded.map(u => ({
      id: u.id,
      fileName: u.fileName,
      imageUrl: u.imageUrl,
      status: 'ready' as const,
    }))
    setFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id))
      return [...prev, ...newFiles.filter(f => !existingIds.has(f.id))]
    })
    setActiveId(prev => prev ?? newFiles[0]?.id ?? null)
  }, [])

  // ── Analyze a single file ────────────────────────────────────────────────
  const analyzeFile = useCallback(async (id: string) => {
    // Snapshot imageUrl before setting status (avoids stale closure)
    const imageUrl = files.find(f => f.id === id)?.imageUrl ?? ''
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'analyzing', error: undefined } : f))
    setActiveId(id)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl, userInstruction: userInstruction.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'שגיאת ניתוח')

      setFiles(prev => prev.map(f =>
        f.id === id ? { ...f, status: 'done', analysis: data.analysis } : f
      ))
    } catch (err: unknown) {
      setFiles(prev => prev.map(f =>
        f.id === id
          ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'שגיאה לא ידועה' }
          : f
      ))
    }
  }, [files, userInstruction])

  // ── Analyze all ready files ──────────────────────────────────────────────
  const analyzeAll = useCallback(async () => {
    const readyIds = files.filter(f => f.status === 'ready').map(f => f.id)
    for (const id of readyIds) {
      await analyzeFile(id)
    }
  }, [files, analyzeFile])

  // ── Update analysis after inline edits ───────────────────────────────────
  const updateAnalysis = useCallback((id: string, updated: DrawingAnalysis) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, analysis: updated } : f))
  }, [])

  // ── Remove file ──────────────────────────────────────────────────────────
  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const next = prev.filter(f => f.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }, [activeId])

  // ── Reset all ────────────────────────────────────────────────────────────
  const reset = () => { setFiles([]); setActiveId(null) }

  // ── Stats for header ─────────────────────────────────────────────────────
  const doneCount = files.filter(f => f.status === 'done').length
  const totalItems = files
    .filter(f => f.status === 'done' && f.analysis)
    .reduce((sum, f) => sum + (f.analysis?.items.length ?? 0), 0)

  return (
    <main className="min-h-screen" dir="rtl" style={{ background: 'linear-gradient(160deg, #fff7f0 0%, #f8fafc 40%, #f8fafc 100%)' }}>

      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <button onClick={reset} className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center group-hover:bg-orange-500 transition-colors duration-200 shadow-sm">
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'serif' }}>כ</span>
            </div>
            <span className="font-bold text-slate-900 text-base tracking-tight">כּתב</span>
          </button>

          {/* Live stats */}
          {hasFiles && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  {files.length} תכניות
                </span>
                {doneCount > 0 && (
                  <>
                    <span className="text-slate-200">|</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {doneCount} נותחו
                    </span>
                  </>
                )}
                {totalItems > 0 && (
                  <>
                    <span className="text-slate-200">|</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      {totalItems} פריטים
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={reset}
                className="text-slate-400 hover:text-red-500 transition-colors duration-150 cursor-pointer font-medium px-2 py-1 rounded-lg hover:bg-red-50 text-xs"
              >
                נקה הכל
              </button>
            </div>
          )}

          {/* Logo / brand */}
          {!hasFiles && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs text-orange-600 font-semibold">GPT-4o Vision</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* ── EMPTY STATE — Upload hero ──────────────────────────────────── */}
        {!hasFiles && (
          <div className="max-w-xl mx-auto fade-up">
            {/* Hero copy */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
                כתב כמויות<br />
                <span style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  תוך שניות
                </span>
              </h1>
              <p className="text-slate-500 text-lg leading-relaxed max-w-sm mx-auto">
                העלה תכניות בנייה — AI מנתח ומחלץ כמויות אוטומטית לפי ענפי עבודה ישראליים
              </p>
            </div>

            {/* Instruction field */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-2 text-right">
                מה אתה צריך לדעת? <span className="text-slate-400 font-normal">(אופציונלי)</span>
              </label>
              <textarea
                value={userInstruction}
                onChange={e => setUserInstruction(e.target.value)}
                placeholder="לדוגמה: אני צריך לדעת כמה בטון, כמה ברזל, כמה מ&quot;ר טיח..."
                rows={2}
                className="w-full text-sm text-slate-800 placeholder:text-slate-300 bg-white border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all shadow-sm"
                dir="rtl"
              />
            </div>

            {/* Upload zone */}
            <UploadZone onFilesUploaded={handleFilesUploaded} />

            {/* How it works */}
            <div className="mt-8 grid grid-cols-3 gap-3 fade-up-2">
              {[
                {
                  num: '1',
                  icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
                  title: 'העלה PDF',
                  sub: 'גרור תכניות מהמחשב',
                },
                {
                  num: '2',
                  icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
                  title: 'AI מנתח',
                  sub: 'GPT-4o סורק הכל',
                },
                {
                  num: '3',
                  icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5',
                  title: 'ייצא Excel',
                  sub: 'כתב כמויות מלא',
                },
              ].map((step, i) => (
                <div
                  key={step.num}
                  className="relative bg-white/80 backdrop-blur rounded-2xl border border-slate-100 p-4 hover:border-orange-200 hover:shadow-md transition-all duration-200 cursor-default fade-up"
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center">
                    <span className="text-orange-600 text-xs font-bold">{step.num}</span>
                  </div>
                  <svg className="w-6 h-6 text-slate-400 mb-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={step.icon} />
                  </svg>
                  <p className="font-bold text-slate-700 text-sm">{step.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{step.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WITH FILES — Two-column layout ────────────────────────────── */}
        {hasFiles && (
          <div className="flex flex-col lg:flex-row gap-5 fade-up">

            {/* LEFT: Queue sidebar */}
            <div className="lg:w-72 shrink-0 flex flex-col gap-3">
              <FileQueue
                files={files}
                activeId={activeId}
                onAnalyze={analyzeFile}
                onAnalyzeAll={analyzeAll}
                onSelect={setActiveId}
                onRemove={removeFile}
              />
              {/* Instruction field */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  מה אתה צריך לדעת?
                </label>
                <textarea
                  value={userInstruction}
                  onChange={e => setUserInstruction(e.target.value)}
                  placeholder="לדוגמה: אני צריך לדעת כמה בטון וכמה ברזל"
                  rows={3}
                  className="w-full text-sm text-slate-800 placeholder:text-slate-300 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 transition-all"
                  dir="rtl"
                />
              </div>

              {/* Add more files */}
              <UploadZone onFilesUploaded={handleFilesUploaded} compact />
            </div>

            {/* RIGHT: Result panel */}
            <div className="flex-1 min-w-0">

              {/* No file selected */}
              {!activeFile && (
                <div className="flex flex-col items-center justify-center h-72 bg-white rounded-2xl border border-dashed border-slate-200 text-center">
                  <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                      d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
                  </svg>
                  <p className="text-slate-500 font-semibold">בחר תכנית מהרשימה</p>
                  <p className="text-slate-400 text-sm mt-1">לחץ &ldquo;נתח&rdquo; כדי לחלץ כמויות</p>
                </div>
              )}

              {/* Ready — show preview + analyze button */}
              {activeFile?.status === 'ready' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden fade-up">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm font-semibold text-slate-700">תצוגה מקדימה</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-0.5 rounded-md max-w-[200px] truncate">
                      {activeFile.fileName}
                    </span>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={activeFile.imageUrl} alt="תכנית" className="w-full h-auto max-h-[55vh] object-contain p-4 bg-slate-50" />
                  <div className="p-4 border-t border-slate-100 bg-white">
                    <button
                      onClick={() => analyzeFile(activeFile.id)}
                      className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white rounded-xl font-bold text-base transition-all duration-150 cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-orange-100"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                      נתח תכנית זו עם AI
                    </button>
                  </div>
                </div>
              )}

              {/* Analyzing — step progress */}
              {activeFile?.status === 'analyzing' && (
                <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden fade-up">
                  {/* Thumbnail header */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-orange-50/40 to-white">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeFile.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{activeFile.fileName.replace(/\.pdf$/i, '')}</p>
                      <p className="text-xs text-orange-500 font-medium mt-0.5">מנתח...</p>
                    </div>
                    {/* Orange spinning ring */}
                    <div className="relative w-10 h-10 shrink-0">
                      <div className="absolute inset-0 rounded-full border-3 border-orange-100" style={{ borderWidth: 3 }} />
                      <div className="absolute inset-0 rounded-full border-3 border-orange-500 border-t-transparent animate-spin" style={{ borderWidth: 3 }} />
                      <div className="absolute inset-1.5 rounded-full bg-orange-50 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Step list */}
                  <div className="p-6">
                    <div className="flex flex-col gap-3">
                      {ANALYSIS_MSGS.map((msg, i) => {
                        const isPast = i < analysisMsgIdx
                        const isCurrent = i === analysisMsgIdx
                        return (
                          <div key={msg} className={`flex items-center gap-3 transition-all duration-500 ${
                            isPast ? 'opacity-40' : isCurrent ? 'opacity-100' : 'opacity-25'
                          }`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                              isPast
                                ? 'bg-emerald-100'
                                : isCurrent
                                  ? 'bg-orange-100'
                                  : 'bg-slate-100'
                            }`}>
                              {isPast ? (
                                <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              ) : isCurrent ? (
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                              ) : (
                                <div className="w-2 h-2 rounded-full bg-slate-300" />
                              )}
                            </div>
                            <span className={`text-sm ${
                              isCurrent ? 'font-semibold text-slate-800' : isPast ? 'text-slate-400' : 'text-slate-300'
                            }`}>{msg}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {activeFile?.status === 'error' && (
                <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden fade-up">
                  {/* Thumbnail header */}
                  <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 bg-red-50/30">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeFile.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{activeFile.fileName.replace(/\.pdf$/i, '')}</p>
                      <p className="text-xs text-red-500 font-medium mt-0.5">שגיאה בניתוח</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-600 text-right mb-5">
                      {activeFile.error}
                    </div>
                    <button
                      onClick={() => analyzeFile(activeFile.id)}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold cursor-pointer transition-colors duration-150 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      נסה שוב
                    </button>
                  </div>
                </div>
              )}

              {/* Done — BOQ Table */}
              {activeFile?.status === 'done' && activeFile.analysis && (
                <BOQTable
                  analysis={activeFile.analysis}
                  fileName={activeFile.fileName}
                  onUpdate={updated => updateAnalysis(activeFile.id, updated)}
                />
              )}

            </div>
          </div>
        )}
      </div>
    </main>
  )
}
