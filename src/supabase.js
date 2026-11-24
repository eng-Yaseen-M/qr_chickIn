import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Supabase بيرجّع 1000 صف بس في الطلب الواحد، فبنجيب الداتا على دفعات
export async function fetchAllAttendees(columns = '*') {
  const all = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from('attendees')
      .select(columns)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + size - 1)
    if (error) throw error
    all.push(...data)
    if (data.length < size) break
  }
  return all
}
