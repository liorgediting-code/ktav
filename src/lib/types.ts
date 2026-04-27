export interface BOQItem {
  id: string
  section: string
  sectionCode: string
  itemCode: string
  description: string
  unit: string
  quantity: number
  unitPrice?: number
  total?: number
  notes?: string
  confidence: 'high' | 'medium' | 'low'
  floorLevel?: string
  pageNumber?: number
}

export interface DrawingAnalysis {
  drawingType: string
  projectName: string
  floor: string
  scale: string
  items: BOQItem[]
  rawNotes: string
  pageCount?: number
}

export interface Project {
  id: string
  name: string
  createdAt: string
  drawings: Drawing[]
}

export interface Drawing {
  id: string
  fileName: string
  uploadedAt: string
  status: 'pending' | 'processing' | 'done' | 'error'
  imagePath?: string
  analysis?: DrawingAnalysis
}

// ענפי עבודה ישראליים סטנדרטיים
export const WORK_SECTIONS = [
  { code: '01', name: 'עבודות עפר וחפירה', unit: 'מ"ק' },
  { code: '02', name: 'יסודות ובטון', unit: 'מ"ק' },
  { code: '03', name: 'קונסטרוקציה - ברזל ובטון', unit: 'ק"ג / מ"ק' },
  { code: '04', name: 'בנייה - בלוקים ולבנים', unit: 'מ"ר' },
  { code: '05', name: 'טיח וריצוף פנים', unit: 'מ"ר' },
  { code: '06', name: 'ריצוף וחיפויים', unit: 'מ"ר' },
  { code: '07', name: 'נגרות ואלומיניום', unit: 'יח\'' },
  { code: '08', name: 'אינסטלציה', unit: 'מ"א' },
  { code: '09', name: 'חשמל', unit: 'נקודה' },
  { code: '10', name: 'מיזוג אוויר', unit: 'יח\'' },
  { code: '11', name: 'גמרים חיצוניים', unit: 'מ"ר' },
  { code: '12', name: 'עבודות נוף ופיתוח', unit: 'מ"ר' },
] as const
