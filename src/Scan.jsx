import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Check, AlertTriangle, XCircle } from 'lucide-react'
import { supabase } from './supabase'
import { CATEGORIES } from './categories'
import { fmtTime } from './format'
import { Card, Button, inputCls } from './ui'

export default function Scan() {
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [manual, setManual] = useState('')
  const [tally, setTally] = useState({ checked: 0, total: 0 })
  const busy = useRef(false)

  async function loadTally() {
    const [all, inn] = await Promise.all([
      supabase.from('attendees').select('*', { count: 'exact', head: true }),
      supabase.from('attendees').select('*', { count: 'exact', head: true }).not('checked_in_at', 'is', null),
    ])
    setTally({ total: all.count || 0, checked: inn.count || 0 })
  }

  async function handle(code) {
    const { data: updated } = await supabase.from('attendees')
      .update({ checked_in_at: new Date().toISOString() })
      .eq('code', code).is('checked_in_at', null).select().maybeSingle()

    if (updated) {
      navigator.vibrate?.(120)
      setResult({ status: 'ok', person: updated })
      loadTally()
      return
    }

    const { data: existing } = await supabase.from('attendees')
      .select('*').eq('code', code).maybeSingle()

    if (existing) {
      navigator.vibrate?.([120, 80, 120])
      setResult({ status: 'dup', person: existing })
    } else {
      navigator.vibrate?.(400)
      setResult({ status: 'invalid' })
    }
  }

  useEffect(() => {
    loadTally()
    const scanner = new Html5Qrcode('reader')
    const started = scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (w, h) => {
            const s = Math.floor(Math.min(w, h) * 0.7)
            return { width: s, height: s }
          },
        },
        (text) => {
          if (busy.current) return
          busy.current = true
          handle(text.trim().toUpperCase())
        },
        () => {}
      )
      .then(() => true)
      .catch(() => {
        setError('مقدرتش أفتح الكاميرا. اسمح للمتصفح بالوصول للكاميرا، وتأكد إن الرابط يبدأ بـ https. تقدر تكتب الكود يدويًا تحت.')
        return false
      })

    // نوقف الكاميرا بس لو اشتغلت فعلًا (غير كده المكتبة بترمي خطأ)
    return () => {
      started
        .then((ok) => (ok ? scanner.stop().then(() => scanner.clear()) : undefined))
        .catch(() => {})
    }
  }, [])

  function next() {
    setResult(null)
    busy.current = false
  }

  function submitManual(e) {
    e.preventDefault()
    const code = manual.trim().toUpperCase()
    if (!code || busy.current) return
    busy.current = true
    setManual('')
    handle(code)
  }

  const p = result?.person
  const cat = p ? CATEGORIES[p.category] : null
  const pct = tally.total ? Math.round((tally.checked / tally.total) * 100) : 0

  return (
    <div className="max-w-md mx-auto space-y-3">
      <Card className="p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-2">دخلوا لحد دلوقتي</span>
          <span className="font-bold text-lg">{tally.checked} <span className="text-muted font-normal text-sm">من {tally.total}</span></span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-fog overflow-hidden" role="progressbar"
          aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div id="reader" className="bg-ink min-h-64" />
      </Card>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <p className="text-center text-sm text-muted">وجّه الكاميرا ناحية الـ QR</p>

      <form onSubmit={submitManual} className="flex gap-2">
        <input className={`${inputCls} tracking-wider`} dir="auto" placeholder="أو اكتب الكود يدويًا"
          value={manual} onChange={(e) => setManual(e.target.value)} aria-label="الكود" />
        <Button variant="secondary" disabled={!manual.trim()}>تأكيد</Button>
      </form>

      {result && (
        <div role="status" aria-live="assertive" onClick={next}
          className={`fixed inset-0 z-50 flex flex-col p-6 ${
            result.status === 'invalid' ? 'bg-danger text-white' : `${cat.bg} ${cat.fg}`}`}>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
            {result.status === 'invalid' ? (
              <>
                <XCircle size={72} />
                <div className="text-4xl font-bold">كود غير صالح</div>
                <p className="text-lg opacity-90">الكود ده مش موجود في القايمة.</p>
              </>
            ) : (
              <>
                <span className="rounded-full bg-black/20 px-5 py-1 text-xl font-semibold">{cat.label}</span>
                <div className="text-5xl sm:text-6xl font-bold leading-tight max-w-full break-words">{p.name}</div>
                <div dir="ltr" className="tracking-widest text-lg opacity-80">{p.code}</div>
                {result.status === 'ok' ? (
                  <div className="flex items-center gap-2 rounded-control bg-black/25 px-4 py-3 text-xl">
                    <Check size={26} /> تم تسجيل الدخول
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-control bg-black/50 text-white px-4 py-3 text-lg">
                    <AlertTriangle size={26} className="shrink-0" />
                    <span>سبق تسجيل دخوله الساعة <span className="whitespace-nowrap">{fmtTime(p.checked_in_at)}</span></span>
                  </div>
                )}
              </>
            )}
          </div>
          <button onClick={(e) => { e.stopPropagation(); next() }}
            className="h-14 w-full rounded-control bg-black/25 text-xl font-semibold">
            المسح التالي
          </button>
        </div>
      )}
    </div>
  )
}
