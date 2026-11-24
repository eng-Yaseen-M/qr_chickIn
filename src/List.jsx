import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import QRCode from 'qrcode'
import {
  Search, FileSpreadsheet, ImageDown, Printer, LayoutGrid, Table2, Download, Trash2, Check, Users,
} from 'lucide-react'
import { supabase, fetchAllAttendees } from './supabase'
import { exportExcel } from './exportExcel'
import { exportImagesZip } from './exportImages'
import { CATEGORIES, CATEGORY_KEYS } from './categories'
import { fmtTime } from './format'
import { Card, Button, CategoryChip, PageHeader, inputCls, compactCls } from './ui'

async function downloadQR(p) {
  const url = await QRCode.toDataURL(p.code, { width: 600, margin: 2 })
  const a = document.createElement('a')
  a.href = url
  a.download = `${p.name}-${p.code}.png`
  a.click()
}

export default function List({ refreshKey, onGoUpload }) {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [filter, setFilter] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('table')
  const [exporting, setExporting] = useState(false)
  const [zipProg, setZipProg] = useState(null)

  async function load() {
    try {
      setRows(await fetchAllAttendees('*'))
    } catch (e) {
      alert('خطأ في تحميل البيانات: ' + e.message)
    }
    setLoaded(true)
  }

  useEffect(() => { load() }, [refreshKey])

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          CATEGORY_KEYS.indexOf(a.category) - CATEGORY_KEYS.indexOf(b.category) ||
          a.name.localeCompare(b.name, 'ar')
      ),
    [rows]
  )

  const shown = sorted.filter(
    (r) =>
      (filter === 'all' || r.category === filter) &&
      (status === 'all' || (status === 'in' ? !!r.checked_in_at : !r.checked_in_at)) &&
      r.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  const fileLabel = filter === 'all' ? 'الكل' : CATEGORIES[filter].label

  async function doExport() {
    setExporting(true)
    try {
      await exportExcel(shown, `المدعوين-${fileLabel}.xlsx`)
    } catch (e) {
      alert('خطأ في التصدير: ' + e.message)
    }
    setExporting(false)
  }

  async function doExportImages() {
    setZipProg([0, shown.length])
    try {
      await exportImagesZip(shown, (i, n) => setZipProg([i, n]), `صور-QR-${fileLabel}.zip`)
    } catch (e) {
      alert('خطأ في تصدير الصور: ' + e.message)
    }
    setZipProg(null)
  }

  async function remove(id) {
    if (!confirm('تمسح الشخص ده؟ كوده هيتلغي نهائيًا.')) return
    await supabase.from('attendees').delete().eq('id', id)
    load()
  }

  if (loaded && rows.length === 0) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center">
        <Users className="mx-auto text-muted" size={36} />
        <h1 className="text-lg font-bold mt-3">لسه مفيش مدعوين</h1>
        <p className="text-sm text-muted mt-1">استورد ملف أسماء وهنولّد لكل شخص كود وQR.</p>
        <Button className="mt-4" onClick={onGoUpload}>استيراد ملف</Button>
      </Card>
    )
  }

  return (
    <div>
      <div className="print:hidden">
        <PageHeader title="المدعوين" hint={`${shown.length} من ${rows.length}`}>
          <Button variant="secondary" onClick={doExport} disabled={exporting || !shown.length}>
            <FileSpreadsheet size={16} />
            {exporting ? 'جاري التصدير...' : 'Excel'}
          </Button>
          <Button variant="secondary" onClick={doExportImages} disabled={zipProg !== null || !shown.length}>
            <ImageDown size={16} />
            {zipProg ? `${zipProg[0]} / ${zipProg[1]}` : 'صور ZIP'}
          </Button>
          {view === 'cards' && (
            <Button onClick={() => window.print()}>
              <Printer size={16} /> طباعة
            </Button>
          )}
        </PageHeader>

        <div className="flex flex-wrap gap-2 mb-3">
          {[['all', 'الكل', rows.length], ...CATEGORY_KEYS.map((k) => [k, CATEGORIES[k].label, rows.filter((r) => r.category === k).length])].map(
            ([k, label, n]) => (
              <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k}
                className={`inline-flex items-center gap-2 h-9 px-3 rounded-full text-sm border transition-colors ${
                  filter === k ? 'bg-ink text-white border-ink' : 'bg-surface text-ink-2 border-line hover:bg-fog'}`}>
                {k !== 'all' && <span className={`${CATEGORIES[k].bg} size-2 rounded-full`} />}
                {label}
                <span className={filter === k ? 'opacity-70' : 'text-muted'}>{n}</span>
              </button>
            )
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute top-3 start-3 text-muted" />
            <input className={`${inputCls} ps-9`} placeholder="بحث بالاسم" value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={compactCls} value={status} onChange={(e) => setStatus(e.target.value)}
            aria-label="حالة الحضور">
            <option value="all">كل الحالات</option>
            <option value="in">حضروا</option>
            <option value="out">لم يحضروا</option>
          </select>
          <div className="flex rounded-control border border-line bg-surface overflow-hidden">
            {[['table', Table2, 'جدول'], ['cards', LayoutGrid, 'كروت']].map(([k, Icon, label]) => (
              <button key={k} onClick={() => setView(k)} aria-label={label} title={label} aria-pressed={view === k}
                className={`grid place-items-center w-10 h-10 ${view === k ? 'bg-ink text-white' : 'text-ink-2 hover:bg-fog'}`}>
                <Icon size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 print:grid-cols-3 gap-3">
          {shown.map((r) => {
            const c = CATEGORIES[r.category]
            return (
              <div key={r.id} className={`bg-surface border-2 ${c.border} rounded-card overflow-hidden text-center break-inside-avoid`}>
                <div className={`${c.bg} ${c.fg} py-1.5 font-bold`}>{c.label}</div>
                <div className="p-3">
                  <div className="flex justify-center"><QRCodeSVG value={r.code} size={120} /></div>
                  <div className="font-bold mt-2 leading-snug">{r.name}</div>
                  <div dir="ltr" className="text-xs text-muted tracking-wider mt-0.5">{r.code}</div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto relative">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-2 border-b border-line bg-fog/60">
                <th className="p-3 text-start font-medium">الاسم</th>
                <th className="p-3 text-start font-medium">الفئة</th>
                <th className="p-3 text-start font-medium">الكود</th>
                <th className="p-3 text-start font-medium">الحضور</th>
                <th className="p-3"><span className="sr-only">إجراءات</span></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-fog/40">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3"><CategoryChip cat={r.category} /></td>
                  <td className="p-3 tracking-wider whitespace-nowrap" dir="ltr"><span className="block text-start">{r.code}</span></td>
                  <td className="p-3 whitespace-nowrap">
                    {r.checked_in_at ? (
                      <span className="inline-flex items-center gap-1.5"><Check size={15} />{fmtTime(r.checked_in_at)}</span>
                    ) : (
                      <span className="text-muted">لم يحضر</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <button className="grid place-items-center size-8 rounded-control text-ink-2 hover:bg-fog"
                        onClick={() => downloadQR(r)} aria-label={`تحميل QR ${r.name}`} title="تحميل QR">
                        <Download size={16} />
                      </button>
                      <button className="grid place-items-center size-8 rounded-control text-danger hover:bg-fog"
                        onClick={() => remove(r.id)} aria-label={`مسح ${r.name}`} title="مسح">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted">مفيش نتايج بالفلتر ده.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  )
}
