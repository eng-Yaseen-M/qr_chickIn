import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area, PieChart, Pie, Cell,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { fetchAllAttendees } from './supabase'
import { CATEGORIES, CATEGORY_KEYS } from './categories'
import { fmtTime } from './format'
import { Card, Button, CategoryChip, PageHeader } from './ui'

const AXIS = { fontSize: 12, fill: '#66757f' }
const GRID = '#d8dee4'

function bucketLabel(m) {
  if (m < 60) return `${m} دقيقة`
  if (m === 60) return 'ساعة'
  return `${m / 60} ساعات`
}

function buildTimeline(checked) {
  if (!checked.length) return { data: [], bucketMin: 10 }
  const ts = checked.map((r) => new Date(r.checked_in_at).getTime())
  const min = ts.reduce((a, b) => Math.min(a, b), Infinity)
  const max = ts.reduce((a, b) => Math.max(a, b), -Infinity)
  const range = max - min
  const bucketMin = [10, 30, 60, 180, 720, 1440].find((m) => range / (m * 60000) <= 60) ?? 1440
  const size = bucketMin * 60000
  const start = Math.floor(min / size) * size
  const end = Math.floor(max / size) * size
  const data = []
  for (let t = start; t <= end; t += size) {
    data.push({ t, label: fmtTime(t), student: 0, org: 0, vip: 0, doctor: 0, total: 0, cum: 0 })
  }
  checked.forEach((r, i) => {
    const b = data[Math.floor((ts[i] - start) / size)]
    b[r.category]++
    b.total++
  })
  let run = 0
  data.forEach((b) => { run += b.total; b.cum = run })
  return { data, bucketMin }
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p) => p.value > 0 || payload.length === 1)
  return (
    <div className="bg-ink text-white text-xs rounded-control px-3 py-2 shadow-lg" dir="rtl">
      {label && <div className="font-semibold mb-1">{label}</div>}
      {items.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.payload?.hex || p.color || p.fill }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, hint, className = '', children }) {
  return (
    <Card className={`p-4 ${className}`}>
      <h2 className="font-bold">{title}</h2>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </Card>
  )
}

const Empty = ({ children }) => (
  <div className="h-60 grid place-items-center text-sm text-muted text-center">{children}</div>
)

function Stat({ value, label }) {
  return (
    <Card className="p-4">
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-sm text-ink-2 mt-0.5">{label}</div>
    </Card>
  )
}

