import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { supabase } from './supabase'
import { Card, Button, Field, inputCls } from './ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setErr('الإيميل أو كلمة المرور غلط. اتأكد منهم وجرّب تاني.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="grid place-items-center size-11 rounded-xl bg-ink text-white">
            <QrCode size={24} />
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight">بوابة الحضور</h1>
            <p className="text-sm text-muted">سجّل دخولك لإدارة الحضور</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <Field label="الإيميل">
            <input className={inputCls} type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="كلمة المرور">
            <input className={inputCls} type="password" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <Button className="w-full" disabled={loading}>
            {loading ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
