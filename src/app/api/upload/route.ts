import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { pdfToJpegs } from '@/lib/pdf-to-image'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'לא נשלח קובץ' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'יש להעלות קובץ PDF בלבד' }, { status: 400 })
    }

    const id = uuidv4()
    const pdfBuffer = Buffer.from(await file.arrayBuffer())
    console.log(`[upload] ${file.name} — ${(pdfBuffer.length / 1024 / 1024).toFixed(1)}MB`)

    // Convert all PDF pages → JPEG
    let pageBuffers: Buffer[]
    try {
      pageBuffers = await pdfToJpegs(pdfBuffer, 1.5)
      console.log(`[upload] converted ${pageBuffers.length} pages`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[upload] PDF conversion failed:', err)
      return NextResponse.json(
        { error: `שגיאה בהמרת PDF: ${msg}` },
        { status: 500 }
      )
    }

    // ── Vercel Blob (production) ─────────────────────────────────────────────
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob')
        const pageUploads = pageBuffers.map((buf, i) =>
          put(`${id}/page-${i + 1}.jpg`, buf, { access: 'public', contentType: 'image/jpeg' })
        )
        const [, ...pageBlobs] = await Promise.all([
          put(`${id}/drawing.pdf`, pdfBuffer, { access: 'public', contentType: 'application/pdf' }),
          ...pageUploads,
        ])
        const imageUrls = pageBlobs.map(b => b.url)
        console.log(`[upload] stored ${imageUrls.length} pages in blob`)
        return NextResponse.json({ id, fileName: file.name, imageUrl: imageUrls[0], imageUrls })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[upload] Blob storage failed:', err)
        return NextResponse.json({ error: `שגיאת אחסון: ${msg}` }, { status: 500 })
      }
    }

    // ── Local filesystem (development) ───────────────────────────────────────
    if (process.env.VERCEL) {
      return NextResponse.json(
        { error: 'חסר BLOB_READ_WRITE_TOKEN — הוסף Blob storage ב-Vercel dashboard' },
        { status: 500 }
      )
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', id)
    await mkdir(uploadsDir, { recursive: true })
    await Promise.all([
      writeFile(path.join(uploadsDir, 'drawing.pdf'), pdfBuffer),
      ...pageBuffers.map((buf, i) => writeFile(path.join(uploadsDir, `page-${i + 1}.jpg`), buf)),
    ])
    const imageUrls = pageBuffers.map((_, i) => `/api/file/${id}/image-${i + 1}`)
    return NextResponse.json({ id, fileName: file.name, imageUrl: imageUrls[0], imageUrls })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload] Unhandled error:', err)
    return NextResponse.json({ error: `שגיאת שרת: ${msg}` }, { status: 500 })
  }
}
