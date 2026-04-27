import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'
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

// Detect if model refused to process
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

export async function analyzePDF(imagePath: string): Promise<DrawingAnalysis> {
  const imageBuffer = fs.readFileSync(imagePath)

  // Check file size — warn if > 10MB base64 (OpenAI limit is 20MB)
  const fileSizeMB = imageBuffer.length / (1024 * 1024)
  console.log(`Image size: ${fileSizeMB.toFixed(1)}MB`)

  const base64Image = imageBuffer.toString('base64')
  const ext = path.extname(imagePath).slice(1).toLowerCase()
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'

  let content: string

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: 'This is a professional Israeli construction drawing (תכנית עבודה). Analyze it and extract all quantities. Return JSON only.',
            },
          ],
        },
      ],
    })

    content = response.choices[0].message.content || '{}'
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`OpenAI API error: ${msg}`)
  }

  // Detect refusal
  if (isRefusal(content)) {
    throw new Error(
      'GPT-4o לא הצליח לעבד את התמונה. ייתכן שהתכנית סרוקה, לא ברורה, או גדולה מדי. נסה תכנית אחרת.'
    )
  }

  // Parse JSON — strip markdown code fences if present
  const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let parsed: Omit<DrawingAnalysis, 'items'> & { items: Omit<BOQItem, 'id'>[] }
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Try to extract JSON object from within the text
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        parsed = JSON.parse(match[0])
      } catch {
        throw new Error('התגובה מ-GPT-4o לא היתה JSON תקין. נסה שוב.')
      }
    } else {
      throw new Error('התגובה מ-GPT-4o לא היתה בפורמט הנכון. נסה שוב.')
    }
  }

  // Add UUIDs to items
  const items: BOQItem[] = (parsed.items || []).map((item) => ({
    ...item,
    id: uuidv4(),
    confidence: item.confidence || 'medium',
  }))

  return {
    drawingType: parsed.drawingType || 'לא זוהה',
    projectName: parsed.projectName || 'פרויקט',
    floor: parsed.floor || 'לא זוהה',
    scale: parsed.scale || 'לא זוהה',
    items,
    rawNotes: parsed.rawNotes || '',
  }
}
