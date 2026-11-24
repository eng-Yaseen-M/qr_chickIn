// ألوان الفئات هي "لغة" التطبيق كله: نفس اللون في المسح والقوائم والرسوم والصور.
// لو غيّرت لون هنا، غيّره كمان في index.css (قسم @theme).
export const CATEGORIES = {
  student: { label: 'طالب', prefix: 'STU', hex: '#0f9d6b', bg: 'bg-student', soft: 'bg-student-soft', border: 'border-student', fg: 'text-white' },
  org: { label: 'منظمة', prefix: 'ORG', hex: '#2f6fed', bg: 'bg-org', soft: 'bg-org-soft', border: 'border-org', fg: 'text-white' },
  vip: { label: 'VIP', prefix: 'VIP', hex: '#d8960b', bg: 'bg-vip', soft: 'bg-vip-soft', border: 'border-vip', fg: 'text-ink' },
  doctor: { label: 'دكتور', prefix: 'DOC', hex: '#7b3fe4', bg: 'bg-doctor', soft: 'bg-doctor-soft', border: 'border-doctor', fg: 'text-white' },
}

// ترتيب العرض في كل مكان
export const CATEGORY_KEYS = ['vip', 'doctor', 'org', 'student']

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function makeCode(category) {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  const rand = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
  return `${CATEGORIES[category].prefix}-${rand}`
}
