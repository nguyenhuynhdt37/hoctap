import type { GlobalSearchItem } from './types'

const SYNONYM_GROUPS = [
  ['wallet', 'vi', 'ví', 'so du', 'số dư', 'balance'],
  ['course', 'khoa hoc', 'khóa học'],
  ['lesson', 'bai hoc', 'bài học'],
  ['instructor', 'giang vien', 'giảng viên', 'teacher'],
  ['notification', 'thong bao', 'thông báo'],
  ['transaction', 'giao dich', 'giao dịch', 'payment', 'thanh toan', 'thanh toán'],
  ['profile', 'ho so', 'hồ sơ', 'user', 'nguoi dung', 'người dùng'],
  ['settings', 'cai dat', 'cài đặt'],
  ['language', 'ngon ngu', 'ngôn ngữ'],
  ['category', 'danh muc', 'danh mục'],
  ['search', 'tim kiem', 'tìm kiếm', 'explore', 'kham pha', 'khám phá'],
]

const SYNONYM_MAP = SYNONYM_GROUPS.reduce<Record<string, string[]>>((acc, group) => {
  const normalized = [...new Set(group.map(normalizeRawText))]
  for (const word of normalized) acc[word] = normalized
  return acc
}, {})

function normalizeRawText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function normalizeSearchText(value: unknown): string {
  return normalizeRawText(value)
    .replace(/[^\p{L}\p{N}\s/_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function createSearchDocument(item: GlobalSearchItem): string {
  return normalizeSearchText([
    item.title,
    item.description,
    item.type,
    item.route,
    ...item.keywords,
    ...(item.alias ?? []),
  ].join(' '))
}

function expandQueryToken(token: string): string[] {
  return SYNONYM_MAP[token] ?? [token]
}

export function filterSearchItems(
  items: GlobalSearchItem[],
  query: string,
  type: GlobalSearchItem['type'] | 'all' = 'all'
): GlobalSearchItem[] {
  const normalizedQuery = normalizeSearchText(query)
  const tokens = normalizedQuery.split(' ').filter(Boolean)

  return items
    .filter(item => type === 'all' || item.type === type)
    .filter(item => {
      if (tokens.length === 0) return true
      const document = createSearchDocument(item)
      return tokens.every(token => expandQueryToken(token).some(candidate => document.includes(candidate)))
    })
    .slice(0, 80)
}
