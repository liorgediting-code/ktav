# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Git workflow

After completing any task, immediately commit and push all changes to GitHub (`git add`, `git commit`, `git push`). Do not wait for the user to ask.

## Commands

```bash
npm run dev      # dev server on localhost:3000
npm run build    # production build (runs tsc + Next.js)
npm run lint     # ESLint
npm start        # serve the production build
```

There are no automated tests.

## Architecture

**KTAV** is a Next.js 15 full-stack app that converts construction PDF drawings into Israeli Bills of Quantities (BOQ) using GPT-4o Vision, then exports them as Excel files.

### Data flow

```
PDF upload → PDF→JPEG (pdfjs-dist + @napi-rs/canvas) → store (local dev / Vercel Blob prod)
         → GPT-4o Vision analysis → editable BOQ table → Excel export (ExcelJS)
```

### API routes (`src/app/api/`)

| Route | Purpose |
|---|---|
| `POST /api/upload` | Convert PDF page 1 → JPEG; store file; return `{ id, fileName, imageUrl }` |
| `POST /api/analyze` | Send JPEG to GPT-4o; parse into `DrawingAnalysis` with `BOQItem[]` |
| `POST /api/export` | Generate Hebrew RTL Excel from `DrawingAnalysis` |
| `GET /api/file/[id]/[type]` | Dev-only: serve stored image/PDF from `./uploads/{id}/` |

### Storage

- **Dev:** files written to `./uploads/{id}/`
- **Prod (Vercel):** files in Vercel Blob (`BLOB_READ_WRITE_TOKEN`); presence of `VERCEL` env var switches modes

### Key libraries

- `pdfjs-dist` v4 (legacy build) + `@napi-rs/canvas` — server-side PDF→JPEG. Both are in `serverExternalPackages` (not bundled by webpack). `outputFileTracingIncludes` in `next.config.ts` forces the pdfjs worker file into the Vercel Lambda bundle.
- `openai` — GPT-4o Vision via `src/lib/analyze.ts`
- `exceljs` — Hebrew/RTL Excel in `src/lib/excel.ts`
- `@vercel/blob` — production file storage
- Tailwind CSS v4

### Domain types (`src/lib/types.ts`)

- `BOQItem` — single line: section code, description, quantity, unit, unit price, confidence
- `DrawingAnalysis` — one drawing's result: type, project, floor, scale, `BOQItem[]`
- `WORK_SECTIONS` — 12 standard Israeli construction categories (Hebrew, codes 01–12)

### UI components (`src/components/`)

- `UploadZone` — drag-drop PDF upload with progress
- `FileQueue` — sidebar list; "Analyze All" batch trigger
- `BOQTable` — editable results table; inline cell editing; Excel export button

All UI text is Hebrew; the app is fully RTL.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | GPT-4o Vision |
| `BLOB_READ_WRITE_TOKEN` | Prod only | Vercel Blob storage |
