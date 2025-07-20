import { StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export const useCareStyles = () => {
  const { theme } = useTheme();
  const { colors } = theme;

  return StyleSheet.create({
    plantInfo: {
      marginBottom: 24,
      alignItems: 'center',
    },
    plantName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.textPrimary,
    },
    plantType: {
      fontSize: 18,
      color: colors.textSecondary,
    },
    careTypeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    careTypeOption: {
      width: '30%',
      aspectRatio: 1,
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
      marginTop: 8,
    },
    severityButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    severityButtonSelected: {
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
    severityText: {
      fontSize: 14,
      color: '#FFFFFF',
    },
    severityTextSelected: {
      fontWeight: 'bold',
    },
    severityLow: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
    severityMedium: { backgroundColor: '#FFC107', borderColor: '#FFC107' },
    severityHigh: { backgroundColor: '#F44336', borderColor: '#F44336' },
  });
};
