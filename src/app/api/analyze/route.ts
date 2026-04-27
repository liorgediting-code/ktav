import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { analyzePDF } from '@/lib/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'חסר imageUrl' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY לא מוגדר' },
        { status: 500 }
      )
    }

    // Resolve imageUrl → Buffer
    let imageBuffer: Buffer
    let mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg'

    if (imageUrl.startsWith('https://') || imageUrl.startsWith('http://')) {
      // Vercel Blob (or any external URL)
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error(`שגיאה בטעינת תמונה: ${res.status}`)
      imageBuffer = Buffer.from(await res.arrayBuffer())
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('png')) mimeType = 'image/png'
    } else {
      // Local dev: /api/file/<id>/image → uploads/<id>/drawing.jpg (or .png)
      const id = imageUrl.match(/\/api\/file\/([^/]+)\//)?.[1]
      if (!id) throw new Error('Invalid imageUrl')
      const uploadsDir = path.join(process.cwd(), 'uploads', id)
      const jpgPath = path.join(uploadsDir, 'drawing.jpg')
      const pngPath = path.join(uploadsDir, 'drawing.png')
      const filePath = existsSync(jpgPath) ? jpgPath : pngPath
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'תמונה לא נמצאה' }, { status: 404 })
      }
      imageBuffer = readFileSync(filePath)
      if (filePath.endsWith('.png')) mimeType = 'image/png'
    }

    const analysis = await analyzePDF(imageBuffer, mimeType)
    return NextResponse.json({ analysis })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
    console.error('Analyze error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
