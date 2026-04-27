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

    // Convert PDF → JPEG (pure Node.js, no Python required)
    let jpegBuffer: Buffer
    try {
      jpegBuffer = await pdfToJpeg(pdfBuffer, 1.5)
    } catch (err) {
      console.error('PDF conversion error:', err)
      return NextResponse.json({ error: 'שגיאה בהמרת ה-PDF לתמונה' }, { status: 500 })
    }

    // ── Vercel Blob (production) ─────────────────────────────────────────────
    if (process.env.BLOB_READ_WRITE_TOKEN) {
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
      return NextResponse.json({
        id,
        fileName: file.name,
        imageUrl: imageBlob.url,
      })
    }

    // ── Local filesystem (development) ───────────────────────────────────────
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
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
