const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const appDir = path.join(root, 'app')
const featuresDir = path.join(root, 'components', 'features')
const outputPath = path.join(root, 'src', 'search', 'generated-project-index.ts')
const scanDirs = ['app', 'components', 'src'].map(dir => path.join(root, dir))

const routeTitles = {
  index: ['Home', 'Trang chủ'],
  explore: ['Explore', 'Khám phá', 'Search', 'Tìm kiếm'],
  notifications: ['Notifications', 'Thông báo'],
  'my-learn': ['My Learning', 'Khóa học của tôi'],
  profile: ['Profile', 'Hồ sơ'],
  settings: ['Settings', 'Cài đặt'],
  wallet: ['Wallet', 'Ví'],
  transactions: ['Transactions', 'Giao dịch'],
  language: ['Language', 'Ngôn ngữ'],
  favorites: ['Favorites', 'Yêu thích'],
  'complete-profile': ['Complete Profile', 'Hoàn thiện hồ sơ'],
  login: ['Login', 'Đăng nhập'],
  register: ['Register', 'Đăng ký'],
  phone: ['Phone Login', 'Đăng nhập điện thoại'],
  'verify-otp': ['Verify OTP', 'Xác thực OTP'],
  onboarding: ['Onboarding', 'Giới thiệu'],
  course: ['Course', 'Khóa học'],
  learning: ['Learning', 'Bài học'],
  demo: ['Demo'],
  'payment-result': ['Payment Result', 'Kết quả thanh toán'],
}

const typeBySegment = {
  explore: 'tab',
  notifications: 'tab',
  'my-learn': 'tab',
  profile: 'tab',
  settings: 'screen',
  wallet: 'wallet',
  transactions: 'transaction',
  language: 'language',
  favorites: 'screen',
  'complete-profile': 'profile',
  login: 'route',
  register: 'route',
  phone: 'route',
  'verify-otp': 'route',
  onboarding: 'route',
  course: 'course',
  learning: 'lesson',
}

const iconByType = {
  tab: 'grid',
  screen: 'smartphone',
  route: 'navigation',
  feature: 'zap',
  course: 'book',
  lesson: 'play-circle',
  profile: 'user',
  wallet: 'credit-card',
  transaction: 'repeat',
  notification: 'bell',
  setting: 'settings',
  language: 'globe',
  menu: 'menu',
  category: 'folder',
  topic: 'tag',
}

function walk(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(fullPath)
    return fullPath
  })
}

function toRoute(file) {
  const rel = path.relative(appDir, file).replace(/\\/g, '/')
  if (!/\.(tsx|ts)$/.test(rel) || rel.endsWith('/_layout.tsx') || rel === '_layout.tsx') return null
  const noExt = rel.replace(/\.(tsx|ts)$/, '')
  const parts = noExt.split('/').filter(Boolean)
  const routeParts = parts.map(part => part === 'index' ? '' : part)
  const route = `/${routeParts.filter(Boolean).join('/')}` || '/'
  return route
}

function wordsFromRoute(route) {
  return route
    .split('/')
    .filter(Boolean)
    .filter(part => !part.startsWith('('))
    .map(part => part.replace(/\[(.+?)\]/g, '$1'))
}

function titleFor(words) {
  const leaf = [...words].reverse().find(Boolean) || 'index'
  const known = routeTitles[leaf]
  if (known) return known[0]
  return leaf
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function aliasesFor(words) {
  return [...new Set(words.flatMap(word => routeTitles[word] ?? [word]))]
}

function routeItem(file) {
  const route = toRoute(file)
  if (!route) return null
  const words = wordsFromRoute(route)
  const leaf = [...words].reverse().find(Boolean) || 'index'
  const type = typeBySegment[leaf] ?? typeBySegment[words[0]] ?? 'screen'
  const title = titleFor(words)
  return {
    id: `route:${route}`,
    title,
    description: `Project route ${route}`,
    type,
    route,
    icon: iconByType[type] ?? 'navigation',
    keywords: ['route', 'screen', 'màn hình', ...words],
    alias: aliasesFor(words),
  }
}

function featureItems() {
  if (!fs.existsSync(featuresDir)) return []
  return fs.readdirSync(featuresDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const name = entry.name
      const title = name.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
      return {
        id: `feature:${name}`,
        title,
        description: `Feature module components/features/${name}`,
        type: 'feature',
        route: routeForFeature(name),
        icon: 'zap',
        keywords: ['feature', 'chức năng', name, ...name.split('-')],
        alias: routeTitles[name] ?? [],
      }
    })
}

function routeForFeature(name) {
  if (name.includes('wallet')) return '/(app)/wallet'
  if (name.includes('learning')) return '/(app)/(tabs)/my-learn'
  if (name.includes('profile')) return '/(app)/(tabs)/profile'
  if (name.includes('auth')) return '/(auth)/login'
  if (name.includes('course')) return '/(app)/(tabs)/explore'
  if (name.includes('categor')) return '/(app)/(tabs)/explore'
  return '/(app)/(tabs)'
}

function routerPushItems() {
  const routePattern = /router\.(?:push|replace)\(\s*['"`]([^'"`]+)['"`]/g
  return scanDirs.flatMap(walk)
    .filter(file => /\.(tsx|ts)$/.test(file))
    .flatMap(file => {
      const text = fs.readFileSync(file, 'utf8')
      const items = []
      for (const match of text.matchAll(routePattern)) {
        const route = match[1]
        if (!route.startsWith('/')) continue
        const words = wordsFromRoute(route)
        const title = titleFor(words)
        items.push({
          id: `navigation:${route}`,
          title,
          description: `Navigation target found in ${path.relative(root, file).replace(/\\/g, '/')}`,
          type: typeBySegment[words.at(-1)] ?? 'route',
          route,
          icon: 'navigation',
          keywords: ['navigation', 'menu', 'route', ...words],
          alias: aliasesFor(words),
        })
      }
      return items
    })
}

function unique(items) {
  const map = new Map()
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item)
  }
  return [...map.values()]
}

const items = unique([
  ...walk(appDir).map(routeItem).filter(Boolean),
  ...featureItems(),
  ...routerPushItems(),
]).sort((a, b) => a.id.localeCompare(b.id))

const content = `// Auto-generated by scripts/generate-search-index.js. Do not edit by hand.
import type { GlobalSearchItem } from './types'

export const SCANNED_PROJECT_SEARCH_ITEMS: GlobalSearchItem[] = ${JSON.stringify(items, null, 2)}
`

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, content)
console.log(`Generated ${items.length} search items at ${path.relative(root, outputPath)}`)
