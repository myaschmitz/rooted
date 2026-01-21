import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { Plant } from '../types/Plant';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useGlobalStyles } from '../styles';

interface PlantSectionHeaderProps {
  title: string;
  plantCount: number;
  // Batch mode props
  batchModeEnabled: boolean;
  plants?: Plant[];
  selectedPlantIds?: Set<string>;
  onSelectAll?: (plants: Plant[]) => void;
}

export default function PlantSectionHeader({
  title,
  plantCount,
  batchModeEnabled,
  plants = [],
  selectedPlantIds = new Set(),
  onSelectAll,
}: PlantSectionHeaderProps) {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);

  if (batchModeEnabled && plants.length > 0) {
    const allSelected = plants.every((plant) => selectedPlantIds.has(plant.id));
    const someSelected = plants.some((plant) => selectedPlantIds.has(plant.id));

    return (
      <View style={styles.locationHeader}>
        <TouchableOpacity
          style={globalStyles.flexRowBetween}
          onPress={() => onSelectAll?.(plants)}
        >
          <View style={globalStyles.flexRowCenter}>
            <View
              style={[
                styles.checkbox,
                allSelected && styles.checkboxSelected,
                someSelected && !allSelected && styles.checkboxPartial,
              ]}
            >
              {allSelected && <Check size={16} color={theme.colors.textOnPrimary} />}
              {someSelected && !allSelected && <Text style={styles.checkboxText}>−</Text>}
            </View>
            <Text style={styles.locationTitle}>{title}</Text>
          </View>
          <Text style={styles.selectAllText}>
            {plantCount} plant{plantCount !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>
        {plantCount} plant{plantCount !== 1 ? 's' : ''}
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      paddingTop: 16,
      backgroundColor: theme.colors.background,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    sectionCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    locationHeader: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      marginBottom: 8,
      backgroundColor: theme.colors.background,
    },
    locationTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginLeft: 12,
    },
    selectAllText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxPartial: {
      backgroundColor: theme.colors.border,
    },
    checkboxText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });
