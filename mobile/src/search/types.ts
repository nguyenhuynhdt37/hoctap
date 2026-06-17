export type GlobalSearchType =
  | 'screen'
  | 'tab'
  | 'menu'
  | 'feature'
  | 'route'
  | 'category'
  | 'topic'
  | 'course'
  | 'lesson'
  | 'profile'
  | 'wallet'
  | 'transaction'
  | 'notification'
  | 'setting'
  | 'language'

export interface GlobalSearchItem {
  id: string
  title: string
  description: string
  type: GlobalSearchType
  route: string
  icon: string
  keywords: string[]
  alias?: string[]
}

export interface GlobalSearchSection {
  key: GlobalSearchType | 'all'
  label: string
}
