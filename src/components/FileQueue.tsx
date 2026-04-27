'use client'

import { DrawingAnalysis } from '@/lib/types'

export type FileStatus = 'ready' | 'analyzing' | 'done' | 'error'

export interface QueuedFile {
  id: string
  fileName: string
  imageUrl: string
  imageUrls: string[]
  status: FileStatus
  analysis?: DrawingAnalysis
  error?: string
}

interface Props {
  files: QueuedFile[]
  activeId: string | null
  onAnalyze: (id: string) => void
  onAnalyzeAll: () => void
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

const STATUS_CONFIG: Record<FileStatus, { label: string; dot: string; color: string }> = {
  ready:     { label: 'מוכן',    dot: 'bg-sky-400',    color: 'text-sky-600' },
  analyzing: { label: 'מנתח...', dot: 'bg-orange-400 animate-pulse', color: 'text-orange-500' },
  done:      { label: 'הושלם',   dot: 'bg-emerald-400', color: 'text-emerald-600' },
  error:     { label: 'שגיאה',   dot: 'bg-red-400',    color: 'text-red-500' },
}

function shortName(fileName: string) {
  return fileName.replace(/\.pdf$/i, '').replace(/^100-GWE-/, '').replace(/-00$/, '')
}

export default function FileQueue({ files, activeId, onAnalyze, onAnalyzeAll, onSelect, onRemove }: Props) {
  const readyCount     = files.filter(f => f.status === 'ready').length
  const doneCount      = files.filter(f => f.status === 'done').length
  const analyzingCount = files.filter(f => f.status === 'analyzing').length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-slate-800 text-sm">{files.length} תכניות</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">
              {doneCount > 0 && <span className="text-emerald-600">{doneCount} הושלמו</span>}
              {doneCount > 0 && readyCount > 0 && <span className="text-slate-300"> · </span>}
              {readyCount > 0 && <span>{readyCount} ממתינות</span>}
              {analyzingCount > 0 && <span className="text-orange-500"> · {analyzingCount} מנתח</span>}
            </p>
          </div>

          {/* Analyze-all button */}
          {readyCount > 1 && (
            <button
              onClick={onAnalyzeAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm shadow-orange-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              נתח הכל ({readyCount})
            </button>
          )}
        </div>

        {/* Overall progress bar */}
        {files.length > 0 && (
          <div className="mt-2.5">
            <div className="bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${files.length > 0 ? Math.round(doneCount / files.length * 100) : 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── File list ── */}
      <div className="divide-y divide-slate-50 max-h-[65vh] overflow-y-auto">
        {files.map((file) => {
          const cfg = STATUS_CONFIG[file.status]
          const isActive = file.id === activeId
          const isClickable = file.status !== 'analyzing'

          return (
            <div
              key={file.id}
              onClick={() => isClickable && onSelect(file.id)}
              className={`flex items-center gap-3 px-4 py-3 transition-all duration-150 ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              } ${
                isActive
                  ? 'bg-orange-50 border-r-[3px] border-r-orange-500'
                  : isClickable ? 'hover:bg-slate-50' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className={`w-12 h-12 rounded-xl overflow-hidden border shrink-0 transition-all duration-150 ${
                isActive ? 'border-orange-300 shadow-sm shadow-orange-100' : 'border-slate-200'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.imageUrl} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                  {shortName(file.fileName)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  {file.status === 'done' && file.analysis && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{file.analysis.items.length} פריטים</span>
                    </>
                  )}
                  {file.status === 'error' && file.error && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-red-400 truncate max-w-[120px]">{file.error}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {file.status === 'ready' && (
                  <button
                    onClick={e => { e.stopPropagation(); onAnalyze(file.id) }}
                    className="px-2.5 py-1.5 bg-slate-900 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer"
                  >
                    נתח
                  </button>
                )}

                {file.status === 'analyzing' && (
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                )}

                {file.status === 'done' && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${isActive ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {isActive ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                )}

                {file.status === 'error' && (
                  <button
                    onClick={e => { e.stopPropagation(); onAnalyze(file.id) }}
                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    שוב
                  </button>
                )}

                {/* Remove */}
                <button
                  onClick={e => { e.stopPropagation(); onRemove(file.id) }}
                  className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all duration-150 cursor-pointer"
                  title="הסר"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
