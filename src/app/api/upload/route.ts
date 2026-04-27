import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { pdfToJpeg } from '@/lib/pdf-to-image'

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

    // Convert PDF → JPEG (pure Node.js, no Python required)
    let jpegBuffer: Buffer
    try {
      jpegBuffer = await pdfToJpeg(pdfBuffer, 1.5)
      console.log(`[upload] converted to JPEG: ${(jpegBuffer.length / 1024 / 1024).toFixed(1)}MB`)
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
        const [imageBlob] = await Promise.all([
          put(`${id}/drawing.jpg`, jpegBuffer, {
            access: 'public',
            contentType: 'image/jpeg',
          }),
          put(`${id}/drawing.pdf`, pdfBuffer, {
            access: 'public',
            contentType: 'application/pdf',
          }),
        ])
        console.log(`[upload] stored in blob: ${imageBlob.url}`)
        return NextResponse.json({
          id,
          fileName: file.name,
          imageUrl: imageBlob.url,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[upload] Blob storage failed:', err)
        return NextResponse.json(
          { error: `שגיאת אחסון: ${msg}` },
          { status: 500 }
        )
      }
    }

    // ── Local filesystem (development) ───────────────────────────────────────
    if (process.env.VERCEL) {
      // Running on Vercel but no Blob token — tell the user to set it up
      return NextResponse.json(
        { error: 'חסר BLOB_READ_WRITE_TOKEN — הוסף Blob storage ב-Vercel dashboard' },
        { status: 500 }
      )
    }

    const uploadsDir = path.join(process.cwd(), 'uploads', id)
    await mkdir(uploadsDir, { recursive: true })
    await Promise.all([
      writeFile(path.join(uploadsDir, 'drawing.pdf'), pdfBuffer),
      writeFile(path.join(uploadsDir, 'drawing.jpg'), jpegBuffer),
    ])
    return NextResponse.json({
      id,
      fileName: file.name,
      imageUrl: `/api/file/${id}/image`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[upload] Unhandled error:', err)
    return NextResponse.json({ error: `שגיאת שרת: ${msg}` }, { status: 500 })
  }
}
