import { StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, Typography, Spacing, BorderRadius, Shadows, Layout } from './theme';

const webCursor = Platform.OS === 'web' ? { cursor: 'pointer' as any } : {};
const webTransition = Platform.OS === 'web' ? { transition: 'opacity 0.15s ease, background-color 0.15s ease' as any } : {};

export const useGlobalStyles = () => {
  const { theme } = useTheme();
  const colors = theme.colors;

  return StyleSheet.create({
    // ========== CONTAINERS ==========
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    containerPadded: {
      flex: 1,
      backgroundColor: colors.background,
      padding: Layout.containerPadding,
    },
    
    scrollView: {
      flex: 1,
    },
    
    form: {
      padding: Spacing.lg,
      paddingBottom: Spacing['3xl'], // Extra bottom padding for keyboard
    },
    
    content: {
      padding: Spacing.base,
    },
    
    // ========== CARDS & SURFACES ==========
    card: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      marginBottom: Spacing.base,
      ...Shadows.sm,
    },
    
    cardLarge: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      marginBottom: Spacing.lg,
      ...Shadows.base,
    },
    
    surface: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
    },
    
    // ========== BUTTONS ==========
    button: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Layout.buttonHeight,
      ...webCursor,
      ...webTransition,
    },
    
    buttonLarge: {
      backgroundColor: colors.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Layout.buttonHeight + 8,
      ...webCursor,
      ...webTransition,
    },
    
    buttonSecondary: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Layout.buttonHeight,
    },
    
    buttonOutline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: Layout.buttonHeight,
    },
    
    buttonDisabled: {
      backgroundColor: colors.gray400,
    },
    
    buttonSmall: {
      backgroundColor: colors.surfaceSecondary,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      borderRadius: BorderRadius['2xl'],
      marginRight: Spacing.sm,
    },
    
    // ========== BUTTON TEXT ==========
    buttonText: {
      color: colors.textInverse,
      fontSize: Typography.lg,
      fontWeight: Typography.weights.bold,
    },
    
    buttonTextSecondary: {
      color: colors.textPrimary,
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
    },
    
    buttonTextOutline: {
      color: colors.primary,
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
    },
    
    buttonTextSmall: {
      fontSize: Typography.sm,
      color: colors.textSecondary,
    },
    
    // ========== INPUTS ==========
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      fontSize: Typography.base,
      color: colors.text,
      minHeight: Layout.inputHeight,
    },
    
    inputFocused: {
      borderColor: colors.borderFocus,
    },
    
    inputTextArea: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      fontSize: Typography.base,
      color: colors.text,
      minHeight: 75,
      textAlignVertical: 'top',
    },
    
    // ========== FORM ELEMENTS ==========
    inputGroup: {
      marginBottom: Spacing.sm,
    },
    
    label: {
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
      marginBottom: Spacing.sm,
      color: colors.textPrimary,
    },
    
    sublabel: {
      fontSize: Typography.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.sm,
      fontStyle: 'italic',
    },
    
    // ========== TYPOGRAPHY ==========
    heading1: {
      fontSize: Typography['3xl'],
      fontWeight: Typography.weights.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.base,
    },
    
    heading2: {
      fontSize: Typography['2xl'],
      fontWeight: Typography.weights.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    
    heading3: {
      fontSize: Typography.xl,
      fontWeight: Typography.weights.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
    },
    
    bodyLarge: {
      fontSize: Typography.lg,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeights.normal * Typography.lg,
    },
    
    body: {
      fontSize: Typography.base,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeights.normal * Typography.base,
    },
    
    bodySmall: {
      fontSize: Typography.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeights.normal * Typography.sm,
    },
    
    caption: {
      fontSize: Typography.xs,
      color: colors.textTertiary,
    },
    
    // ========== LISTS ==========
    list: {
      flex: 1,
    },
    
    listContent: {
      paddingBottom: Spacing['4xl'] + Layout.fabSize, // Space for FAB
    },
    
    listItem: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.md,
      padding: Spacing.base,
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.sm,
      ...Shadows.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...webCursor,
    },
    
    listItemSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
      borderWidth: 1,
    },
    
    listSeparator: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginHorizontal: Spacing.base,
    },
    
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing['2xl'],
    },
    
    emptyStateText: {
      fontSize: Typography.lg,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: Spacing.base,
    },
    
    // ========== MODALS & OVERLAYS ==========
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: BorderRadius.lg,
      padding: Spacing.lg,
      margin: Spacing.lg,
      width: '90%',
      maxHeight: '80%',
      ...Shadows.xl,
    },
    
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.lg,
      paddingBottom: Spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    
    modalTitle: {
      fontSize: Typography.xl,
      fontWeight: Typography.weights.semibold,
      color: colors.textPrimary,
    },
    
    modalCloseButton: {
      padding: Spacing.sm,
    },
    
    // ========== FLOATING ACTION BUTTON ==========
    fab: {
      position: 'absolute',
      borderRadius: BorderRadius.full,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.base,
      bottom: Spacing.lg,
      right: Spacing.lg,
      ...Shadows.lg,
      ...webCursor,
      ...webTransition,
    },
    
    // ========== CHIPS & TAGS ==========
    chip: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: BorderRadius.full,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm,
      marginRight: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    
    chipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      borderWidth: 1,
    },
    
    chipText: {
      fontSize: Typography.sm,
      color: colors.text,
      fontWeight: Typography.weights.medium,
    },
    
    chipTextSelected: {
      color: colors.textInverse,
    },
    
    // ========== UTILITY CLASSES ==========
    flex1: {
      flex: 1,
    },
    
    flexRow: {
      flexDirection: 'row',
    },
    
    flexRowCenter: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    
    flexRowBetween: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    
    flexCenter: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    textCenter: {
      textAlign: 'center',
    },
    
    // ========== SPACING UTILITIES ==========
    mt0: { marginTop: 0 },
    mt1: { marginTop: Spacing.xs },
    mt2: { marginTop: Spacing.sm },
    mt3: { marginTop: Spacing.base },
    mt4: { marginTop: Spacing.lg },
    mt5: { marginTop: Spacing.xl },
    
    mb0: { marginBottom: 0 },
    mb1: { marginBottom: Spacing.xs },
    mb2: { marginBottom: Spacing.sm },
    mb3: { marginBottom: Spacing.base },
    mb4: { marginBottom: Spacing.lg },
    mb5: { marginBottom: Spacing.xl },
    
    p0: { padding: 0 },
    p1: { padding: Spacing.xs },
    p2: { padding: Spacing.sm },
    p3: { padding: Spacing.base },
    p4: { padding: Spacing.lg },
    p5: { padding: Spacing.xl },
  });
};

