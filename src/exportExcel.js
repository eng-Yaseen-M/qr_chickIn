import QRCode from 'qrcode'
import { CATEGORIES, CATEGORY_KEYS } from './categories'
import { fmtTime } from './format'

const argb = (hex) => 'FF' + hex.slice(1).toUpperCase()

export async function exportExcel(list, filename = 'attendees.xlsx') {
  const mod = await import('exceljs')
  const ExcelJS = mod.default ?? mod

  const sorted = [...list].sort(
    (a, b) =>
      CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category) ||
      a.name.localeCompare(b.name, 'ar')
  )

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('المدعوين', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  })

  ws.columns = [
    { header: 'م', key: 'n', width: 6 },
    { header: 'الاسم', key: 'name', width: 36 },
    { header: 'الفئة', key: 'cat', width: 12 },
    { header: 'الكود', key: 'code', width: 16 },
    { header: 'QR', key: 'qr', width: 18 },
    { header: 'الحضور', key: 'att', width: 14 },
  ]

  const thin = { style: 'thin', color: { argb: 'FFCCCCCC' } }
  const border = { top: thin, left: thin, bottom: thin, right: thin }

  const head = ws.getRow(1)
  head.height = 26
  head.eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111827' } }
    c.alignment = { vertical: 'middle', horizontal: 'center' }
    c.border = border
  })

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]
    const row = ws.addRow({
      n: i + 1,
      name: p.name,
      cat: CATEGORIES[p.category].label,
      code: p.code,
      qr: '',
      att: p.checked_in_at ? fmtTime(p.checked_in_at) : '—',
    })
    row.height = 78
    row.eachCell({ includeEmpty: true }, (c) => {
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      c.border = border
    })
    const catCell = row.getCell('cat')
    catCell.font = { bold: true, color: { argb: p.category === 'vip' ? 'FF12202B' : 'FFFFFFFF' } }
    catCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(CATEGORIES[p.category].hex) } }
    row.getCell('code').font = { name: 'Consolas', bold: true }

    const dataUrl = await QRCode.toDataURL(p.code, { width: 300, margin: 1 })
    const imgId = wb.addImage({ base64: dataUrl, extension: 'png' })
    ws.addImage(imgId, {
      tl: { col: 4.12, row: i + 1.08 },
      ext: { width: 96, height: 96 },
      editAs: 'oneCell',
    })
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
