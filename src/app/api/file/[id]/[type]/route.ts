import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const { id, type } = await params
  const uploadsDir = path.join(process.cwd(), 'uploads', id)

  if (type === 'image') {
    // Legacy: serve page-1.jpg (or drawing.jpg for very old uploads)
    const page1Path = path.join(uploadsDir, 'page-1.jpg')
    const legacyJpgPath = path.join(uploadsDir, 'drawing.jpg')
    const pngPath = path.join(uploadsDir, 'drawing.png')
    for (const p of [page1Path, legacyJpgPath]) {
      if (existsSync(p)) {
        const buf = await readFile(p)
        return new NextResponse(buf, { headers: { 'Content-Type': 'image/jpeg' } })
      }
    }
    if (existsSync(pngPath)) {
      const buf = await readFile(pngPath)
      return new NextResponse(buf, { headers: { 'Content-Type': 'image/png' } })
    }
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  }

  // Per-page: /api/file/<id>/image-1, image-2, ...
  const pageMatch = type.match(/^image-(\d+)$/)
  if (pageMatch) {
    const pageNum = parseInt(pageMatch[1], 10)
    const pagePath = path.join(uploadsDir, `page-${pageNum}.jpg`)
    if (!existsSync(pagePath)) return NextResponse.json({ error: 'עמוד לא נמצא' }, { status: 404 })
    const buf = await readFile(pagePath)
    return new NextResponse(buf, { headers: { 'Content-Type': 'image/jpeg' } })
  }

  if (type === 'pdf') {
    const pdfPath = path.join(uploadsDir, 'drawing.pdf')
    if (!existsSync(pdfPath)) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
    const buf = await readFile(pdfPath)
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/pdf' } })
  }

  return NextResponse.json({ error: 'סוג לא חוקי' }, { status: 400 })
}