// Export individual style objects for specific use cases
// These are now functions that return themed styles
export const ButtonStyles = () => {
  const styles = useGlobalStyles();
  return {
    primary: styles.button,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    disabled: { ...styles.button, ...styles.buttonDisabled },
    small: styles.buttonSmall,
    large: styles.buttonLarge,
  };
};

export const InputStyles = () => {
  const styles = useGlobalStyles();
  return {
    default: styles.input,
    focused: { ...styles.input, ...styles.inputFocused },
    textArea: styles.inputTextArea,
  };
};

export const TextStyles = () => {
  const styles = useGlobalStyles();
  return {
    h1: styles.heading1,
    h2: styles.heading2,
    h3: styles.heading3,
    body: styles.body,
    bodyLarge: styles.bodyLarge,
    bodySmall: styles.bodySmall,
    caption: styles.caption,
  };
};

// Commonly used style combinations
export const CommonStyles = () => {
  const styles = useGlobalStyles();
  return {
    screenContainer: styles.container,
    formContainer: { ...styles.container, ...styles.form },
    cardContainer: styles.card,
    inputWithLabel: styles.inputGroup,
    saveButton: {
      ...styles.buttonLarge,
      marginTop: Spacing.lg,
      marginBottom: Spacing['2xl'],
    },
  };
};
