/**
 * PDF → JPEG conversion — pure Node.js, no Python required.
 * pdfjs-dist v4 in "fake worker" mode: runs the PDF parser in the main
 * thread (no separate Worker thread). Dynamic imports keep Next.js build happy.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const MAX_PAGES = 25

async function loadPdf(pdfBuffer: Buffer) {
  const [pdfjsMod, canvasMod, { join }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<any>,
    import('@napi-rs/canvas'),
    import('path'),
  ])

  const pdfjs = pdfjsMod as any
  const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    verbosity: 0,
  }).promise

  return { pdf, createCanvas: canvasMod.createCanvas }
}

async function renderPage(pdf: any, createCanvas: any, pageNum: number, zoom: number): Promise<Buffer> {
  const page = await pdf.getPage(pageNum)
  const viewport = page.getViewport({ scale: zoom })
  const width  = Math.round(viewport.width)
  const height = Math.round(viewport.height)

  const canvas = createCanvas(width, height)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  await page.render({ canvasContext: ctx, viewport }).promise

  return canvas.toBuffer('image/jpeg', 85)
}

/** Convert page 1 only (for backward compat). */
export async function pdfToJpeg(pdfBuffer: Buffer, zoom = 1.5): Promise<Buffer> {
  const { pdf, createCanvas } = await loadPdf(pdfBuffer)
  const buf = await renderPage(pdf, createCanvas, 1, zoom)
  await pdf.destroy()
  return buf
}

/** Convert all pages. Returns array indexed by page number (1-based). */
export async function pdfToJpegs(pdfBuffer: Buffer, zoom = 1.5): Promise<Buffer[]> {
  const { pdf, createCanvas } = await loadPdf(pdfBuffer)
  const numPages: number = Math.min(pdf.numPages as number, MAX_PAGES)

  const buffers: Buffer[] = []
  for (let i = 1; i <= numPages; i++) {
    buffers.push(await renderPage(pdf, createCanvas, i, zoom))
  }

  await pdf.destroy()
  return buffers
}

/** Return total page count without rendering. */
export async function pdfPageCount(pdfBuffer: Buffer): Promise<number> {
  const { pdf } = await loadPdf(pdfBuffer)
  const count = pdf.numPages as number
  await pdf.destroy()
  return count
}
