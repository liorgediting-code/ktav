/**
 * PDF → JPEG conversion — pure Node.js, no Python required.
 * pdfjs-dist v4 in "fake worker" mode: runs the PDF parser in the main
 * thread (no separate Worker thread). Dynamic imports keep Next.js build happy.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function pdfToJpeg(pdfBuffer: Buffer, zoom = 1.5): Promise<Buffer> {
  // Dynamic imports: avoids DOMMatrix / browser-global errors during build
  const [pdfjsMod, { createCanvas }, { join }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<any>,
    import('@napi-rs/canvas'),
    import('path'),
  ])

  const pdfjs = pdfjsMod as any

  // On Vercel Lambda, process.cwd() is /var/task where node_modules lives.
  // Using path.join is more reliable than createRequire on serverless environments.
  const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
  pdfjs.GlobalWorkerOptions.workerSrc = `file://${workerPath}`

  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    verbosity: 0,
  }).promise

  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: zoom })
  const width  = Math.round(viewport.width)
  const height = Math.round(viewport.height)

  const canvas = createCanvas(width, height)
  const ctx    = canvas.getContext('2d')

  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  await page.render({ canvasContext: ctx, viewport }).promise

  await pdf.destroy()

  return canvas.toBuffer('image/jpeg', 85)
}
