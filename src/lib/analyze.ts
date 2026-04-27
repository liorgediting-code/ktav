import OpenAI from 'openai'
import { DrawingAnalysis, BOQItem } from './types'
import { v4 as uuidv4 } from 'uuid'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are an expert Israeli quantity surveyor (מודד כמויות) with 20 years of experience reading construction drawings.
You MUST analyze every construction drawing image sent to you — these are professional technical drawings, not photos.
Never refuse to analyze a technical drawing. Always return valid JSON.

Your task: Extract a Bill of Quantities (כתב כמויות) from the drawing.

Calculation rules:
- Floor areas: external gross dimensions unless noted otherwise
- Walls: length × height, deduct openings over 2m²
- Concrete: actual volume (length × width × thickness) in m³
- Steel/rebar: kg (assume 100 kg/m³ concrete for initial estimate)
- Round to 2 decimal places

IMPORTANT: Return ONLY valid JSON. No markdown, no explanations, no apologies.

JSON format:
{
  "drawingType": "תכנית קונסטרוקציה / אדריכלות / חשמל / אינסטלציה / ברזל / כיסה",
  "projectName": "project name from title block, or 'פרויקט' if unclear",
  "floor": "floor/level from drawing",
  "scale": "scale ratio",
  "items": [
    {
      "sectionCode": "03",
      "section": "קונסטרוקציה - ברזל ובטון",
      "itemCode": "03.01",
      "description": "detailed item description in Hebrew",
      "unit": "מ\\"ק",
      "quantity": 12.5,
      "notes": "calculation: 5.0 × 3.0 × 0.25 = 3.75 m³ × 3 slabs",
      "confidence": "high"
    }
  ],
  "rawNotes": "general notes about the drawing"
}`

function isRefusal(text: string): boolean {
  const refusalPhrases = [
    "I'm sorry, I can't",
    "I cannot process",
    "I'm unable to",
    "I can't process",
    "I cannot assist",
    "I'm not able to",
    "sorry, I can't",
  ]
  return refusalPhrases.some(p => text.toLowerCase().includes(p.toLowerCase()))
}

interface PageInput {
  buffer: Buffer
  mimeType: 'image/jpeg' | 'image/png'
  pageNum: number
}

async function analyzeOnePage(
  page: PageInput,
  totalPages: number,
  userInstruction?: string
): Promise<{ analysis: Omit<DrawingAnalysis, 'items'> & { items: Omit<BOQItem, 'id'>[] }; pageNum: number }> {
  const base64Image = page.buffer.toString('base64')

  const pageLabel = totalPages > 1
    ? `\n\nThis is page ${page.pageNum} of ${totalPages}.`
    : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 4096,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${page.mimeType};base64,${base64Image}`,
              detail: 'high',
            },
          },
          {
            type: 'text',
            text: `This is a professional Israeli construction drawing (תכנית עבודה).${pageLabel} Analyze it and extract all quantities. Return JSON only.${userInstruction ? `\n\nUser focus instruction: ${userInstruction}` : ''}`,
          },
        ],
      },
    ],
  })

  const content = response.choices[0].message.content || '{}'

  if (isRefusal(content)) {
    throw new Error(
      `עמוד ${page.pageNum}: GPT-4o לא הצליח לעבד את התמונה.`
    )
  }

  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  try {
    return { analysis: JSON.parse(cleaned), pageNum: page.pageNum }
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return { analysis: JSON.parse(match[0]), pageNum: page.pageNum }
      } catch {
        throw new Error(`עמוד ${page.pageNum}: תגובה לא תקינה מ-GPT-4o.`)
      }
    }
    throw new Error(`עמוד ${page.pageNum}: תגובה לא בפורמט הנכון.`)
  }
}

/**
 * Analyze one or more construction drawing pages in parallel.
 * Each item is stamped with its source pageNumber server-side.
 */
export async function analyzePDF(
  pages: PageInput[],
  userInstruction?: string
): Promise<DrawingAnalysis> {
  const fileSizeMB = pages.reduce((s, p) => s + p.buffer.length, 0) / (1024 * 1024)
  console.log(`Analyzing ${pages.length} page(s), total ${fileSizeMB.toFixed(1)}MB`)

  const results = await Promise.all(
    pages.map(p => analyzeOnePage(p, pages.length, userInstruction))
  )

  // Sort by page number in case Promise.all resolves out of order
  results.sort((a, b) => a.pageNum - b.pageNum)

  // Use page-1 metadata as the primary source
  const primary = results[0].analysis

  const allItems: BOQItem[] = results.flatMap(({ analysis, pageNum }) =>
    (analysis.items || []).map(item => ({
      ...item,
      id: uuidv4(),
      confidence: item.confidence || 'medium',
      pageNumber: pages.length > 1 ? pageNum : undefined,
    }))
  )

  const rawNotes = results
    .map(({ analysis, pageNum }) =>
      analysis.rawNotes ? `עמוד ${pageNum}: ${analysis.rawNotes}` : ''
    )
    .filter(Boolean)
    .join('\n')

  return {
    drawingType: primary.drawingType || 'לא זוהה',
    projectName: primary.projectName || 'פרויקט',
    floor: primary.floor || 'לא זוהה',
    scale: primary.scale || 'לא זוהה',
    items: allItems,
    rawNotes,
    pageCount: pages.length,
  }
}
