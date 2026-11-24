import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { FileUp } from 'lucide-react'
import { supabase, fetchAllAttendees } from './supabase'
import { CATEGORIES, CATEGORY_KEYS, makeCode } from './categories'
import { Card, Button, CategoryChip, Field, PageHeader, inputCls } from './ui'

const NAME_WORDS = ['الاسم', 'اسم', 'name', 'names', 'full name', 'الاسم بالكامل']
const CAT_WORDS = ['الفئة', 'فئة', 'النوع', 'نوع', 'category', 'type']

function guessCategory(v) {
  const s = String(v ?? '').trim().toLowerCase()
  if (!s) return null
  if (s.includes('vip')) return 'vip'
  if (/طالب|طلاب|student/.test(s)) return 'student'
  if (/دكتور|دكاتر|doctor|^dr\b/.test(s)) return 'doctor'
  if (/منظم|org|جهة|جهه/.test(s)) return 'org'
  return null
}

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const keyOf = (name, cat) => norm(name).toLowerCase() + '|' + cat

function autodetect(rows) {
  const first = (rows[0] || []).map((c) => norm(c).toLowerCase())
  const n = first.findIndex((c) => NAME_WORDS.includes(c))
  const c = first.findIndex((c) => CAT_WORDS.includes(c))
  return { header: n >= 0 || c >= 0, nameCol: n >= 0 ? n : 0, catCol: c }
}

function Step({ n, title, children }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="grid place-items-center size-7 rounded-full bg-ink text-white text-sm font-bold">{n}</span>
        <h2 className="font-bold">{title}</h2>
      </div>
      {children}
    </Card>
  )
}

