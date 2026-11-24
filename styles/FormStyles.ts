import { StyleSheet, Platform } from 'react-native';
import type { Theme } from '../contexts/ThemeContext';
import { Spacing, Typography, BorderRadius } from './theme';

/**
 * Shared look for forms, modals and small dialogs.
 *
 * Screens keep their own stylesheets but point the common pieces (labels,
 * inputs, buttons, option chips, dialogs) at these so every modal feels the
 * same. Cached per theme object, so calling it inside createStyles is cheap.
 */
const cache = new WeakMap<object, ReturnType<typeof build>>();

export function formStyles(theme: Theme) {
  let styles = cache.get(theme);
  if (!styles) {
    styles = build(theme);
    cache.set(theme, styles);
  }
  return styles;
}

const webNoOutline = Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {};
const webPointer = Platform.OS === 'web' ? { cursor: 'pointer' as any } : {};

function build(theme: Theme) {
  const c = theme.colors;

  const input = {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderLight,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Typography.base,
    color: c.text,
    minHeight: 48,
    ...webNoOutline,
  };

  const buttonBase = {
    borderRadius: BorderRadius.xl + 2,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: Spacing.sm,
    ...webPointer,
  };

  return StyleSheet.create({
    /* Layout */
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    form: {
      padding: Spacing.lg,
      paddingBottom: Spacing['3xl'],
    },
    inputGroup: {
      marginBottom: Spacing.lg,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius['2xl'],
      padding: Spacing.base,
    },

    /* Text */
    label: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.semibold,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: Spacing.sm,
      marginLeft: 2,
    },
    sublabel: {
      fontSize: Typography.sm - 1,
      color: c.textTertiary,
      marginTop: -2,
      marginBottom: Spacing.sm,
      marginLeft: 2,
    },
    helper: {
      fontSize: Typography.sm - 1,
      lineHeight: (Typography.sm - 1) * 1.4,
      color: c.textSecondary,
    },
    empty: {
      fontSize: Typography.sm,
      color: c.textSecondary,
      textAlign: 'center',
    },
    link: {
      fontSize: Typography.sm + 1,
      fontWeight: Typography.weights.semibold,
      color: c.primary,
    },
    title: {
      fontSize: Typography.xl,
      fontWeight: Typography.weights.bold,
      color: c.text,
    },

    /* Inputs */
    input,
    textArea: {
      ...input,
      minHeight: 104,
      textAlignVertical: 'top',
    },

    /* Buttons */
    primaryButton: {
      ...buttonBase,
      backgroundColor: c.primary,
    },
    primaryButtonText: {
      color: c.textOnPrimary,
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
    },
    secondaryButton: {
      ...buttonBase,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    secondaryButtonText: {
      color: c.text,
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
    },
    dangerButton: {
      ...buttonBase,
      backgroundColor: `${c.error}14`,
    },
    dangerButtonText: {
      color: c.error,
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
    },
    buttonDisabled: {
      opacity: 0.45,
    },
    smallButton: {
      paddingHorizontal: Spacing.base - 2,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.full,
      backgroundColor: `${c.primary}1A`,
      alignItems: 'center',
      justifyContent: 'center',
      ...webPointer,
    },
    smallButtonText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
      color: c.primary,
    },

    /* Selectable pills (strengths, methods, tags) */
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: BorderRadius.full,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      ...webPointer,
    },
    chipSelected: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}1A`,
    },
    chipText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.medium,
      color: c.textSecondary,
    },
    chipTextSelected: {
      color: c.primary,
      fontWeight: Typography.weights.semibold,
    },

    /* Larger selectable tiles (event type grid) */
    tile: {
      borderRadius: BorderRadius.xl + 2,
      backgroundColor: c.surface,
      borderWidth: 1.5,
      borderColor: c.borderLight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.sm + 4,
      paddingHorizontal: Spacing.xs + 2,
      ...webPointer,
    },
    tileSelected: {
      borderColor: c.primary,
      backgroundColor: `${c.primary}14`,
    },
    tileText: {
      fontSize: Typography.sm - 1,
      fontWeight: Typography.weights.medium,
      color: c.textSecondary,
      marginTop: Spacing.xs + 2,
      textAlign: 'center',
    },
    tileTextSelected: {
      color: c.primary,
      fontWeight: Typography.weights.semibold,
    },

    /* Segmented control (Care / Events, New / Existing) */
    segmented: {
      flexDirection: 'row',
      backgroundColor: c.surfaceSecondary,
      borderRadius: BorderRadius.lg,
      padding: 3,
      marginBottom: Spacing.sm + 4,
    },
    segment: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      ...webPointer,
    },
    segmentActive: {
      backgroundColor: c.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    segmentText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
      color: c.textTertiary,
    },
    segmentTextActive: {
      color: c.text,
    },

    /* Small centered dialogs */
    dialogOverlay: {
      flex: 1,
      backgroundColor: c.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xl,
    },
    dialogCard: {
      backgroundColor: c.surface,
      borderRadius: BorderRadius['3xl'],
      padding: Spacing.xl,
      width: '100%',
      maxWidth: 360,
    },
    dialogTitle: {
      fontSize: Typography.lg,
      fontWeight: Typography.weights.bold,
      color: c.text,
      textAlign: 'center',
      marginBottom: Spacing.xs + 2,
    },
    dialogMessage: {
      fontSize: Typography.sm + 1,
      lineHeight: (Typography.sm + 1) * 1.4,
      color: c.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.lg,
    },
    dialogButtons: {
      gap: Spacing.sm + 2,
    },
    dialogButtonsRow: {
      flexDirection: 'row',
      gap: Spacing.sm + 2,
    },

    /* Full-height picker sheets with a Cancel / Title / Done header */
    sheetHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm + 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.surface,
    },
    sheetTitle: {
      fontSize: Typography.base + 1,
      fontWeight: Typography.weights.semibold,
      color: c.text,
    },
    sheetAction: {
      fontSize: Typography.base,
      color: c.primary,
    },
    sheetActionStrong: {
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
      color: c.primary,
    },
    sheetActionDisabled: {
      color: c.textTertiary,
    },
  });
}
