import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { existsSync, readFileSync } from 'fs'
import { analyzePDF } from '@/lib/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: 'image/jpeg' | 'image/png' }> {
  if (url.startsWith('https://') || url.startsWith('http://')) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`שגיאה בטעינת תמונה: ${res.status}`)
    const buffer = Buffer.from(await res.arrayBuffer())
    const ct = res.headers.get('content-type') || ''
    return { buffer, mimeType: ct.includes('png') ? 'image/png' : 'image/jpeg' }
  }

  // Local dev: /api/file/<id>/image-N or /api/file/<id>/image
  const id = url.match(/\/api\/file\/([^/]+)\//)?.[1]
  if (!id) throw new Error('Invalid imageUrl')
  const uploadsDir = path.join(process.cwd(), 'uploads', id)

  // Determine file path from URL
  const pageMatch = url.match(/\/image-(\d+)$/)
  if (pageMatch) {
    const filePath = path.join(uploadsDir, `page-${pageMatch[1]}.jpg`)
    if (!existsSync(filePath)) throw new Error(`עמוד ${pageMatch[1]} לא נמצא`)
    return { buffer: readFileSync(filePath), mimeType: 'image/jpeg' }
  }

  // Legacy single-image path
  const jpgPath = path.join(uploadsDir, 'drawing.jpg')
  const pngPath = path.join(uploadsDir, 'drawing.png')
  if (existsSync(jpgPath)) return { buffer: readFileSync(jpgPath), mimeType: 'image/jpeg' }
  if (existsSync(pngPath)) return { buffer: readFileSync(pngPath), mimeType: 'image/png' }
  throw new Error('תמונה לא נמצאה')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, imageUrls, userInstruction } = body as {
      imageUrl?: string
      imageUrls?: string[]
      userInstruction?: string
    }

    // Accept either imageUrls[] (multi-page) or legacy imageUrl (single)
    const urls: string[] = imageUrls && imageUrls.length > 0
      ? imageUrls
      : imageUrl ? [imageUrl] : []

    if (urls.length === 0) {
      return NextResponse.json({ error: 'חסר imageUrl' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY לא מוגדר' }, { status: 500 })
    }

    const pages = await Promise.all(
      urls.map(async (url, i) => {
        const { buffer, mimeType } = await fetchImageBuffer(url)
        return { buffer, mimeType, pageNum: i + 1 }
      })
    )

    const analysis = await analyzePDF(pages, userInstruction?.trim() || undefined)
    return NextResponse.json({ analysis })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'שגיאה לא ידועה'
    console.error('Analyze error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
