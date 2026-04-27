'use client'

import { useCallback, useState } from 'react'

interface UploadedFile {
  id: string
  fileName: string
}

interface Props {
  onFilesUploaded: (files: UploadedFile[]) => void
  compact?: boolean
}

export default function UploadZone({ onFilesUploaded, compact = false }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [currentFile, setCurrentFile] = useState('')
  const [error, setError] = useState<string | null>(null)

  const uploadFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'))
    if (pdfs.length === 0) { setError('יש להעלות קבצי PDF בלבד'); return }

    setUploading(true)
    setError(null)
    setProgress(0)
    setUploadingCount(pdfs.length)

    const results: UploadedFile[] = []
    for (let i = 0; i < pdfs.length; i++) {
      const file = pdfs[i]
      setCurrentFile(file.name.replace(/\.pdf$/i, '').replace(/^100-GWE-/, '').replace(/-00$/, ''))
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        results.push({ id: data.id, fileName: file.name })
      } catch {
        // skip failed files silently
      }
      setProgress(Math.round(((i + 1) / pdfs.length) * 100))
    }

    setUploading(false)
    setProgress(0)
    setCurrentFile('')
    if (results.length > 0) onFilesUploaded(results)
    if (results.length < pdfs.length) {
      setError(`${pdfs.length - results.length} קבצים נכשלו בהעלאה`)
    }
  }, [onFilesUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) uploadFiles(files)
  }, [uploadFiles])

  // ── COMPACT MODE ───────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className="w-full">
        <label
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`relative flex items-center justify-center gap-3 w-full h-12 rounded-xl cursor-pointer transition-all duration-200 overflow-hidden ${
            isDragging
              ? 'bg-orange-50'
              : 'bg-white hover:bg-orange-50/50'
          } ${uploading ? 'opacity-70 pointer-events-none' : ''}`}
          style={{ border: isDragging ? '2px dashed #f97316' : '2px dashed #e2e8f0' }}
        >
          <input type="file" accept=".pdf" multiple className="hidden"
            onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) uploadFiles(fs); e.target.value = '' }} />

          {uploading ? (
            <div className="flex items-center gap-3 w-full px-4">
              <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
              <div className="flex-1 bg-slate-100 rounded-full h-1 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-slate-500 shrink-0 max-w-[120px] truncate">
                {currentFile || `${uploadingCount} קבצים`}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <svg className={`w-4 h-4 transition-colors ${isDragging ? 'text-orange-500' : 'text-slate-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className={`text-sm ${isDragging ? 'text-orange-600 font-semibold' : 'text-slate-500'}`}>
                {isDragging ? 'שחרר כאן!' : 'הוסף תכניות נוספות'}
              </span>
            </div>
          )}
        </label>
        {error && <p className="mt-1.5 text-xs text-red-500 text-center">{error}</p>}
      </div>
    )
  }

  // ── FULL SIZE MODE ─────────────────────────────────────────────────────────
  return (
    <div className="w-full">
      <label
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={e => { e.preventDefault(); setIsDragging(false) }}
        onDrop={onDrop}
        className={`group relative flex flex-col items-center justify-center w-full rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden ${
          isDragging
            ? 'bg-orange-50 scale-[1.01]'
            : 'bg-white hover:bg-slate-50/80'
        } ${uploading ? 'pointer-events-none' : ''}`}
        style={{
          minHeight: '240px',
          border: 'none',
          boxShadow: isDragging
            ? '0 0 0 2px #f97316, 0 8px 32px rgba(249,115,22,0.12)'
            : '0 0 0 2px #e2e8f0, 0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <input type="file" accept=".pdf" multiple className="hidden"
          onChange={e => { const fs = Array.from(e.target.files || []); if (fs.length) uploadFiles(fs); e.target.value = '' }} />

        {/* Animated marching ants when dragging */}
        {isDragging && (
          <>
            <div className="upload-zone-border" />
            <div className="upload-zone-border-y" />
          </>
        )}

        {uploading ? (
          /* ── Upload progress ── */
          <div className="flex flex-col items-center gap-5 px-8 py-12 w-full">
            {/* Stacked file icon with spinner */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
                <svg className="w-7 h-7 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              {/* Spinning ring overlay */}
              <div className="absolute inset-0 rounded-2xl" style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 70%, #f97316 100%)',
                animation: 'spin-ring 1s linear infinite',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
              }} />
            </div>

            <div className="text-center">
              <p className="font-bold text-slate-800 text-lg">
                {uploadingCount > 1 ? `מעלה ${uploadingCount} תכניות` : 'מעלה תכנית'}
              </p>
              {currentFile && (
                <p className="text-sm text-slate-500 mt-0.5 max-w-xs truncate mx-auto">{currentFile}</p>
              )}
              <p className="text-orange-500 font-semibold text-sm mt-1">{progress}%</p>
            </div>

            {/* Progress bar */}
            <div className="w-full max-w-sm">
              <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full progress-bar transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-slate-400">
                <span>ממיר PDF לתמונה...</span>
                <span>{Math.ceil((uploadingCount - Math.floor(uploadingCount * progress / 100)))} נותרו</span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Idle state ── */
          <div className="flex flex-col items-center gap-5 px-8 py-10 text-center">
            {/* Icon */}
            <div className={`relative w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragging ? 'bg-orange-100 scale-110 rotate-3' : 'bg-slate-100 group-hover:bg-orange-50 group-hover:scale-105'
            }`}>
              <svg
                className={`w-10 h-10 transition-colors duration-200 ${isDragging ? 'text-orange-500' : 'text-slate-400 group-hover:text-orange-400'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {/* Subtle floating dots when not dragging */}
              {!isDragging && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              )}
            </div>

            {/* Copy */}
            <div>
              <p className={`text-xl font-bold transition-colors duration-200 ${isDragging ? 'text-orange-600' : 'text-slate-700 group-hover:text-slate-800'}`}>
                {isDragging ? 'שחרר כאן!' : 'גרור תכניות PDF לכאן'}
              </p>
              {!isDragging && (
                <p className="text-slate-400 text-sm mt-1.5">
                  או{' '}
                  <span className="text-orange-500 font-semibold underline underline-offset-2 decoration-orange-300">לחץ לבחירת קבצים</span>
                </p>
              )}
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-full">
                <svg className="w-3.5 h-3.5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-xs text-orange-600 font-semibold">מרובה קבצים</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                <span className="text-xs text-slate-500">אדריכלות</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                <span className="text-xs text-slate-500">קונסטרוקציה</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full">
                <span className="text-xs text-slate-500">חשמל / מ&quot;א</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">PDF בלבד · עד 50MB לקובץ</p>
          </div>
        )}
      </label>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
