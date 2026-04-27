import { NextRequest, NextResponse } from 'next/server'
import { generateExcel } from '@/lib/excel'
import { DrawingAnalysis } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { analysis, fileName } = await req.json() as {
      analysis: DrawingAnalysis
      fileName?: string
    }

    if (!analysis) {
      return NextResponse.json({ error: 'חסר נתוני ניתוח' }, { status: 400 })
    }

    const buffer = await generateExcel(analysis)
    const outFileName = fileName
      ? `כתב-כמויות-${fileName.replace('.pdf', '')}.xlsx`
      : 'כתב-כמויות.xlsx'

    return new NextResponse(buffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(outFileName)}`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (err) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'שגיאה בייצוא Excel' }, { status: 500 })
  }
}
