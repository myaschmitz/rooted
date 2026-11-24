import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, Minus, Pin } from 'lucide-react-native';
import { Plant } from '../types/Plant';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { BaseColors, Spacing, Typography } from '../styles/theme';

interface PlantSectionHeaderProps {
  title: string;
  plantCount: number;
  /** Show a pin icon before the title (the pinned section). */
  pinned?: boolean;
  // Batch mode props
  batchModeEnabled: boolean;
  plants?: Plant[];
  selectedPlantIds?: Set<string>;
  onSelectAll?: (plants: Plant[]) => void;
}

export default function PlantSectionHeader({
  title,
  plantCount,
  pinned = false,
  batchModeEnabled,
  plants = [],
  selectedPlantIds = new Set(),
  onSelectAll,
}: PlantSectionHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const label = (
    <View style={styles.labelRow}>
      {pinned ? (
        <Pin size={12} color={theme.colors.primary} fill={theme.colors.primary} />
      ) : null}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.count}>{plantCount}</Text>
    </View>
  );

  if (batchModeEnabled && plants.length > 0) {
    const allSelected = plants.every((plant) => selectedPlantIds.has(plant.id));
    const someSelected = !allSelected && plants.some((plant) => selectedPlantIds.has(plant.id));

    return (
      <TouchableOpacity
        style={styles.header}
        onPress={() => onSelectAll?.(plants)}
        accessibilityRole="button"
        accessibilityLabel={`${allSelected ? 'Deselect' : 'Select'} all in ${title}`}
      >
        <View
          style={[
            styles.checkbox,
            (allSelected || someSelected) && styles.checkboxSelected,
          ]}
        >
          {allSelected ? <Check size={12} color={BaseColors.white} strokeWidth={3} /> : null}
          {someSelected ? <Minus size={12} color={BaseColors.white} strokeWidth={3} /> : null}
        </View>
        {label}
        <Text style={styles.selectAll}>{allSelected ? 'Deselect all' : 'Select all'}</Text>
      </TouchableOpacity>
    );
  }

  return <View style={styles.header}>{label}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.base + 2,
      paddingBottom: Spacing.sm,
      backgroundColor: theme.colors.background,
    },
    labelRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    title: {
      flexShrink: 1,
      fontSize: Typography.sm - 1,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    count: {
      fontSize: Typography.sm - 1,
      fontWeight: Typography.weights.medium,
      color: theme.colors.textTertiary,
    },
    selectAll: {
      fontSize: Typography.sm - 1,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.primary,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  });
