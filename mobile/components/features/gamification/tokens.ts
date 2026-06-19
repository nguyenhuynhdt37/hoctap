/**
 * Gamification Design System Tokens
 * Dùng chung cho: Daily Check-in, Streak, Mission, Achievement, Reward Shop
 */

// ─────────────────────────────────────────────────────────────
// COLOR TOKENS
// ─────────────────────────────────────────────────────────────

export const GamificationColors = {
  // Brand
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Peak (coin)
  peak: {
    light: '#FEF3C7',
    DEFAULT: '#F59E0B',
    glow: 'rgba(245,158,11,0.35)',
    dark: '#D97706',
  },

  // States
  checked: {
    bg: '#10b981',
    border: '#059669',
    icon: '#ffffff',
    glow: 'rgba(16,185,129,0.40)',
  },

  today: {
    bg: 'rgba(16,185,129,0.15)',
    border: '#10b981',
    text: '#059669',
  },

  locked: {
    bg: 'rgba(161,161,170,0.10)',
    border: 'rgba(161,161,170,0.25)',
    icon: '#a1a1aa',
  },

  mystery: {
    bg: 'rgba(139,92,246,0.15)',
    border: 'rgba(139,92,246,0.40)',
    icon: '#7c3aed',
    glow: 'rgba(139,92,246,0.35)',
  },

  // Streak fire
  streak: {
    DEFAULT: '#F97316',
    glow: 'rgba(249,115,22,0.35)',
    dark: '#EA580C',
    light: '#FFEDD5',
  },

  // EXP / Level
  exp: {
    DEFAULT: '#6366F1',
    glow: 'rgba(99,102,241,0.35)',
    dark: '#4F46E5',
    light: '#E0E7FF',
  },

  // Achievement
  achievement: {
    DEFAULT: '#A855F7',
    glow: 'rgba(168,85,247,0.35)',
    dark: '#9333EA',
    light: '#F3E8FF',
  },

  // Dark mode overrides
  dark: {
    card: 'rgba(24,24,27,0.85)',
    cardBorder: 'rgba(63,63,70,0.60)',
    surface: 'rgba(39,39,42,0.80)',
  },

  light: {
    card: 'rgba(255,255,255,0.85)',
    cardBorder: 'rgba(228,228,231,0.80)',
    surface: 'rgba(244,244,245,0.90)',
  },
} as const

// ─────────────────────────────────────────────────────────────
// RADIUS TOKENS
// ─────────────────────────────────────────────────────────────

export const GamificationRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  full: 9999,
} as const

// ─────────────────────────────────────────────────────────────
// SHADOW TOKENS
// ─────────────────────────────────────────────────────────────

export const GamificationShadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  peak: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 6,
  },
  streak: {
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  exp: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  glow: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.40,
    shadowRadius: 16,
    elevation: 10,
  },
} as const

// ─────────────────────────────────────────────────────────────
// MOTION TOKENS (spring presets)
// ─────────────────────────────────────────────────────────────

export const GamificationMotion = {
  // Tap feedback
  press: {
    damping: 18,
    stiffness: 280,
    mass: 0.7,
  },
  // Entry animations
  enter: {
    damping: 22,
    stiffness: 200,
    mass: 0.8,
  },
  // Celebration
  bounce: {
    damping: 10,
    stiffness: 250,
    mass: 0.5,
  },
  // Smooth slide
  slide: {
    damping: 28,
    stiffness: 240,
    mass: 1.0,
  },
  // Timing (ms)
  duration: {
    fast: 200,
    normal: 350,
    slow: 600,
  },
  // Fade / FadeUp transition config for Moti
  fade: {
    from: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { type: 'timing' as const, duration: 200 },
  },
  fadeUp: {
    from: { opacity: 0, translateY: 8 },
    animate: { opacity: 1, translateY: 0 },
    transition: { type: 'spring' as const, damping: 22, stiffness: 200 },
  },
} as const

// ─────────────────────────────────────────────────────────────
// TYPOGRAPHY TOKENS
// ─────────────────────────────────────────────────────────────

export const GamificationTypography = {
  label: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  body: {
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  number: {
    fontSize: 32,
    fontWeight: '900' as const,
    letterSpacing: -1,
  },
  peak: {
    fontSize: 18,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
} as const
