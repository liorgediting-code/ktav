/**
 * PDF → JPEG conversion — pure Node.js, no Python required.
 * Uses pdfjs-dist v4 with the worker imported inline (no separate thread),
 * plus @napi-rs/canvas for rendering. Dynamic imports defer loading to
 * call time so Next.js build doesn't hit browser-only globals.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function pdfToJpeg(pdfBuffer: Buffer, zoom = 1.5): Promise<Buffer> {
  // Importing pdf.worker.mjs registers the WorkerMessageHandler so pdfjs
  // runs in-process (no separate Worker thread needed on the server).
  const [pdfjsMod, { createCanvas }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs') as Promise<any>,
    import('@napi-rs/canvas'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs' as any) as Promise<any>,
  ])

  const pdfjs = pdfjsMod as any

  // Empty string = use the already-registered inline worker (v4 behavior)
  pdfjs.GlobalWorkerOptions.workerSrc = ''

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

  // White background — no transparency artifacts
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, width, height)

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise

  await pdf.destroy()

  // Quality 85 — good balance between file size and GPT-4o readability
  return canvas.toBuffer('image/jpeg', 85)
}
