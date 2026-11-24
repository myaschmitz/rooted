import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const useCareStyles = () => {
  const { theme } = useTheme();
  const { colors } = theme;

  return StyleSheet.create({
    plantInfo: {
      marginBottom: 20,
      alignItems: 'center',
      gap: 2,
    },
    plantName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    plantType: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    careTypeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    careTypeOption: {
      width: '30%',
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      padding: 8,
    },
    careTypeOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    careTypeIcon: {
      fontSize: 32,
    },
    careTypeText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
      marginTop: 8,
      textAlign: 'center',
    },
    careTypeTextSelected: {
      color: colors.primary,
      fontWeight: 'bold',
    },
    dateTimeButton: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 8,
      marginBottom: 12,
    },
    dateTimeText: {
      fontSize: 16,
      color: colors.text,
    },
    pickerContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
      marginTop: 12,
    },
    pickerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: colors.surfaceSecondary,
    },
    pickerButton: {
      padding: 8,
    },
    pickerButtonDone: {},
    pickerButtonText: {
      fontSize: 16,
      color: colors.primary,
    },
    pickerButtonTextDone: {
      fontWeight: 'bold',
    },
    pickerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    severityContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    severityButton: {
      width: 30,
      height: 30,
      borderRadius: 15,
      opacity: 0.55,
      justifyContent: 'center',
      alignItems: 'center',
      // borderWidth: 1,
      // borderColor: colors.border,
    },
    severityLow: { backgroundColor: '#4CAF50' },
    severityMedium: { backgroundColor: '#ffcb2eff' },
    severityHigh: { backgroundColor: '#F44336' },
    severityButtonSelected: {
      opacity: 1,
      transform: [{ scale: 1.15 }],
      shadowColor: colors.textPrimary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 6,
    },
    severityLowSelected: { backgroundColor: '#2E7D32' },
    severityMediumSelected: { backgroundColor: '#e6ad00ff' },
    severityHighSelected: { backgroundColor: '#C62828' },
    severityText: {
      fontSize: 14,
      color: '#FFFFFF',
    },
    severityTextSelected: {
      fontWeight: 'bold',
      fontSize: 16,
    }
  });
};
