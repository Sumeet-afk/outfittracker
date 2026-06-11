/**
 * Design System — Wardrobe & Laundry Tracker
 *
 * Ultra-minimalist aesthetic: neutral backgrounds so clothing images
 * provide the color. Premium feel with subtle gradients and micro-animations.
 */

export const Colors = {
  // Primary palette — soft, warm neutrals
  primary: '#1A1A2E',         // Deep navy-charcoal
  primaryLight: '#16213E',
  primaryAccent: '#0F3460',
  accent: '#E94560',          // Warm coral accent
  accentSoft: '#FF6B6B',

  // Backgrounds
  background: '#FAFBFC',      // Near-white with slight warmth
  surface: '#FFFFFF',
  surfaceElevated: '#F8F9FA',
  surfaceHover: '#F1F3F5',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6C757D',
  textTertiary: '#ADB5BD',
  textInverse: '#FFFFFF',

  // Status colors
  clean: '#51CF66',           // Fresh green
  cleanBg: '#EBFBEE',
  dirty: '#FF922B',           // Warm amber
  dirtyBg: '#FFF4E6',
  warning: '#FCC419',         // Yellow
  warningBg: '#FFF9DB',

  // Borders & dividers
  border: '#E9ECEF',
  borderLight: '#F1F3F5',
  divider: '#DEE2E6',

  // Shadows
  shadowLight: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.12)',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#1A1A2E', '#16213E'] as const,
  gradientAccent: ['#E94560', '#FF6B6B'] as const,
  gradientClean: ['#51CF66', '#69DB7C'] as const,
  gradientDirty: ['#FF922B', '#FFA94D'] as const,

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  // Category colors (for visual coding)
  categoryColors: [
    '#FF6B6B', '#845EF7', '#339AF0', '#20C997',
    '#FCC419', '#FF922B', '#E64980', '#5C7CFA',
  ] as const,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  massive: 64,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  xxl: 28,
  full: 9999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Typography = {
  displayLarge: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    letterSpacing: -1,
    lineHeight: 48,
  },
  displayMedium: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  headingLarge: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  headingMedium: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    lineHeight: 28,
  },
  headingSmall: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.regular,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.regular,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: 18,
  },
  caption: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  button: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: 18,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

export const Animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  springBouncy: {
    damping: 12,
    stiffness: 180,
    mass: 0.8,
  },
} as const;

export const Layout = {
  screenPadding: Spacing.xl,
  cardPadding: Spacing.lg,
  gridGap: Spacing.md,
  gridColumns: 2,
  tabBarHeight: 80,
  headerHeight: 56,
  itemCardHeight: 200,
  itemCardWidth: '48%' as const,
} as const;
