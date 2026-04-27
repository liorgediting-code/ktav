import ExcelJS from 'exceljs'
import { DrawingAnalysis } from './types'

export async function generateExcel(analysis: DrawingAnalysis): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'כּתב — מערכת כתב כמויות'
  workbook.created = new Date()

  const ws = workbook.addWorksheet('כתב כמויות', {
    views: [{ rightToLeft: true }], // עברית RTL
  })

  // צבעים
  const HEADER_BG = '1e3a5f'
  const SECTION_BG = 'dbeafe'
  const HIGH_CONF = 'd1fae5'
  const MED_CONF = 'fef9c3'
  const LOW_CONF = 'fee2e2'
  const BORDER_COLOR = 'cbd5e1'

  // ===== כותרת פרויקט =====
  ws.mergeCells('A1:H1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `כתב כמויות — ${analysis.projectName}`
  titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' }
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HEADER_BG } }
  ws.getRow(1).height = 36

  // ===== מידע תכנית =====
  ws.mergeCells('A2:H2')
  const infoCell = ws.getCell('A2')
  infoCell.value = `סוג תכנית: ${analysis.drawingType} | קומה: ${analysis.floor} | קנה מידה: ${analysis.scale}`
  infoCell.font = { name: 'Arial', size: 10, color: { argb: 'FF64748b' } }
  infoCell.alignment = { horizontal: 'center', readingOrder: 'rtl' }
  ws.getRow(2).height = 20

  // ===== תאריך =====
  ws.mergeCells('A3:H3')
  const dateCell = ws.getCell('A3')
  dateCell.value = `הופק בתאריך: ${new Date().toLocaleDateString('he-IL')} | הופק על ידי: כּתב AI`
  dateCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94a3b8' } }
  dateCell.alignment = { horizontal: 'center', readingOrder: 'rtl' }
  ws.getRow(3).height = 18

  ws.addRow([]) // שורה ריקה

  // ===== כותרות עמודות =====
  const headerRow = ws.addRow([
    'סעיף',
    'מס\'',
    'תיאור הפריט',
    'יחידה',
    'כמות',
    'מחיר יחידה',
    'סה"כ',
    'הערות חישוב',
  ])
  headerRow.height = 28
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', readingOrder: 'rtl' }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
    }
  })

  // ===== רוחב עמודות =====
  ws.columns = [
    { key: 'section', width: 22 },
    { key: 'code', width: 8 },
    { key: 'description', width: 45 },
    { key: 'unit', width: 10 },
    { key: 'quantity', width: 12 },
    { key: 'unitPrice', width: 16 },
    { key: 'total', width: 16 },
    { key: 'notes', width: 35 },
  ]

  // ===== קבוצת פריטים לפי סעיף =====
  let currentSection = ''
  let rowIndex = 6

  // מיון לפי קוד סעיף
  const sorted = [...analysis.items].sort((a, b) =>
    a.sectionCode.localeCompare(b.sectionCode)
  )

  for (const item of sorted) {
    // כותרת סעיף חדשה
    if (item.section !== currentSection) {
      currentSection = item.section
      ws.mergeCells(`A${rowIndex}:H${rowIndex}`)
      const sectionCell = ws.getCell(`A${rowIndex}`)
      sectionCell.value = `${item.sectionCode} — ${item.section}`
      sectionCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1e3a5f' } }
      sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + SECTION_BG } }
      sectionCell.alignment = { horizontal: 'right', readingOrder: 'rtl', indent: 1 }
      ws.getRow(rowIndex).height = 24
      rowIndex++
    }

    // צבע לפי רמת ביטחון
    const confColor =
      item.confidence === 'high'
        ? HIGH_CONF
        : item.confidence === 'medium'
        ? MED_CONF
        : LOW_CONF

    const dataRow = ws.addRow([
      '',
      item.itemCode,
      item.description,
      item.unit,
      item.quantity,
      item.unitPrice ?? null,
      item.unitPrice ? { formula: `E${rowIndex}*F${rowIndex}` } : null,
      item.notes ?? '',
    ])
    dataRow.height = 22

    // סגנון שורת נתונים
    dataRow.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 10 }
      cell.alignment = {
        horizontal: colNum <= 2 ? 'center' : colNum >= 4 && colNum <= 7 ? 'center' : 'right',
        vertical: 'middle',
        readingOrder: 'rtl',
        wrapText: colNum === 3 || colNum === 8,
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + confColor } }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } },
        right: { style: 'thin', color: { argb: 'FF' + BORDER_COLOR } },
      }
    })

    // פורמט מספרים
    ws.getCell(`E${rowIndex}`).numFmt = '#,##0.00'
    ws.getCell(`F${rowIndex}`).numFmt = '₪#,##0'
    ws.getCell(`G${rowIndex}`).numFmt = '₪#,##0'

    rowIndex++
  }

  // ===== סיכום =====
  ws.addRow([])
  rowIndex++
  ws.mergeCells(`A${rowIndex}:D${rowIndex}`)
  ws.getCell(`A${rowIndex}`).value = 'סה"כ משוער (ללא מע"מ)'
  ws.getCell(`A${rowIndex}`).font = { bold: true, size: 12 }
  ws.getCell(`A${rowIndex}`).alignment = { readingOrder: 'rtl' }
  ws.getCell(`G${rowIndex}`).value = { formula: `SUM(G6:G${rowIndex - 2})` }
  ws.getCell(`G${rowIndex}`).numFmt = '₪#,##0'
  ws.getCell(`G${rowIndex}`).font = { bold: true, size: 12 }

  // ===== מקרא רמת ביטחון =====
  rowIndex += 2
  ws.mergeCells(`A${rowIndex}:H${rowIndex}`)
  ws.getCell(`A${rowIndex}`).value =
    '🟢 ביטחון גבוה  🟡 ביטחון בינוני  🔴 ביטחון נמוך — יש לאמת ידנית לפני הגשה'
  ws.getCell(`A${rowIndex}`).font = { size: 9, italic: true, color: { argb: 'FF64748b' } }
  ws.getCell(`A${rowIndex}`).alignment = { horizontal: 'center' }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
