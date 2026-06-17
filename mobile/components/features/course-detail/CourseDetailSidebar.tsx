import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Pressable, Alert, Share, ActivityIndicator, TextInput } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { Text } from '@/components/ui/Text'
import { Button } from '@/components/ui/Button'
import { courseService } from '@/src/services/course.service'
import { useAuthStore } from '@/src/stores/auth.store'
import { EnrollmentModal } from './components/EnrollmentModal'
import { DiscountModal } from './components/DiscountModal'
import { formatCurrency } from '@/src/utils/format'
import { useToastStore } from '@/src/stores/toast.store'
import type { CourseDetailSidebarProps } from './types'

// ── Helpers ──────────────────────────────────────────────────────────────────
function countLessons(sections: any[]) {
  return sections?.reduce((total, section) => total + ((section as any)?.lessons?.length ?? 0), 0) ?? 0
}

function countDuration(sections: any[]) {
  return sections?.reduce((total, section) =>
    total + ((section as any)?.lessons?.reduce((l: number, lesson: any) => l + (lesson.duration ?? 0), 0) ?? 0), 0) ?? 0
}

// ── Component ────────────────────────────────────────────────────────────────
export function CourseDetailSidebar({ course, router, isDark = false }: CourseDetailSidebarProps) {
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const mountedRef = useRef(false)
  useEffect(() => { mountedRef.current = true }, [])

  // State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [enrollSuccess, setEnrollSuccess] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false)
  const [discountInput, setDiscountInput] = useState('')
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([])
  const [isLoadingDiscounts, setIsLoadingDiscounts] = useState(false)
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false)
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false)
  const [discountInfo, setDiscountInfo] = useState<any>(null)
  const [pricingResult, setPricingResult] = useState<any>(null)

  const isInstructorOwner = Boolean(user?.id) && Boolean(course.instructor?.id) && user?.id === course.instructor?.id
  const hasPrice = course.base_price > 0
  const totalDuration = countDuration(course.sections)
  const totalLessons = countLessons(course.sections)
  const isDiscountApplied = pricingResult?.applied ?? false
  const finalPrice = pricingResult?.final_price ?? course.base_price

  // Helpers
  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '--'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h} ${t('common.time.hours')} ${m} ${t('common.time.mins')}`
    if (m > 0) return `${m} ${t('common.time.mins')}`
    return `${seconds} s`
  }

  // Fetch favorite status
  useEffect(() => {
    if (!user?.id || !course.id) return
    let mounted = true
    const fetchStatus = async () => {
      try {
        const resp = await courseService.getFavorites()
        if (!mounted) return
        const found = (resp.data?.favourites ?? []).some(
          (item: any) => item.id === course.id || item.course_id === course.id
        )
        setIsFavorite(found)
      } catch { /* silent */ }
    }
    fetchStatus()
    return () => { mounted = false }
  }, [course.id, user?.id])

  // Fetch available discounts
  useEffect(() => {
    if (!course.id || !hasPrice) return
    let mounted = true
    const fetchDiscounts = async () => {
      try {
        setIsLoadingDiscounts(true)
        const resp = await courseService.getAvailableDiscounts([course.id])
        if (!mounted) return
        const discounts = resp.data?.items ?? []
        setAvailableDiscounts(discounts)
        if (discounts.length > 0) {
          setDiscountInput(discounts[0].discount_code)
          try {
            setIsApplyingDiscount(true)
            const applyResp = await courseService.applyDiscount([course.id], discounts[0].discount_code)
            if (!mounted) return
            const result = applyResp.data?.items?.find((item: any) => item.course_id === course.id)
            if (result?.applied) {
              setPricingResult(result)
              setDiscountInfo({
                discount_code: applyResp.data?.discount_code ?? discounts[0].discount_code,
                discount_name: applyResp.data?.discount_name ?? discounts[0].name,
                discount_percent_value: applyResp.data?.discount_percent_value ?? discounts[0].percent_value,
                discount_fixed_value: applyResp.data?.discount_fixed_value ?? discounts[0].fixed_value,
              })
            }
          } catch { /* silent */ }
          finally { if (mounted) setIsApplyingDiscount(false) }
        }
      } catch { /* silent */ }
      finally { if (mounted) setIsLoadingDiscounts(false) }
    }
    fetchDiscounts()
    return () => { mounted = false }
  }, [course.id, hasPrice])

  // Handlers
  const handleApplyDiscount = useCallback(async () => {
    if (!course.id || !discountInput.trim()) return
    try {
      setIsApplyingDiscount(true)
      const resp = await courseService.applyDiscount([course.id], discountInput.trim())
      const result = resp.data?.items?.find((item: any) => item.course_id === course.id)
      if (!result?.applied) {
        Alert.alert(t('common.error'), result?.reason ?? t('course_detail.discounts.discount_invalid'))
        setPricingResult(null)
        setDiscountInfo(null)
        return
      }
      setPricingResult(result)
      setDiscountInfo({
        discount_code: resp.data?.discount_code ?? discountInput,
        discount_name: resp.data?.discount_name ?? null,
        discount_percent_value: resp.data?.discount_percent_value ?? null,
        discount_fixed_value: resp.data?.discount_fixed_value ?? null,
      })
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.detail ?? err?.response?.data?.message ?? t('common.error'))
      setPricingResult(null)
      setDiscountInfo(null)
    } finally {
      setIsApplyingDiscount(false)
    }
  }, [course.id, discountInput, t])

  const handleSelectDiscount = useCallback(async (discount: any) => {
    setDiscountInput(discount.discount_code)
    try {
      setIsApplyingDiscount(true)
      const resp = await courseService.applyDiscount([course.id], discount.discount_code)
      const result = resp.data?.items?.find((item: any) => item.course_id === course.id)
      if (!result?.applied) {
        Alert.alert(t('common.error'), result?.reason ?? t('course_detail.discounts.discount_invalid'))
        setPricingResult(null)
        setDiscountInfo(null)
        return
      }
      setPricingResult(result)
      setDiscountInfo({
        discount_code: resp.data?.discount_code ?? discount.discount_code,
        discount_name: resp.data?.discount_name ?? discount.name,
        discount_percent_value: resp.data?.discount_percent_value ?? discount.percent_value,
        discount_fixed_value: resp.data?.discount_fixed_value ?? discount.fixed_value,
      })
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.detail ?? err?.response?.data?.message ?? t('common.error'))
      setPricingResult(null)
      setDiscountInfo(null)
    } finally {
      setIsApplyingDiscount(false)
    }
  }, [course.id, t])

  const handleClearDiscount = useCallback(() => {
    setPricingResult(null)
    setDiscountInfo(null)
    setDiscountInput('')
  }, [])

  const handleToggleFavorite = useCallback(async () => {
    if (!user?.id) { Alert.alert(t('common.error'), t('auth.profile.login_required')); return }
    try {
      setIsLoadingFavorite(true)
      const resp = await courseService.toggleFavorite(course.id)
      setIsFavorite(resp.data?.is_favourite ?? !isFavorite)
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.response?.data?.detail ?? err?.message ?? t('common.error'))
    } finally {
      setIsLoadingFavorite(false)
    }
  }, [course.id, user?.id, isFavorite, t])

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ 
        title: course.title, 
        message: t('common.share_message', { title: course.title, url: `https://hoctap.example.com/course/${course.slug}` }) 
      })
    } catch { /* silent */ }
  }, [course.title, course.slug])

  const handleEnroll = useCallback(async () => {
    try {
      setIsEnrolling(true)
      if (isInstructorOwner) {
        try { await courseService.enroll(course.id) } catch { /* ignore */ }
        setTimeout(() => { if (mountedRef.current) router.push(`/learning/${course.slug}` as any) }, 0)
        return
      }

      if (hasPrice) {
        await courseService.checkout([course.id])
        useToastStore.getState().show({
          title: t('common.success'),
          message: t('course_detail.enroll_success'),
          type: 'success'
        })
        setEnrollSuccess(true)
        setTimeout(() => { if (mountedRef.current) router.push(`/learning/${course.slug}` as any) }, 1500)
      } else {
        await courseService.enroll(course.id)
        useToastStore.getState().show({
          title: t('common.success'),
          message: t('course_detail.enroll_success'),
          type: 'success'
        })
        setEnrollSuccess(true)
        setTimeout(() => { if (mountedRef.current) router.push(`/learning/${course.slug}` as any) }, 1500)
      }
    } catch (err: any) {
      Alert.alert(
        t('common.error'), 
        err?.response?.data?.detail ?? err?.response?.data?.message ?? t('common.error')
      )
    } finally {
      setIsEnrolling(false)
    }
  }, [isInstructorOwner, hasPrice, course.id, course.slug, router, t])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View className="py-4">
      {/* Pricing Card */}
      <View className={`mx-4 rounded-[32px] border overflow-hidden shadow-sm ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-100'}`}>
        <View className="px-6 pt-7 pb-5 items-center">
          {hasPrice ? (
            <View className="items-center">
              {isDiscountApplied && (
                <Text className={`text-lg font-medium line-through mb-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {formatCurrency(course.base_price)}
                </Text>
              )}
              <View className="flex-row items-baseline">
                <Text className={`text-4xl font-black text-center ${isDiscountApplied ? 'text-red-500' : isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatCurrency(finalPrice).split(' ')[0]}
                </Text>
                <Text className={`text-sm font-bold ml-2 ${isDiscountApplied ? 'text-red-500/70' : isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>VND</Text>
              </View>
              {isDiscountApplied && discountInfo?.discount_percent_value && (
                <View className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-500/10 rounded-full">
                  <Text className="text-[11px] font-black text-red-600 dark:text-red-400 uppercase tracking-widest">-{discountInfo.discount_percent_value}% OFF</Text>
                </View>
              )}
            </View>
          ) : (
            <Text className={`text-3xl font-black ${isDark ? 'text-white' : 'text-zinc-900'}`}>{t('course_detail.free')}</Text>
          )}
        </View>

        <View className="px-6 pb-6">
          {isInstructorOwner && (
            <View className="mb-4 pb-4 border-b border-zinc-100 dark:border-white/5">
              <Button label={t('course_detail.start_learning')} onPress={handleEnroll} loading={isEnrolling} size="lg" fullWidth />
            </View>
          )}

          {!isInstructorOwner && (
            <View className="mb-4">
              <Button
                label={course.base_price === 0 ? t('course_detail.enroll_now') : t('course_detail.buy_now')}
                onPress={() => course.base_price === 0 ? handleEnroll() : setIsEnrollModalOpen(true)}
                loading={isEnrolling}
                size="lg"
                fullWidth
              />
            </View>
          )}

          {/* Discount */}
          {hasPrice && (
            <View className="mb-4">
              {isDiscountApplied ? (
                <View className={`p-4 rounded-2xl border ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-100'}`}>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3 flex-1">
                      <View className="w-8 h-8 rounded-full bg-red-500/10 items-center justify-center">
                        <Ionicons name="pricetag" size={14} color="#EF4444" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-black text-red-600 dark:text-red-400 tracking-tight">{discountInfo?.discount_code}</Text>
                        {discountInfo?.discount_name && <Text className="text-[11px] font-bold text-red-500/60 uppercase tracking-widest mt-0.5" numberOfLines={1}>{discountInfo.discount_name}</Text>}
                      </View>
                    </View>
                    <Pressable onPress={handleClearDiscount} hitSlop={10} className="px-3 py-1.5 rounded-lg bg-red-500/10"><Text className="text-[11px] font-black text-red-500 uppercase tracking-widest">{t('common.remove')}</Text></Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <View className="flex-row gap-2">
                    <View className={`flex-1 flex-row items-center h-12 px-4 rounded-2xl border ${isDark ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-100'}`}>
                      <Ionicons name="pricetag-outline" size={16} color={isDark ? '#52525b' : '#a1a1aa'} />
                      <TextInput
                        value={discountInput}
                        onChangeText={setDiscountInput}
                        placeholder={t('course_detail.apply_discount_placeholder')}
                        placeholderTextColor={isDark ? '#52525b' : '#a1a1aa'}
                        className={`flex-1 ml-3 text-sm font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}
                        autoCapitalize="characters"
                      />
                    </View>
                    <Pressable
                      onPress={handleApplyDiscount}
                      disabled={isApplyingDiscount || !discountInput.trim()}
                      className={`px-5 items-center justify-center rounded-2xl ${isApplyingDiscount || !discountInput.trim() ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-emerald-500'}`}
                    >
                      {isApplyingDiscount ? <ActivityIndicator size="small" color="white" /> : <Text className={`text-xs font-black uppercase tracking-widest ${isApplyingDiscount || !discountInput.trim() ? 'text-zinc-400' : 'text-white'}`}>{t('common.apply')}</Text>}
                    </Pressable>
                  </View>
                  {availableDiscounts.length > 0 && (
                    <Pressable onPress={() => setIsDiscountModalOpen(true)} className="mt-3 flex-row items-center ml-1">
                      <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                      <Text className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">{t('course_detail.view_available_discounts', { count: availableDiscounts.length })}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Favorite + Share */}
          <View className="flex-row gap-3">
            <Pressable 
              onPress={handleToggleFavorite} 
              disabled={isLoadingFavorite} 
              className={`flex-1 h-12 rounded-2xl border flex-row items-center justify-center gap-2 ${isFavorite ? 'bg-red-500/10 border-red-500/20' : 'border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50'}`}
            >
              {isLoadingFavorite ? <ActivityIndicator size="small" color={isFavorite ? '#EF4444' : '#10B981'} /> : (
                <>
                  <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={18} color={isFavorite ? '#EF4444' : isDark ? '#52525b' : '#a1a1aa'} />
                  <Text className={`text-[11px] font-black uppercase tracking-widest ${isFavorite ? 'text-red-500' : isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {isFavorite ? t('course_detail.already_favourited') : t('course_detail.favourite')}
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable 
              onPress={handleShare} 
              className="flex-1 h-12 rounded-2xl border border-zinc-100 dark:border-white/5 bg-zinc-50/50 dark:bg-zinc-900/50 flex-row items-center justify-center gap-2"
            >
              <Feather name="share-2" size={16} color={isDark ? '#52525b' : '#a1a1aa'} />
              <Text className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{t('common.share')}</Text>
            </Pressable>
          </View>
        </View>

        <View className="px-6 pb-6 items-center">
          <View className="flex-row items-center gap-2">
             <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
             <Text className={`text-[11px] font-bold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{t('course_detail.money_back_guarantee')}</Text>
          </View>
        </View>

        {/* Stats */}
        <View className={`px-6 pb-6 border-t ${isDark ? 'border-white/5 pt-6' : 'border-zinc-50 pt-6'}`}>
          {[
            { icon: 'time-outline', label: t('course_detail.total_duration_label'), value: formatDuration(totalDuration) },
            { icon: 'play-circle-outline', label: t('course_detail.lessons_count_label'), value: totalLessons },
            { icon: 'stats-chart-outline', label: t('course_detail.level_label'), value: course.level ? t(`course_detail.levels.${course.level}`) : 'N/A' },
            { icon: 'globe-outline', label: t('course_detail.language_label'), value: (course.language ?? 'VI').toUpperCase() },
          ].map((item) => (
            <View key={item.label} className="flex-row justify-between py-2.5">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800/50 items-center justify-center">
                  <Ionicons name={item.icon as any} size={14} color={isDark ? '#71717a' : '#9CA3AF'} />
                </View>
                <Text className={`text-xs font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{item.label}</Text>
              </View>
              <Text className={`text-xs font-black ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Benefits */}
      <View className={`mx-4 mt-6 rounded-[32px] p-6 ${isDark ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-emerald-50'}`}>
        <Text className={`text-xs font-black uppercase tracking-widest mb-5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{t('course_detail.what_you_get')}</Text>
        {[
          { icon: 'infinite', text: t('course_detail.lifetime_access') },
          { icon: 'ribbon-outline', text: t('course_detail.completion_certificate') },
          { icon: 'headset-outline', text: t('course_detail.support_24_7') },
          { icon: 'shield-checkmark-outline', text: t('course_detail.full_money_back') },
        ].map((item) => (
          <View key={item.text} className="flex-row items-center gap-3.5 mb-4">
            <View className="w-7 h-7 rounded-full bg-emerald-500/20 items-center justify-center">
              <Ionicons name={item.icon as any} size={13} color="#10B981" />
            </View>
            <Text className={`text-xs font-bold flex-1 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{item.text}</Text>
          </View>
        ))}
      </View>

      {/* Modals */}
      <EnrollmentModal
        isOpen={isEnrollModalOpen}
        onClose={() => { setIsEnrollModalOpen(false); setEnrollSuccess(false) }}
        course={course}
        totalDuration={totalDuration}
        isEnrolling={isEnrolling}
        enrollSuccess={enrollSuccess}
        onEnroll={handleEnroll}
        finalPrice={finalPrice}
        isDark={isDark}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        discounts={availableDiscounts}
        isLoading={isLoadingDiscounts}
        onSelect={handleSelectDiscount}
        isDark={isDark}
      />
    </View>
  )
}
