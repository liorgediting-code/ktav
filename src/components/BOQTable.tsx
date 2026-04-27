'use client'

import { useState } from 'react'
import { BOQItem, DrawingAnalysis } from '@/lib/types'

interface Props {
  analysis: DrawingAnalysis
  fileName: string
  onUpdate: (updated: DrawingAnalysis) => void
}

const CONF = {
  high: { label: 'גבוה', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  medium: { label: 'בינוני', dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  low: { label: 'נמוך', dot: 'bg-red-400', badge: 'bg-red-50 text-red-700 border-red-200' },
}

function EditableCell({
  value, type = 'text', onSave, className = ''
}: {
  value: string | number
  type?: 'text' | 'number'
  onSave: (v: string | number) => void
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => {
          onSave(type === 'number' ? (parseFloat(draft) || 0) : draft)
          setEditing(false)
        }}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={`w-full border border-orange-300 rounded-lg px-2 py-1 text-sm bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-300 ${className}`}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="לחץ לעריכה"
      className={`cursor-pointer hover:text-orange-600 hover:underline underline-offset-2 decoration-dashed transition-colors duration-150 ${className}`}
    >
      {value}
    </span>
  )
}

export default function BOQTable({ analysis, fileName, onUpdate }: Props) {
  const [exporting, setExporting] = useState(false)

  const updateItem = (id: string, field: keyof BOQItem, value: string | number) => {
    onUpdate({
      ...analysis,
      items: analysis.items.map(item => item.id === id ? { ...item, [field]: value } : item),
    })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, fileName }),
      })
      if (!res.ok) throw new Error('שגיאה בייצוא')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition') || ''
      const match = cd.match(/filename\*=UTF-8''(.+)/)
      a.download = match ? decodeURIComponent(match[1]) : 'כתב-כמויות.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const sections = [...new Set(analysis.items.map(i => i.section))]
  const highCount = analysis.items.filter(i => i.confidence === 'high').length
  const totalQty = analysis.items.reduce((sum, i) => sum + i.quantity, 0)
  const hasPages = (analysis.pageCount ?? 0) > 1

  const statsCards = [
    { label: 'פריטים זוהו', value: analysis.items.length, sub: `${sections.length} ענפים`, color: 'text-slate-800', bg: 'bg-white' },
    ...(hasPages ? [{ label: 'עמודים נותחו', value: analysis.pageCount!, sub: 'כל עמוד בנפרד', color: 'text-sky-600', bg: 'bg-sky-50' }] : []),
    { label: 'ביטחון גבוה', value: `${analysis.items.length > 0 ? Math.round(highCount / analysis.items.length * 100) : 0}%`, sub: `${highCount} מתוך ${analysis.items.length}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'כמות כוללת', value: totalQty.toLocaleString('he-IL', { maximumFractionDigits: 1 }), sub: 'יחידות שונות', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      {/* Stats Row */}
      <div className={`grid gap-4 animate-float-up ${statsCards.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {statsCards.map(card => (
          <div key={card.label} className={`${card.bg} rounded-2xl border border-slate-200 p-4`}>
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between animate-float-up-delay-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{analysis.projectName}</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {analysis.drawingType} · {analysis.floor} · {analysis.scale}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-sm shadow-orange-200"
        >
          {exporting
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5m0 0l-4.5-4.5M12 16.5l4.5-4.5" />
              </svg>
          }
          ייצוא Excel
        </button>
      </div>

      {/* Note if any */}
      {analysis.rawNotes && (
        <div className="flex gap-3 items-start p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 animate-float-up-delay-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>{analysis.rawNotes}</span>
        </div>
      )}

      {/* Tables by section */}
      {sections.map((section, si) => {
        const items = analysis.items.filter(i => i.section === section)
        const first = items[0]
        return (
          <div
            key={section}
            className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
            style={{ animationDelay: `${(si + 3) * 0.08}s` }}
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-white text-xs font-bold">
                {first.sectionCode}
              </div>
              <h3 className="font-semibold text-slate-700 text-sm">{section}</h3>
              <span className="mr-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {items.length} פריטים
              </span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-0 px-5 py-2.5 border-b border-slate-100 bg-slate-50/50">
              {['מס\'', 'תיאור', '', 'יחידה', 'כמות', 'מחיר יחידה', 'ביטחון', 'הערות'].map((h, i) => (
                <div
                  key={i}
                  className={`text-xs font-semibold text-slate-400 uppercase tracking-wide ${
                    i === 0 ? 'col-span-1 text-center' :
                    i === 1 ? 'col-span-3' :
                    i === 2 ? 'col-span-1' :
                    i === 3 ? 'col-span-1 text-center' :
                    i === 4 ? 'col-span-1 text-center' :
                    i === 5 ? 'col-span-2 text-center' :
                    i === 6 ? 'col-span-1 text-center' :
                    'col-span-2'
                  }`}
                >{h}</div>
              ))}
            </div>

            {/* Items */}
            {items.map((item, idx) => (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-0 px-5 py-3.5 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors duration-100 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
              >
                {/* Code + optional badges */}
                <div className="col-span-1 flex flex-col items-center justify-center gap-0.5">
                  <span className="font-mono text-xs text-slate-300">{item.itemCode}</span>
                  {item.floorLevel != null && (
                    <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0 rounded-full leading-4 font-mono">
                      {item.floorLevel}
                    </span>
                  )}
                  {item.pageNumber != null && (
                    <span className="text-[10px] font-semibold text-sky-500 bg-sky-50 border border-sky-200 px-1.5 py-0 rounded-full leading-4">
                      עמ׳ {item.pageNumber}
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="col-span-3 flex items-center pr-2">
                  <EditableCell
                    value={item.description}
                    onSave={v => updateItem(item.id, 'description', v)}
                    className="text-slate-700 font-medium"
                  />
                </div>

                {/* spacer */}
                <div className="col-span-1" />

                {/* Unit */}
                <div className="col-span-1 flex items-center justify-center">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.unit}
                  </span>
                </div>

                {/* Quantity */}
                <div className="col-span-1 flex items-center justify-center">
                  <EditableCell
                    value={item.quantity}
                    type="number"
                    onSave={v => updateItem(item.id, 'quantity', v)}
                    className="font-bold text-slate-800 text-center"
                  />
                </div>

                {/* Price */}
                <div className="col-span-2 flex items-center justify-center">
                  <EditableCell
                    value={item.unitPrice ? `₪${item.unitPrice.toLocaleString('he-IL')}` : '—'}
                    onSave={v => {
                      const n = parseFloat(String(v).replace(/[₪,]/g, ''))
                      updateItem(item.id, 'unitPrice', isNaN(n) ? 0 : n)
                    }}
                    className="text-slate-500"
                  />
                </div>

                {/* Confidence */}
                <div className="col-span-1 flex items-center justify-center">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${CONF[item.confidence].badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${CONF[item.confidence].dot}`} />
                    {CONF[item.confidence].label}
                  </span>
                </div>

                {/* Notes */}
                <div className="col-span-2 flex items-center pr-2">
                  <span className="text-xs text-slate-400 leading-tight line-clamp-2">{item.notes}</span>
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 py-2 text-xs text-slate-400 flex-wrap">
        {Object.entries(CONF).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            ביטחון {v.label}
          </span>
        ))}
        <span className="border-r border-slate-200 h-3 mx-1" />
        {analysis.items.some(i => i.floorLevel != null) && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 rounded-full font-mono">+5.78</span>
              קוטה גובה רצפה
            </span>
            <span className="border-r border-slate-200 h-3 mx-1" />
          </>
        )}
        {hasPages && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-sky-500 bg-sky-50 border border-sky-200 px-1.5 rounded-full">עמ׳</span>
              מספר עמוד המקור
            </span>
            <span className="border-r border-slate-200 h-3 mx-1" />
          </>
        )}
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          לחץ על ערך לעריכה
        </span>
      </div>
    </div>
  )
}
