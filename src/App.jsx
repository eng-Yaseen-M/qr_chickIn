import { useEffect, useState } from 'react'
import { ScanLine, Users, BarChart3, Upload as UploadIcon, LogOut, QrCode } from 'lucide-react'
import { supabase } from './supabase'
import Login from './Login'
import Upload from './Upload'
import List from './List'
import Scan from './Scan'
import Analytics from './Analytics'

const NAV = [
  { key: 'scan', label: 'المسح', Icon: ScanLine },
  { key: 'list', label: 'المدعوين', Icon: Users },
  { key: 'analytics', label: 'التحليلات', Icon: BarChart3 },
  { key: 'upload', label: 'استيراد', Icon: UploadIcon },
]

export default function App() {
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState('scan')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-surface border-b border-line print:hidden">
        <div className="max-w-6xl mx-auto h-14 px-4 flex items-center gap-3">
          <div className="flex items-center gap-2 font-bold">
            <span className="grid place-items-center size-8 rounded-lg bg-ink text-white">
              <QrCode size={18} />
            </span>
            بوابة الحضور
          </div>

          <nav className="hidden sm:flex items-center gap-1 flex-1 mx-4" aria-label="التنقل">
            {NAV.map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                aria-current={tab === key ? 'page' : undefined}
                className={`flex items-center gap-2 h-9 px-3 rounded-control text-sm transition-colors ${
                  tab === key ? 'bg-ink text-white' : 'text-ink-2 hover:bg-fog'}`}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <span className="flex-1 sm:hidden" />

          <button aria-label="تسجيل الخروج" title="تسجيل الخروج"
            onClick={() => supabase.auth.signOut()}
            className="grid place-items-center size-9 rounded-control text-ink-2 hover:bg-fog">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-24 sm:pb-8">
        {tab === 'scan' && <Scan />}
        {tab === 'list' && <List refreshKey={refreshKey} onGoUpload={() => setTab('upload')} />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'upload' && (
          <Upload onDone={() => { setRefreshKey((k) => k + 1); setTab('list') }} />
        )}
      </main>

      <nav aria-label="التنقل"
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-line print:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {NAV.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`-mt-px flex flex-col items-center gap-1 py-2 text-xs border-t-2 ${
                tab === key ? 'border-ink text-ink font-semibold' : 'border-transparent text-muted'}`}>
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
