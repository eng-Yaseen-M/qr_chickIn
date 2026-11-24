import QRCode from 'qrcode'
import JSZip from 'jszip'
import { CATEGORIES } from './categories'

const FONT = "'Segoe UI', Tahoma, Arial, sans-serif"
const W = 800
const H = 1000

const clean = (s) =>
  s.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
const dirOf = (t) => (/[\u0600-\u06FF]/.test(t) ? 'rtl' : 'ltr')

function wrap(ctx, text, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (!cur || ctx.measureText(t).width <= maxWidth) cur = t
    else {
      lines.push(cur)
      cur = w
    }
  }
  if (cur) lines.push(cur)
  return lines
}

async function drawCard(p) {
  const color = CATEGORIES[p.category].hex
  const label = CATEGORIES[p.category].label

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  // الخلفية والإطار وشريط الفئة
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = color
  ctx.fillRect(0, 0, W, 130)
  ctx.lineWidth = 14
  ctx.strokeStyle = color
  ctx.strokeRect(7, 7, W - 14, H - 14)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // اسم الفئة
  ctx.fillStyle = p.category === 'vip' ? '#12202b' : '#ffffff'
  ctx.font = `bold 64px ${FONT}`
  ctx.direction = dirOf(label)
  ctx.fillText(label, W / 2, 68)

  // الـ QR
  const qr = document.createElement('canvas')
  await QRCode.toCanvas(qr, p.code, { width: 520, margin: 1 })
  ctx.drawImage(qr, (W - 520) / 2, 170)

  // الاسم (بينصغّر لوحده لو طويل)
  ctx.fillStyle = '#111111'
  let size = 60
  let lines
  for (;;) {
    ctx.font = `bold ${size}px ${FONT}`
    lines = wrap(ctx, p.name, W - 100)
    if (lines.length <= 2 || size <= 32) break
    size -= 4
  }
  lines.forEach((line, i) => {
    ctx.direction = dirOf(line)
    ctx.fillText(line, W / 2, 750 + i * size * 1.3)
  })

  // الكود (ID)
  ctx.fillStyle = '#444444'
  ctx.font = 'bold 46px Consolas, "Courier New", monospace'
  ctx.direction = 'ltr'
  ctx.fillText(p.code, W / 2, 930)

  return new Promise((res) => canvas.toBlob(res, 'image/png'))
}

export async function exportImagesZip(list, onProgress, filename = 'QR-images.zip') {
  const zip = new JSZip()
  const used = new Set()

  for (let i = 0; i < list.length; i++) {
    const p = list[i]
    const blob = await drawCard(p)
    let path = `${CATEGORIES[p.category].label}/${clean(p.name)} - ${p.code}.png`
    while (used.has(path)) path = path.replace('.png', '_.png')
    used.add(path)
    zip.file(path, blob)
    onProgress?.(i + 1, list.length)
    if (i % 10 === 0) await new Promise((r) => setTimeout(r))
  }

  const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' })
  const url = URL.createObjectURL(out)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
