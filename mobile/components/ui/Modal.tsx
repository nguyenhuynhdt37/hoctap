import React from 'react'
import { Modal as RNModal, View, Pressable, StyleSheet, Dimensions } from 'react-native'
import { MotiView, AnimatePresence } from 'moti'
import { Text } from './Text'
import { Button } from './Button'
import { useTranslation } from 'react-i18next'
import { cn } from '@/src/lib/utils'

const { width, height } = Dimensions.get('window')

interface ModalProps {
  visible: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'primary' | 'danger'
}

export function Modal({
  visible, onClose, onConfirm, title, description, 
  confirmText, cancelText, variant = 'primary'
}: ModalProps) {
  const { t } = useTranslation()

  return (
    <RNModal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <AnimatePresence>
        {visible && (
          <View style={styles.overlay}>
            {/* Backdrop Blur effect simulation */}
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
            >
              <Pressable style={{ flex: 1 }} onPress={onClose} />
            </MotiView>

            <MotiView
              from={{ opacity: 0, scale: 0.9, translateY: 20 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.9, translateY: 20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              className="w-[90%] bg-white dark:bg-zinc-900 rounded-[40px] overflow-hidden border border-white/20 dark:border-zinc-800 shadow-2xl"
            >
              <View className="p-8">
                <Text className="text-3xl font-extrabold tracking-tighter text-zinc-900 dark:text-zinc-50 mb-3">
                  {title}
                </Text>
                
                {description && (
                  <Text className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed mb-8">
                    {description}
                  </Text>
                )}

                <View className="flex-row gap-4">
                  <View className="flex-1">
                    <Button 
                      label={cancelText || t('common.cancel')} 
                      onPress={onClose} 
                      variant="secondary"
                      fullWidth
                    />
                  </View>
                  <View className="flex-1">
                    <Button 
                      label={confirmText || t('common.confirm')} 
                      onPress={() => { onConfirm?.(); onClose() }} 
                      variant={variant === 'danger' ? 'danger' : 'primary'}
                      fullWidth
                    />
                  </View>
                </View>
              </View>
            </MotiView>
          </View>
        )}
      </AnimatePresence>
    </RNModal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  }
})
