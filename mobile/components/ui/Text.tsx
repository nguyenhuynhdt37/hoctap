import React from 'react'
import { Text as RNText, type TextProps } from 'react-native'
import { cn } from '@/src/lib/utils'

interface TypographyProps extends TextProps {
  className?: string
  children: React.ReactNode
}

// ============================================
// Typography Components — Using Standard Scale
// Scale: xs(12) → sm(14) → base(16) → lg(18) → xl(20) → 2xl(22) → 3xl(24) → 4xl(28) → 5xl(32)
// ============================================

/**
 * H1 — Display / Hero titles
 * Size: 4xl (28px), Weight: ExtraBold
 */
export function H1({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-4xl font-extrabold text-foreground leading-tight tracking-tight", className)} {...props} />
}

/**
 * H2 — Page titles
 * Size: 3xl (24px), Weight: Bold
 */
export function H2({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-3xl font-bold text-foreground leading-tight tracking-tight", className)} {...props} />
}

/**
 * H3 — Section titles / Card titles
 * Size: 2xl (22px), Weight: Bold
 */
export function H3({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-2xl font-bold text-foreground leading-snug", className)} {...props} />
}

/**
 * H4 — Subsection titles
 * Size: xl (20px), Weight: SemiBold
 */
export function H4({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-xl font-semibold text-foreground leading-snug", className)} {...props} />
}

/**
 * BodyText — Main content text
 * Size: base (16px), Weight: Regular
 */
export function BodyText({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-base font-sans text-foreground leading-relaxed", className)} {...props} />
}

/**
 * SmallText — Secondary content
 * Size: sm (14px), Weight: Regular
 */
export function SmallText({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-sm font-sans text-foreground leading-normal", className)} {...props} />
}

/**
 * MutedText — Muted/secondary text
 * Size: sm (14px), Weight: Regular, Color: muted
 */
export function MutedText({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-sm font-sans text-muted-foreground leading-normal", className)} {...props} />
}

/**
 * LabelText — Labels, categories
 * Size: xs (12px), Weight: Bold, Style: UPPERCASE
 */
export function LabelText({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-xs font-semibold text-muted-foreground uppercase tracking-wider", className)} {...props} />
}

/**
 * CaptionText — Captions, timestamps
 * Size: xs (12px), Weight: Regular
 */
export function CaptionText({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-xs font-sans text-muted-foreground leading-normal", className)} {...props} />
}

/**
 * Text — Base text component
 * Size: base (16px), Weight: Regular
 */
export function Text({ className, ...props }: TypographyProps) {
  return <RNText className={cn("text-base font-sans text-foreground leading-relaxed", className)} {...props} />
}
