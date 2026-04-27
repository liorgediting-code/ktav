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
    // Support both jpg (new) and png (legacy uploads)
    const jpgPath = path.join(uploadsDir, 'drawing.jpg')
    const pngPath = path.join(uploadsDir, 'drawing.png')
    if (existsSync(jpgPath)) {
      const buf = await readFile(jpgPath)
      return new NextResponse(buf, { headers: { 'Content-Type': 'image/jpeg' } })
    }
    if (existsSync(pngPath)) {
      const buf = await readFile(pngPath)
      return new NextResponse(buf, { headers: { 'Content-Type': 'image/png' } })
    }
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
  }

  if (type === 'pdf') {
    const pdfPath = path.join(uploadsDir, 'drawing.pdf')
    if (!existsSync(pdfPath)) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })
    const buf = await readFile(pdfPath)
    return new NextResponse(buf, { headers: { 'Content-Type': 'application/pdf' } })
  }

  return NextResponse.json({ error: 'סוג לא חוקי' }, { status: 400 })
}
