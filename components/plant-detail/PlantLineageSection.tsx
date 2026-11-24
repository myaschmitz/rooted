import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GitBranch, ChevronRight, CornerUpLeft } from "lucide-react-native";
import dayjs from "dayjs";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { Spacing, Typography, BorderRadius } from "../../styles/theme";
import { getPropagationMethodLabel } from "../../constants/propagation";
import type { LineagePlant, PlantLineage } from "../../types/Plant";

interface PlantLineageSectionProps {
  lineage: PlantLineage | null | undefined;
  onPlantPress: (plantId: string) => void;
}

const displayName = (plant: LineagePlant) => plant.name || plant.type;

const propagationSummary = (plant: LineagePlant): string | null => {
  const method = getPropagationMethodLabel(plant.propagation_method);
  const date = plant.propagated_at
    ? dayjs(plant.propagated_at).format("MMM D, YYYY")
    : null;

  if (method && date) return `${method} · ${date}`;
  return method || date;
};

export default function PlantLineageSection({
  lineage,
  onPlantPress,
}: PlantLineageSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const parent = lineage?.parent ?? null;
  const children = lineage?.children ?? [];
  const hasLineage = !!parent || children.length > 0;
  const ownSummary = lineage ? propagationSummary(lineage.plant) : null;

  // Propagation is managed from the header's "⋯" menu; this section only
  // shows up once a plant actually has family to show.
  if (!hasLineage) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <GitBranch size={18} color={theme.colors.text} />
        <Text style={styles.sectionTitle}>Family</Text>
      </View>

      {parent ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Propagated from</Text>
          <TouchableOpacity
            style={styles.row}
            onPress={() => onPlantPress(parent.id)}
          >
            <CornerUpLeft size={16} color={theme.colors.textSecondary} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {displayName(parent)}
                {parent.archived ? " (archived)" : ""}
              </Text>
              {ownSummary ? (
                <Text style={styles.rowSubtitle} numberOfLines={1}>
                  {ownSummary}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : null}

      {children.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>
            {children.length === 1
              ? "1 propagation"
              : `${children.length} propagations`}
          </Text>
          {children.map((child) => {
            const summary = propagationSummary(child);
            return (
              <TouchableOpacity
                key={child.id}
                style={styles.row}
                onPress={() => onPlantPress(child.id)}
              >
                <GitBranch size={16} color={theme.colors.textSecondary} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {displayName(child)}
                    {child.archived ? " (archived)" : ""}
                  </Text>
                  {summary ? (
                    <Text style={styles.rowSubtitle} numberOfLines={1}>
                      {summary}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {lineage && lineage.size > 2 ? (
        <Text style={styles.familyText}>
          {`Part of a family of ${lineage.size} plants.`}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      margin: Spacing.sm + 2,
      marginTop: 0,
      padding: Spacing.base,
      borderRadius: BorderRadius.xl,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
      marginBottom: Spacing.xs,
    },
    sectionTitle: {
      fontSize: Typography.lg,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    group: {
      marginTop: Spacing.sm,
    },
    groupLabel: {
      color: theme.colors.textTertiary,
      fontSize: Typography.xs,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: Spacing.xs + 2,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm + 2,
      paddingVertical: Spacing.sm + 2,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.borderLight,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      color: theme.colors.text,
      fontSize: Typography.base,
    },
    rowSubtitle: {
      color: theme.colors.textSecondary,
      fontSize: Typography.xs,
      marginTop: 2,
    },
    familyText: {
      marginTop: Spacing.sm + 2,
      color: theme.colors.textTertiary,
      fontSize: Typography.xs,
    },
  });
