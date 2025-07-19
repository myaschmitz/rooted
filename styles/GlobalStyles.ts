import { StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Layout } from './theme';

export const GlobalStyles = StyleSheet.create({
  // ========== CONTAINERS ==========
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  containerPadded: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
    ...Shadows.sm,
  },
  
  cardLarge: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.base,
  },
  
  surface: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  
  // ========== BUTTONS ==========
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.buttonHeight,
  },
  
  buttonLarge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.buttonHeight + 8,
  },
  
  buttonSecondary: {
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.buttonHeight,
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: Layout.buttonHeight,
  },
  
  buttonDisabled: {
    backgroundColor: Colors.gray400,
  },
  
  buttonSmall: {
    backgroundColor: Colors.gray200,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius['2xl'],
    marginRight: Spacing.sm,
  },
  
  // ========== BUTTON TEXT ==========
  buttonText: {
    color: Colors.textInverse,
    fontSize: Typography.lg,
    fontWeight: Typography.weights.bold,
  },
  
  buttonTextSecondary: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
  },
  
  buttonTextOutline: {
    color: Colors.primary,
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
  },
  
  buttonTextSmall: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  
  // ========== INPUTS ==========
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.base,
    minHeight: Layout.inputHeight,
  },
  
  inputFocused: {
    borderColor: Colors.borderFocus,
  },
  
  inputTextArea: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.base,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  
  // ========== FORM ELEMENTS ==========
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  
  label: {
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  
  sublabel: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  
  // ========== TYPOGRAPHY ==========
  heading1: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  
  heading2: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  
  heading3: {
    fontSize: Typography.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  
  bodyLarge: {
    fontSize: Typography.lg,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeights.normal * Typography.lg,
  },
  
  body: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeights.normal * Typography.base,
  },
  
  bodySmall: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeights.normal * Typography.sm,
  },
  
  caption: {
    fontSize: Typography.xs,
    color: Colors.textTertiary,
  },
  
  // ========== LISTS ==========
  list: {
    flex: 1,
  },
  
  listContent: {
    paddingBottom: Spacing['4xl'] + Layout.fabSize, // Space for FAB
  },
  
  listItem: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  
  listItemSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  
  listSeparator: {
    height: 1,
    backgroundColor: Colors.borderLight,
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
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.base,
  },
  
  // ========== MODALS & OVERLAYS ==========
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContent: {
    backgroundColor: Colors.surface,
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
    borderBottomColor: Colors.borderLight,
  },
  
  modalTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  
  modalCloseButton: {
    padding: Spacing.sm,
  },
  
  // ========== FLOATING ACTION BUTTON ==========
  fab: {
    position: 'absolute',
    width: Layout.fabSize,
    height: Layout.fabSize,
    borderRadius: Layout.fabSize / 2,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    bottom: Spacing.lg,
    right: Spacing.lg,
    ...Shadows.lg,
  },
  
  // ========== CHIPS & TAGS ==========
  chip: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  
  chipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  
  chipText: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.weights.medium,
  },
  
  chipTextSelected: {
    color: Colors.primary,
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

// Export individual style objects for specific use cases
export const ButtonStyles = StyleSheet.create({
  primary: GlobalStyles.button,
  secondary: GlobalStyles.buttonSecondary,
  outline: GlobalStyles.buttonOutline,
  disabled: {
    ...GlobalStyles.button,
    ...GlobalStyles.buttonDisabled,
  },
  small: GlobalStyles.buttonSmall,
  large: GlobalStyles.buttonLarge,
});

export const InputStyles = StyleSheet.create({
  default: GlobalStyles.input,
  focused: {
    ...GlobalStyles.input,
    ...GlobalStyles.inputFocused,
  },
  textArea: GlobalStyles.inputTextArea,
});

export const TextStyles = StyleSheet.create({
  h1: GlobalStyles.heading1,
  h2: GlobalStyles.heading2,
  h3: GlobalStyles.heading3,
  body: GlobalStyles.body,
  bodyLarge: GlobalStyles.bodyLarge,
  bodySmall: GlobalStyles.bodySmall,
  caption: GlobalStyles.caption,
});

// Commonly used style combinations
export const CommonStyles = StyleSheet.create({
  screenContainer: GlobalStyles.container,
  formContainer: {
    ...GlobalStyles.container,
    ...GlobalStyles.form,
  },
  cardContainer: GlobalStyles.card,
  inputWithLabel: GlobalStyles.inputGroup,
  saveButton: {
    ...GlobalStyles.buttonLarge,
    marginTop: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
});
