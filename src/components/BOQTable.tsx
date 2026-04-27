'use client'

import { useMemo, useState } from 'react'
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

const NO_FLOOR = '__no_floor__'

function computeSubtotals(items: BOQItem[]) {
  const map = new Map<string, { section: string; unit: string; quantity: number }>()
  for (const item of items) {
    const key = `${item.section}||${item.unit}`
    if (!map.has(key)) map.set(key, { section: item.section, unit: item.unit, quantity: 0 })
    map.get(key)!.quantity += item.quantity
  }
  return [...map.values()]
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

function SubtotalBar({ items, label }: { items: BOQItem[]; label: string }) {
  const totals = computeSubtotals(items)
  if (totals.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-5 py-3 bg-slate-800 border-t border-slate-700">
      <span className="text-xs font-bold text-slate-300 shrink-0">{label}</span>
      {totals.map(t => (
        <span key={`${t.section}||${t.unit}`} className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400">{t.section}</span>
          <span className="font-bold text-white">{t.quantity.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span>
          <span className="text-slate-400">{t.unit}</span>
        </span>
      ))}
    </div>
  )
}

function ItemsTable({
  items,
  updateItem,
}: {
  items: BOQItem[]
  updateItem: (id: string, field: keyof BOQItem, value: string | number) => void
}) {
  const sections = [...new Set(items.map(i => i.section))]

  return (
    <>
      {sections.map(section => {
        const sectionItems = items.filter(i => i.section === section)
        const first = sectionItems[0]
        return (
          <div key={section}>
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100">
              <div className="w-6 h-6 rounded-md bg-slate-600 flex items-center justify-center text-white text-xs font-bold">
                {first.sectionCode}
              </div>
              <h4 className="font-semibold text-slate-600 text-xs">{section}</h4>
              <span className="mr-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {sectionItems.length} פריטים
              </span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-0 px-5 py-2 border-b border-slate-100 bg-slate-50/40">
              {["מס'", 'תיאור', '', 'יחידה', 'כמות', 'מחיר יחידה', 'ביטחון', 'הערות'].map((h, i) => (
                <div key={i} className={`text-xs font-semibold text-slate-400 uppercase tracking-wide ${
                  i === 0 ? 'col-span-1 text-center' :
                  i === 1 ? 'col-span-3' :
                  i === 2 ? 'col-span-1' :
                  i === 3 ? 'col-span-1 text-center' :
                  i === 4 ? 'col-span-1 text-center' :
                  i === 5 ? 'col-span-2 text-center' :
                  i === 6 ? 'col-span-1 text-center' :
                  'col-span-2'
                }`}>{h}</div>
              ))}
            </div>

            {/* Items */}
            {sectionItems.map((item, idx) => (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-0 px-5 py-3.5 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors duration-100 ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}
              >
                <div className="col-span-1 flex flex-col items-center justify-center gap-0.5">
                  <span className="font-mono text-xs text-slate-300">{item.itemCode}</span>
                  {item.pageNumber != null && (
                    <span className="text-[10px] font-semibold text-sky-500 bg-sky-50 border border-sky-200 px-1.5 py-0 rounded-full leading-4">
                      עמ׳ {item.pageNumber}
                    </span>
                  )}
                </div>

                <div className="col-span-3 flex items-center pr-2">
                  <EditableCell
                    value={item.description}
                    onSave={v => updateItem(item.id, 'description', v)}
                    className="text-slate-700 font-medium"
                  />
                </div>

                <div className="col-span-1" />

                <div className="col-span-1 flex items-center justify-center">
                  <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.unit}
                  </span>
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <EditableCell
                    value={item.quantity}
                    type="number"
                    onSave={v => updateItem(item.id, 'quantity', v)}
                    className="font-bold text-slate-800 text-center"
                  />
                </div>

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

                <div className="col-span-1 flex items-center justify-center">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${CONF[item.confidence].badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${CONF[item.confidence].dot}`} />
                    {CONF[item.confidence].label}
                  </span>
                </div>

                <div className="col-span-2 flex items-center pr-2">
                  <span className="text-xs text-slate-400 leading-tight line-clamp-2">{item.notes}</span>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </>
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

  // Group items by floorLevel; items without a level go to NO_FLOOR bucket
  const floorGroups = useMemo(() => {
    const map = new Map<string, BOQItem[]>()
    for (const item of analysis.items) {
      const key = item.floorLevel ?? NO_FLOOR
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    // Sort floors numerically, unassigned last
    return [...map.entries()].sort(([a], [b]) => {
      if (a === NO_FLOOR) return 1
      if (b === NO_FLOOR) return -1
      return parseFloat(a) - parseFloat(b)
    })
  }, [analysis.items])

  const hasFloorLevels = floorGroups.some(([k]) => k !== NO_FLOOR)
  const sections = [...new Set(analysis.items.map(i => i.section))]
  const highCount = analysis.items.filter(i => i.confidence === 'high').length
  const hasPages = (analysis.pageCount ?? 0) > 1

  const statsCards = [
    { label: 'פריטים זוהו', value: analysis.items.length, sub: `${sections.length} ענפים`, color: 'text-slate-800', bg: 'bg-white' },
    ...(hasPages ? [{ label: 'עמודים נותחו', value: analysis.pageCount!, sub: 'כל עמוד בנפרד', color: 'text-sky-600', bg: 'bg-sky-50' }] : []),
    ...(hasFloorLevels ? [{ label: 'קומות / קוטות', value: floorGroups.filter(([k]) => k !== NO_FLOOR).length, sub: 'סימוני פלוס', color: 'text-violet-600', bg: 'bg-violet-50' }] : []),
    { label: 'ביטחון גבוה', value: `${analysis.items.length > 0 ? Math.round(highCount / analysis.items.length * 100) : 0}%`, sub: `${highCount} מתוך ${analysis.items.length}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="flex flex-col gap-5" dir="rtl">
      {/* Stats */}
      <div className={`grid gap-4 animate-float-up grid-cols-${statsCards.length}`}>
        {statsCards.map(card => (
          <div key={card.label} className={`${card.bg} rounded-2xl border border-slate-200 p-4`}>
            <p className="text-xs text-slate-500 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Header */}
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

      {/* Notes */}
      {analysis.rawNotes && (
        <div className="flex gap-3 items-start p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 animate-float-up-delay-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>{analysis.rawNotes}</span>
        </div>
      )}

      {/* Floor-level groups */}
      {floorGroups.map(([floorKey, floorItems], gi) => (
        <div
          key={floorKey}
          className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
          style={{ animationDelay: `${(gi + 3) * 0.08}s` }}
        >
          {/* Floor level header */}
          {floorKey !== NO_FLOOR ? (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-violet-600 border-b border-violet-500">
              {/* קוטה symbol: half-filled circle */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="shrink-0">
                <circle cx="10" cy="10" r="9" fill="white" stroke="white" strokeWidth="1" />
                <path d="M10 1 A9 9 0 0 1 10 19 Z" fill="black" />
                <circle cx="10" cy="10" r="9" fill="none" stroke="white" strokeWidth="1.5" />
                <line x1="10" y1="1" x2="10" y2="19" stroke="white" strokeWidth="1.2" />
              </svg>
              <h3 className="font-bold text-white text-base font-mono">{floorKey}</h3>
              <span className="mr-auto text-xs text-violet-200 bg-violet-700/50 border border-violet-500 px-2 py-0.5 rounded-full">
                {floorItems.length} פריטים
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-100 border-b border-slate-200">
              <h3 className="font-semibold text-slate-500 text-sm">ללא קוטה מוגדרת</h3>
              <span className="mr-auto text-xs text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                {floorItems.length} פריטים
              </span>
            </div>
          )}

          {/* Items grouped by section within this floor */}
          <ItemsTable items={floorItems} updateItem={updateItem} />

          {/* Subtotals for this floor */}
          <SubtotalBar items={floorItems} label={floorKey !== NO_FLOOR ? `סה״כ קוטה ${floorKey}` : 'סה״כ'} />
        </div>
      ))}

      {/* Grand totals — only shown when there are multiple floor levels */}
      {hasFloorLevels && floorGroups.length > 1 && (
        <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-700">
          <div className="px-5 py-3 border-b border-slate-700">
            <h3 className="font-bold text-white text-sm">סה״כ כל התכנית</h3>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 px-5 py-4">
            {computeSubtotals(analysis.items).map(t => (
              <div key={`${t.section}||${t.unit}`} className="flex items-baseline gap-2">
                <span className="text-slate-400 text-xs">{t.section}</span>
                <span className="text-white font-bold text-lg leading-none">
                  {t.quantity.toLocaleString('he-IL', { maximumFractionDigits: 2 })}
                </span>
                <span className="text-slate-400 text-xs">{t.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 py-2 text-xs text-slate-400 flex-wrap">
        {Object.entries(CONF).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${v.dot}`} />
            ביטחון {v.label}
          </span>
        ))}
        <span className="border-r border-slate-200 h-3 mx-1" />
        {hasFloorLevels && (
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
