import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import {
  Scissors,
  Split,
  Sprout,
  Leaf,
  TreeDeciduous,
  Layers,
  MoreHorizontal,
  LucideIcon,
} from "lucide-react-native";
import { useTheme, Theme } from "../contexts/ThemeContext";
import {
  PROPAGATION_METHODS,
  PROPAGATION_METHOD_LABELS,
  PropagationMethod,
} from "../constants/propagation";
import { Spacing, Typography, BorderRadius } from "../styles/theme";

// Kept out of constants/propagation.ts, which the service imports and so must
// stay free of UI dependencies.
export const METHOD_ICONS: Record<PropagationMethod, LucideIcon> = {
  cutting: Scissors,
  division: Split,
  offset: Sprout,
  leaf: Leaf,
  seed: TreeDeciduous,
  air_layer: Layers,
  other: MoreHorizontal,
};

interface PropagationMethodPickerProps {
  value: PropagationMethod;
  onChange: (method: PropagationMethod) => void;
}

export default function PropagationMethodPicker({
  value,
  onChange,
}: PropagationMethodPickerProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.methodGrid}>
      {PROPAGATION_METHODS.map((option) => {
        const Icon = METHOD_ICONS[option];
        const selected = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.methodChip, selected && styles.methodChipSelected]}
            onPress={() => onChange(option)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <Icon
              size={16}
              color={
                selected ? theme.colors.textOnPrimary : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.methodChipText,
                selected && styles.methodChipTextSelected,
              ]}
            >
              {PROPAGATION_METHOD_LABELS[option]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    methodGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    methodChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs + 2,
      paddingHorizontal: Spacing.base - 4,
      paddingVertical: Spacing.sm + 2,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    methodChipSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    methodChipText: {
      fontSize: Typography.sm,
      color: theme.colors.textSecondary,
    },
    methodChipTextSelected: {
      color: theme.colors.textOnPrimary,
      fontWeight: Typography.weights.medium,
    },
  });
