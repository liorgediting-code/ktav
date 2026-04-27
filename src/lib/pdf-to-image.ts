/**
 * PDF → JPEG conversion — pure Node.js, no Python required.
 * Uses dynamic imports so pdfjs-dist loads at runtime (not build time),
 * avoiding DOMMatrix and other browser-global issues during Next.js build.
 */

export async function pdfToJpeg(pdfBuffer: Buffer, zoom = 1.5): Promise<Buffer> {
  // Lazy-load both packages at call time, not build time
  const [pdfjsMod, { createCanvas }] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('@napi-rs/canvas'),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjs = pdfjsMod as any

  // Disable web worker — single-threaded on the server
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
