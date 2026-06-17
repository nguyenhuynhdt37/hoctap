import React, { useState } from 'react'
import { View, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { formatCurrency, formatDate } from '@/src/utils/format'
import type { DiscountItem } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  discounts: DiscountItem[]
  isLoading: boolean
  onSelect: (discount: DiscountItem) => void
  isDark?: boolean
}

function DiscountCard({ item, onSelect, isDark }: { item: DiscountItem; onSelect: () => void; isDark: boolean }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const canExpand = Boolean(item.name || item.description)
  const value = item.discount_type === 'percent' ? `${item.percent_value}% ${t('course_detail.discounts.off')}` : formatCurrency(item.fixed_value ?? 0)
  const expiryDate = item.end_at ? formatDate(item.end_at) : t('course_detail.discounts.no_limit')

  return (
    <Pressable
      onPress={() => { if (canExpand) setExpanded(!expanded); onSelect() }}
      className={`p-5 mb-4 rounded-[32px] border ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-3 flex-wrap">
            <View className={`px-3 py-1.5 rounded-lg ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'}`}>
              <Text className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">{item.discount_code}</Text>
            </View>
            <Text className={`text-xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{value}</Text>
          </View>
          <View className="flex-row items-center gap-2 mt-3 ml-1">
            <Ionicons name="calendar-outline" size={12} color={isDark ? '#52525b' : '#a1a1aa'} />
            <Text className={`text-[11px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {t('course_detail.discounts.expiry', { date: expiryDate })}
            </Text>
          </View>
          {canExpand && expanded && (
            <View className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/5">
              {item.name && <Text className={`text-sm font-black mb-1 ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>{item.name}</Text>}
              {item.description && <Text className={`text-xs font-medium leading-relaxed ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{item.description}</Text>}
            </View>
          )}
          {canExpand && !expanded && (
            <Text className={`mt-3 text-[11px] font-black uppercase tracking-widest text-emerald-600 opacity-60 ml-1`}>
              {t('course_detail.discounts.view_more')}
            </Text>
          )}
        </View>
        <View className={`w-10 h-10 rounded-full border items-center justify-center ml-4 ${isDark ? 'border-white/5 bg-zinc-800' : 'border-zinc-200 bg-white'}`}>
          <Ionicons name="chevron-forward" size={16} color={isDark ? '#3f3f46' : '#d1d5db'} />
        </View>
      </View>
    </Pressable>
  )
}

export function DiscountModal({ isOpen, onClose, discounts, isLoading, onSelect, isDark = false }: Props) {
  const { t } = useTranslation()
  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60 p-6">
        <View className={`w-full max-w-md rounded-[40px] overflow-hidden shadow-2xl ${isDark ? 'bg-zinc-950 border border-white/5' : 'bg-white'}`}>
          <View className={`px-8 py-6 flex-row items-center justify-between border-b ${isDark ? 'border-white/5' : 'border-zinc-50'}`}>
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 items-center justify-center">
                <Ionicons name="pricetags" size={20} color="#10B981" />
              </View>
              <Text className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t('course_detail.discounts.title')}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={15} className="w-10 h-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
              <Ionicons name="close" size={20} color={isDark ? '#71717A' : '#6B7280'} />
            </Pressable>
          </View>
          <ScrollView className="max-h-[500px] p-6">
            {isLoading ? (
              <View className="py-12 items-center">
                <ActivityIndicator size="large" color="#10B981" />
                <Text className={`mt-4 text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{t('course_detail.discounts.loading')}</Text>
              </View>
            ) : discounts.length === 0 ? (
              <View className="py-12 items-center">
                <View className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 items-center justify-center mb-6">
                  <Ionicons name="pricetag-outline" size={32} color={isDark ? '#3f3f46' : '#D1D5DB'} />
                </View>
                <Text className={`text-xs font-black uppercase tracking-widest text-center ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {t('course_detail.discounts.no_discounts')}
                </Text>
              </View>
            ) : (
              <>
                <Text className={`text-[11px] font-black uppercase tracking-widest mb-6 ml-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {t('course_detail.discounts.select_hint')}
                </Text>
                {discounts.map((item) => <DiscountCard key={item.id} item={item} onSelect={() => onSelect(item)} isDark={isDark} />)}
              </>
            )}
          </ScrollView>
          <View className={`px-8 py-6 border-t ${isDark ? 'border-white/5' : 'border-zinc-50'}`}>
            <Pressable onPress={onClose} className="w-full py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900">
              <Text className={`text-center text-xs font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t('common.close')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
