import { StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from './theme';

// Styles specific to care logging and plant care components
export const CareStyles = StyleSheet.create({
  // ========== CARE TYPE SELECTION ==========
  careTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  
  careTypeOption: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
  },
  
  careTypeOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  
  careTypeIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  
  careTypeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textSecondary,
  },
  
  careTypeTextSelected: {
    color: Colors.primary,
  },
  
  // ========== DATE TIME PICKER ==========
  dateTimeButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  
  dateTimeText: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
  },
  
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.sm,
    ...Shadows.md,
  },
  
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  
  pickerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  
  pickerButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  
  pickerButtonDone: {
    backgroundColor: Colors.primary,
  },
  
  pickerButtonText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  
  pickerButtonTextDone: {
    color: Colors.textInverse,
    fontWeight: Typography.weights.semibold,
  },
  
  // ========== SEVERITY SELECTION ==========
  severityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  
  severityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  
  severityButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  
  severityLow: {
    borderColor: Colors.severityLow,
    backgroundColor: '#f1f8e9',
  },
  
  severityMedium: {
    borderColor: Colors.severityMedium,
    backgroundColor: '#fff3e0',
  },
  
  severityHigh: {
    borderColor: Colors.severityHigh,
    backgroundColor: '#ffebee',
  },
  
  severityText: {
    fontSize: Typography.base,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
  },
  
  severityTextSelected: {
    color: Colors.textInverse,
  },
  
  // ========== PLANT INFO DISPLAY ==========
  plantInfo: {
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  
  plantName: {
    fontSize: Typography.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  
  plantType: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  
  // ========== HEALTH STATUS ==========
  healthStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  
  healthStatusOption: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    minWidth: 80,
  },
  
  healthStatusOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  
  healthStatusText: {
    fontSize: Typography.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  
  healthStatusTextSelected: {
    color: Colors.primary,
  },
  
  // ========== QUICK CARE SPECIFIC ==========
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  
  locationTitle: {
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  
  selectAllButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  
  selectAllText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: Typography.weights.medium,
  },
  
  plantCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.sm,
  },
  
  plantCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    borderWidth: 1,
  },
  
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: Spacing.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  
  checkboxText: {
    color: Colors.textInverse,
    fontSize: 16,
    fontWeight: Typography.weights.bold,
  },
  
  plantDetails: {
    flex: 1,
  },
  
  plantCardName: {
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  
  plantCardType: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  
  // ========== BATCH CARE CONFIRMATION ==========
  confirmationContent: {
    padding: Spacing.lg,
  },
  
  confirmationTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.base,
    textAlign: 'center',
  },
  
  confirmationText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  
  selectedPlantsList: {
    maxHeight: 200,
    marginBottom: Spacing.lg,
  },
  
  selectedPlantItem: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  
  confirmationButtons: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.gray300,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
  },
  
  confirmButtonText: {
    color: Colors.textInverse,
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
  },
  
  cancelButtonText: {
    color: Colors.textPrimary,
    fontSize: Typography.base,
    fontWeight: Typography.weights.semibold,
  },
});
