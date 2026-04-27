import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { execSync } from 'child_process'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'לא נשלח קובץ' }, { status: 400 })
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'יש להעלות קובץ PDF בלבד' }, { status: 400 })
    }

    const id = uuidv4()
    const uploadsDir = path.join(process.cwd(), 'uploads', id)
    await mkdir(uploadsDir, { recursive: true })

    // שמירת ה-PDF
    const pdfPath = path.join(uploadsDir, 'drawing.pdf')
    const bytes = await file.arrayBuffer()
    await writeFile(pdfPath, Buffer.from(bytes))

    // המרה לתמונה באמצעות Python — JPEG במקום PNG, zoom 1.5 (קטן יותר, מהיר יותר)
    const imagePath = path.join(uploadsDir, 'drawing.jpg')
    const scriptPath = path.join(process.cwd(), 'src', 'lib', 'pdf-to-image.py')

    try {
      const result = execSync(
        `python3 "${scriptPath}" "${pdfPath}" "${imagePath}" 1.5`,
        { timeout: 30000, encoding: 'utf8' }
      ).trim()

      if (!result.startsWith('OK:')) {
        throw new Error(`Python script failed: ${result}`)
      }
    } catch (err) {
      console.error('PDF conversion error:', err)
      return NextResponse.json(
        { error: 'שגיאה בהמרת ה-PDF לתמונה' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id,
      fileName: file.name,
      pdfPath: `/api/file/${id}/pdf`,
      imagePath: `/api/file/${id}/image`,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
