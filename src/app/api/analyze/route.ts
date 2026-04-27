import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { existsSync } from 'fs'
import { analyzePDF } from '@/lib/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'חסר מזהה תכנית' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY לא מוגדר — אנא הגדר בקובץ .env.local' },
        { status: 500 }
      )
    }

    const imagePath = path.join(process.cwd(), 'uploads', id, 'drawing.png')

    if (!existsSync(imagePath)) {
      return NextResponse.json({ error: 'תמונה לא נמצאה — יש להעלות קובץ תחילה' }, { status: 404 })
    }

    const analysis = await analyzePDF(imagePath)

    return NextResponse.json({ analysis })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
    console.error('Analyze error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
