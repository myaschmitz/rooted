import { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Search, Check } from "lucide-react-native";
import DateTimeInput from "../components/DateTimeInput";
import PropagationMethodPicker from "../components/PropagationMethodPicker";
import WebContainer from "../components/WebContainer";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import { useModalParams, useModalDismiss } from "../hooks/useModalNav";
import { usePlant, usePlants, usePlantLineage, useSetPlantParent } from "../hooks/queries";
import { PropagationMethod } from "../constants/propagation";
import type { LineageNode } from "../types/Plant";
import { Spacing, Typography, BorderRadius } from "../styles/theme";
import { formStyles } from "../styles/FormStyles";

type LinkMode = "parent" | "child";

/** Collect a plant's subtree so it can't be offered as its own ancestor. */
const collectDescendants = (
  node: LineageNode | undefined,
  plantId: string,
  found = false,
  into: Set<string> = new Set(),
): Set<string> => {
  if (!node) return into;
  const isTarget = found || node.plant.id === plantId;
  if (isTarget && node.plant.id !== plantId) into.add(node.plant.id);
  node.children.forEach((child) =>
    collectDescendants(child, plantId, isTarget, into),
  );
  return into;
};

export default function LinkPropagationScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const dismiss = useModalDismiss();
  const { plantId, mode = "parent" } = useModalParams<{
    plantId: string;
    mode?: LinkMode;
  }>();

  const { data: plant, isLoading: plantLoading } = usePlant(plantId);
  const { data: plants = [], isLoading: plantsLoading } = usePlants();
  const { data: lineage } = usePlantLineage(plantId);
  const setParent = useSetPlantParent();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [method, setMethod] = useState<PropagationMethod>("cutting");
  const [propagatedAt, setPropagatedAt] = useState(new Date());
  const [saving, setSaving] = useState(false);

  const styles = createStyles(theme);
  const isParentMode = mode === "parent";
  const plantLabel = plant?.name || plant?.type || "this plant";

  // A plant can't be linked to itself, and the link can't close a loop:
  // choosing a parent rules out this plant's descendants, while choosing a
  // child rules out its ancestors.
  const excludedIds = useMemo(() => {
    const excluded = new Set<string>([plantId]);
    if (isParentMode) {
      collectDescendants(lineage?.root, plantId).forEach((id) =>
        excluded.add(id),
      );
      if (plant?.parent_plant_id) excluded.add(plant.parent_plant_id);
    } else {
      lineage?.ancestors.forEach((ancestor) => excluded.add(ancestor.id));
      lineage?.children.forEach((child) => excluded.add(child.id));
    }
    return excluded;
  }, [lineage, plantId, isParentMode, plant?.parent_plant_id]);

  const candidates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plants
      .filter((candidate) => !excludedIds.has(candidate.id))
      .filter((candidate) => {
        if (!query) return true;
        return (
          (candidate.name || "").toLowerCase().includes(query) ||
          candidate.type.toLowerCase().includes(query)
        );
      });
  }, [plants, excludedIds, search]);

  const handleSave = async () => {
    if (!selectedId) {
      showAlert("Select a plant", "Choose which plant to link.");
      return;
    }

    // In child mode the roles flip: the picked plant becomes the propagation.
    const childId = isParentMode ? plantId : selectedId;
    const parentId = isParentMode ? selectedId : plantId;

    setSaving(true);
    try {
      await setParent.mutateAsync({
        plantId: childId,
        parentPlantId: parentId,
        method,
        propagatedAt: propagatedAt.toISOString(),
      });
      dismiss();
    } catch (error) {
      console.error("Failed to link propagation:", error);
      showAlert(
        "Couldn't link these plants",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (plantLoading || plantsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Plant not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebContainer>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.form}>
          <Text style={styles.intro}>
            {isParentMode
              ? `Which plant was ${plantLabel} propagated from?`
              : `Which existing plant was propagated from ${plantLabel}?`}
          </Text>

          <View style={styles.searchRow}>
            <Search size={16} color={theme.colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search plants"
              placeholderTextColor={theme.colors.textTertiary}
              autoCorrect={false}
            />
          </View>

          {candidates.length === 0 ? (
            <Text style={styles.emptyText}>
              {search.trim()
                ? "No plants match that search."
                : "No eligible plants. Linking these would create a loop in the family tree."}
            </Text>
          ) : (
            <View style={styles.list}>
              {candidates.map((candidate) => {
                const selected = candidate.id === selectedId;
                return (
                  <TouchableOpacity
                    key={candidate.id}
                    style={[styles.row, selected && styles.rowSelected]}
                    onPress={() => setSelectedId(candidate.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {candidate.name || candidate.type}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {candidate.parent_plant_id
                          ? "Already a propagation"
                          : candidate.type}
                      </Text>
                    </View>
                    {selected && (
                      <Check size={18} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Method</Text>
            <PropagationMethodPicker value={method} onChange={setMethod} />
          </View>

          <View style={styles.inputGroup}>
            <DateTimeInput
              value={propagatedAt}
              mode="date"
              label="Date propagated"
              onChange={setPropagatedAt}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Link plants</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </WebContainer>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: formStyles(theme).screen,
    loadingContainer: { ...formStyles(theme).screen, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
    form: { ...formStyles(theme).form, gap: Spacing.base },
    intro: formStyles(theme).helper,
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: 14, height: 46, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: BorderRadius.xl, backgroundColor: theme.colors.surface },
    searchInput: { flex: 1, height: '100%', fontSize: Typography.base, color: theme.colors.text, ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}) },
    list: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', backgroundColor: theme.colors.surface },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm + 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    rowSelected: { backgroundColor: `${theme.colors.primary}14` },
    rowText: {
      flex: 1,
    },
    rowName: {
      fontSize: Typography.base,
      color: theme.colors.text,
      fontWeight: Typography.weights.medium,
    },
    rowMeta: {
      fontSize: Typography.sm,
      color: theme.colors.textTertiary,
    },
    inputGroup: { gap: 0 },
    label: formStyles(theme).label,
    saveButton: formStyles(theme).primaryButton,
    saveButtonDisabled: formStyles(theme).buttonDisabled,
    saveButtonText: formStyles(theme).primaryButtonText,
    emptyText: formStyles(theme).empty,
    linkText: formStyles(theme).link,
  });