export default function Upload({ onDone }) {
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState({})
  const [sheet, setSheet] = useState('')
  const [hasHeader, setHasHeader] = useState(true)
  const [nameCol, setNameCol] = useState(0)
  const [catMode, setCatMode] = useState('fixed')
  const [catCol, setCatCol] = useState(1)
  const [fixedCat, setFixedCat] = useState('student')
  const [existing, setExisting] = useState(new Set())
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(false)

  function applySheet(rows) {
    const d = autodetect(rows)
    setHasHeader(d.header)
    setNameCol(d.nameCol)
    if (d.catCol >= 0) {
      setCatCol(d.catCol)
      setCatMode('column')
    } else {
      setCatCol(d.nameCol === 0 ? 1 : 0)
      setCatMode('fixed')
    }
  }

  async function onFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setMsg(null)
    setFileName(file.name)
    const wb = XLSX.read(await file.arrayBuffer())
    const all = {}
    wb.SheetNames.forEach((n) => {
      all[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' })
    })
    setSheets(all)
    const first = wb.SheetNames[0]
    setSheet(first)
    applySheet(all[first])
    try {
      const rows = await fetchAllAttendees('name, category')
      setExisting(new Set(rows.map((r) => keyOf(r.name, r.category))))
    } catch (err) {
      setMsg({ type: 'err', text: 'مقدرتش أقرا المدعوين الحاليين: ' + err.message })
    }
  }

  function changeSheet(name) {
    setSheet(name)
    applySheet(sheets[name])
  }

  const rows = sheets[sheet] || []
  const ncols = Math.max(1, ...rows.slice(0, 50).map((r) => r.length))
  const headerLabels = Array.from({ length: ncols }, (_, i) => {
    const h = hasHeader ? norm(rows[0]?.[i]) : ''
    return h || `عمود ${String.fromCharCode(65 + (i % 26))}`
  })
  const dataRows = hasHeader ? rows.slice(1) : rows

  const result = useMemo(() => {
    const toAdd = []
    let existingCount = 0, dupInFile = 0, unknownCat = 0
    const seen = new Set()
    for (const r of dataRows) {
      const name = norm(r[nameCol])
      if (!name) continue
      const cat = catMode === 'fixed' ? fixedCat : guessCategory(r[catCol])
      if (!cat) { unknownCat++; continue }
      const k = keyOf(name, cat)
      if (seen.has(k)) { dupInFile++; continue }
      seen.add(k)
      if (existing.has(k)) { existingCount++; continue }
      toAdd.push({ name, category: cat })
    }
    return { toAdd, existingCount, dupInFile, unknownCat }
  }, [dataRows, nameCol, catMode, catCol, fixedCat, existing])

  async function generate() {
    setLoading(true)
    setMsg(null)
    const records = result.toAdd.map((p) => ({ ...p, code: makeCode(p.category) }))
    for (let i = 0; i < records.length; i += 200) {
      const { error } = await supabase.from('attendees').insert(records.slice(i, i + 200))
      if (error) {
        setMsg({ type: 'err', text: 'حصل خطأ: ' + error.message })
        setLoading(false)
        return
      }
    }
    setLoading(false)
    setSheets({})
    setSheet('')
    setFileName('')
    onDone?.()
  }

  const hasFile = !!sheet
  const stats = [
    { v: result.toAdd.length, l: 'جديد هيتضاف', strong: true },
    { v: result.existingCount, l: 'موجود قبل كده (كوده ثابت)' },
    { v: result.dupInFile, l: 'مكرر داخل الملف' },
    { v: result.unknownCat, l: 'فئة غير معروفة (هيتخطى)', warn: result.unknownCat > 0 },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <PageHeader title="استيراد أسماء" hint="ملف إكسيل أو CSV. الأكواد القديمة مبتتغيرش أبدًا." />

      <Step n={1} title="اختار الملف">
        <label className="flex flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-line bg-fog/50 p-6 text-center cursor-pointer hover:bg-fog">
          <FileUp size={28} className="text-ink-2" />
          <span className="font-medium">{fileName || 'اضغط لاختيار ملف'}</span>
          <span className="text-sm text-muted">xlsx أو xls أو csv</span>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="sr-only" />
        </label>
      </Step>

      {hasFile && (
        <>
          <Step n={2} title="حدّد الأعمدة والفئة">
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.keys(sheets).length > 1 && (
                <Field label="الشيت">
                  <select className={inputCls} value={sheet} onChange={(e) => changeSheet(e.target.value)}>
                    {Object.keys(sheets).map((n) => <option key={n}>{n}</option>)}
                  </select>
                </Field>
              )}
              <label className="flex items-center gap-2 sm:self-end h-10">
                <input type="checkbox" className="size-4" checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)} />
                <span className="text-sm">أول صف عناوين أعمدة</span>
              </label>

              <Field label="عمود الاسم">
                <select className={inputCls} value={nameCol} onChange={(e) => setNameCol(Number(e.target.value))}>
                  {headerLabels.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </Field>

              <Field label="الفئة">
                <select className={inputCls} value={catMode} onChange={(e) => setCatMode(e.target.value)}>
                  <option value="fixed">فئة واحدة لكل الملف</option>
                  <option value="column">من عمود في الملف</option>
                </select>
              </Field>

              {catMode === 'fixed' ? (
                <Field label="اختار الفئة">
                  <select className={inputCls} value={fixedCat} onChange={(e) => setFixedCat(e.target.value)}>
                    {CATEGORY_KEYS.map((k) => <option key={k} value={k}>{CATEGORIES[k].label}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="عمود الفئة">
                  <select className={inputCls} value={catCol} onChange={(e) => setCatCol(Number(e.target.value))}>
                    {headerLabels.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </Field>
              )}
            </div>

            <p className="text-sm text-ink-2 mt-5 mb-2">معاينة أول 8 صفوف</p>
            <div className="overflow-x-auto border border-line rounded-control">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-fog">
                    {headerLabels.map((h, i) => (
                      <th key={i} className={`p-2 text-start whitespace-nowrap font-medium ${
                        i === nameCol ? 'bg-vip-soft' : ''} ${catMode === 'column' && i === catCol ? 'bg-org-soft' : ''}`}>
                        {h}
                        {i === nameCol && ' (الاسم)'}
                        {catMode === 'column' && i === catCol && ' (الفئة)'}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.slice(0, 8).map((r, ri) => (
                    <tr key={ri} className="border-t border-line">
                      {headerLabels.map((_, i) => (
                        <td key={i} className={`p-2 whitespace-nowrap ${i === nameCol ? 'bg-vip-soft/50' : ''} ${
                          catMode === 'column' && i === catCol ? 'bg-org-soft/50' : ''}`}>
                          {String(r[i] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Step>

          <Step n={3} title="راجع وأكّد">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {stats.map((s) => (
                <div key={s.l} className={`rounded-control border p-3 ${
                  s.warn ? 'border-danger' : s.strong ? 'border-ink' : 'border-line'}`}>
                  <div className="text-2xl font-bold">{s.v}</div>
                  <div className="text-sm text-ink-2">{s.l}</div>
                </div>
              ))}
            </div>

            {result.toAdd.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {result.toAdd.slice(0, 10).map((p, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CategoryChip cat={p.category} /> {p.name}
                  </li>
                ))}
                {result.toAdd.length > 10 && (
                  <li className="text-muted">+ {result.toAdd.length - 10} غيرهم</li>
                )}
              </ul>
            )}

            {msg && (
              <p role="alert" className={`mt-3 text-sm ${msg.type === 'ok' ? 'text-student' : 'text-danger'}`}>{msg.text}</p>
            )}

            <Button className="w-full mt-4" onClick={generate} disabled={loading || result.toAdd.length === 0}>
              {loading ? 'جاري الإنشاء...' : `إنشاء ${result.toAdd.length} كود`}
            </Button>
          </Step>
        </>
      )}
    </div>
  )
}