export default function Analytics() {
  const [rows, setRows] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [auto, setAuto] = useState(true)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [spin, setSpin] = useState(false)

  async function load() {
    setSpin(true)
    try {
      setRows(await fetchAllAttendees('*'))
      setUpdatedAt(new Date())
    } catch (e) {
      console.error(e)
    }
    setLoaded(true)
    setSpin(false)
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!auto) return
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [auto])

  const d = useMemo(() => {
    const total = rows.length
    const checked = rows
      .filter((r) => r.checked_in_at)
      .sort((a, b) => new Date(a.checked_in_at) - new Date(b.checked_in_at))
    const perCat = CATEGORY_KEYS.map((k) => {
      const all = rows.filter((r) => r.category === k)
      const inn = all.filter((r) => r.checked_in_at).length
      return { key: k, ...CATEGORIES[k], total: all.length, checked: inn, absent: all.length - inn }
    })
    const timeline = buildTimeline(checked)
    const peak = timeline.data.reduce((m, b) => (b.total > (m?.total ?? 0) ? b : m), null)
    return { total, checked, perCat, timeline, peak }
  }, [rows])

  const pct = d.total ? Math.round((d.checked.length / d.total) * 100) : 0
  const recent = [...d.checked].reverse().slice(0, 8)
  const catBars = d.perCat.filter((c) => c.total > 0).map((c) => ({ name: c.label, hex: c.hex, checked: c.checked, absent: c.absent }))
  const pieData = d.perCat.filter((c) => c.total > 0).map((c) => ({ name: c.label, value: c.total, hex: c.hex }))

  if (loaded && d.total === 0) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-lg font-bold">مفيش بيانات تتحلل لسه</h1>
        <p className="text-sm text-muted mt-1">استورد المدعوين الأول، وبعد ما الناس تبدأ تدخل هتظهر الإحصائيات هنا.</p>
      </Card>
    )
  }

  return (
    <div>
      <PageHeader title="التحليلات"
        hint={updatedAt ? `آخر تحديث ${updatedAt.toLocaleTimeString('ar-EG-u-nu-latn')}` : 'جاري التحميل...'}>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="size-4" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          تحديث تلقائي
        </label>
        <Button variant="secondary" onClick={load} disabled={spin}>
          <RefreshCw size={16} className={spin ? 'animate-spin' : ''} /> تحديث
        </Button>
      </PageHeader>

      {/* الشريط الرئيسي: شبه حبل البادج، كل فئة بلونها وحجمها */}
      <Card className="p-5">
        <h2 className="text-2xl sm:text-3xl font-bold leading-snug">
          دخل {d.checked.length} من {d.total} مدعو ({pct}%)
        </h2>
        <div className="mt-5 flex gap-2">
          {d.perCat.filter((c) => c.total > 0).map((c) => (
            <div key={c.key} style={{ flexGrow: c.total, flexBasis: 0, minWidth: 72 }}>
              <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
                <span className="font-medium">{c.label}</span>
                <span className="text-ink-2">{c.checked}/{c.total}</span>
              </div>
              <div className={`${c.soft} h-4 rounded-full overflow-hidden`}
                role="progressbar" aria-label={c.label} aria-valuenow={c.checked} aria-valuemax={c.total}>
                <div className={`${c.bg} h-full rounded-full`}
                  style={{ width: `${c.total ? (c.checked / c.total) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <Stat value={d.total - d.checked.length} label="لم يحضروا بعد" />
        <Stat value={d.peak ? `${d.peak.label}` : '—'}
          label={d.peak ? `ذروة الدخول: ${d.peak.total} خلال ${bucketLabel(d.timeline.bucketMin)}` : 'ذروة الدخول'} />
        <Stat value={d.checked.length ? fmtTime(d.checked[0].checked_in_at) : '—'} label="أول دخول" />
        <Stat value={d.checked.length ? fmtTime(d.checked[d.checked.length - 1].checked_in_at) : '—'} label="آخر دخول" />
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mt-3">
        <div className="lg:col-span-2 grid gap-3 content-start">
          <ChartCard title="وتيرة الدخول" hint={`عدد اللي دخلوا في كل ${bucketLabel(d.timeline.bucketMin)}، مقسمين بالفئة`}>
            {d.timeline.data.length ? (
              <div dir="ltr" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.timeline.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<Tip />} cursor={{ fill: '#edf0f3' }} />
                    {[...CATEGORY_KEYS].map((k) => (
                      <Bar key={k} dataKey={k} name={CATEGORIES[k].label} stackId="a" fill={CATEGORIES[k].hex} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty>لسه محدش دخل. أول ما حد يتمسح الرسم هيبدأ.</Empty>}
          </ChartCard>

          <ChartCard title="إجمالي الحضور مع الوقت" hint="العدد التراكمي للي دخلوا">
            {d.timeline.data.length ? (
              <div dir="ltr" style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.timeline.data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, d.total]} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="cum" name="إجمالي الدخول" stroke="#12202b"
                      strokeWidth={2} fill="#12202b" fillOpacity={0.08} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <Empty>مفيش بيانات لسه.</Empty>}
          </ChartCard>
        </div>

        <div className="grid gap-3 content-start">
          <ChartCard title="الحضور حسب الفئة">
            <div dir="ltr" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catBars} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ ...AXIS, fill: '#12202b' }} tickLine={false} axisLine={false} width={56} />
                  <Tooltip content={<Tip />} cursor={{ fill: '#edf0f3' }} />
                  <Bar dataKey="checked" name="حضروا" stackId="b">
                    {catBars.map((c) => <Cell key={c.name} fill={c.hex} />)}
                  </Bar>
                  <Bar dataKey="absent" name="لم يحضروا" stackId="b" fill="#d8dee4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted mt-1">الرمادي = لم يحضروا بعد</p>
          </ChartCard>

          <ChartCard title="توزيع المدعوين">
            <div className="flex items-center gap-4">
              <div dir="ltr" className="relative shrink-0" style={{ width: 150, height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={46} outerRadius={70}
                      paddingAngle={2} stroke="none">
                      {pieData.map((c) => <Cell key={c.name} fill={c.hex} />)}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="text-xl font-bold">{d.total}</span>
                </div>
              </div>
              <ul className="text-sm space-y-1.5 flex-1">
                {d.perCat.filter((c) => c.total > 0).map((c) => (
                  <li key={c.key} className="flex items-center gap-2">
                    <span className={`${c.bg} size-2.5 rounded-full`} />
                    <span className="flex-1">{c.label}</span>
                    <span className="text-ink-2">{c.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ChartCard>

          <Card className="p-4">
            <h2 className="font-bold mb-3">آخر من دخلوا</h2>
            {recent.length ? (
              <ul className="divide-y divide-line">
                {recent.map((r) => (
                  <li key={r.id} className="py-2 flex items-center gap-2 text-sm">
                    <span className="flex-1 font-medium truncate">{r.name}</span>
                    <CategoryChip cat={r.category} />
                    <span className="text-ink-2 w-16 text-end">{fmtTime(r.checked_in_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">لسه محدش دخل.</p>}
          </Card>
        </div>
      </div>
    </div>
  )
}
