import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import dayjs from "dayjs";
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
import DateTimeInput from "../components/DateTimeInput";
import LocationDropdown from "../components/LocationDropdown";
import KeyboardAwareScrollView from "../components/KeyboardAwareScrollView";
import WebContainer from "../components/WebContainer";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import { useModalParams, useModalReplace } from "../hooks/useModalNav";
import { usePlant, usePropagatePlant, useAllTags, usePlantTags } from "../hooks/queries";
import {
  PROPAGATION_METHODS,
  PROPAGATION_METHOD_LABELS,
  PropagationMethod,
} from "../constants/propagation";
import { Spacing, Typography, BorderRadius } from "../styles/theme";

const METHOD_ICONS: Record<PropagationMethod, LucideIcon> = {
  cutting: Scissors,
  division: Split,
  offset: Sprout,
  leaf: Leaf,
  seed: TreeDeciduous,
  air_layer: Layers,
  other: MoreHorizontal,
};

export default function PropagateScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const modalReplace = useModalReplace();
  const { parentId, date } = useModalParams<{
    parentId: string;
    date?: string;
  }>();

  const { data: parent, isLoading: parentLoading } = usePlant(parentId);
  const propagateMutation = usePropagatePlant();

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PropagationMethod>("cutting");
  const [propagatedAt, setPropagatedAt] = useState(() => {
    const seeded = date ? dayjs(date) : null;
    return seeded?.isValid() ? seeded.toDate() : new Date();
  });
  const [saving, setSaving] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagsSeeded, setTagsSeeded] = useState(false);

  const { data: allTags = [] } = useAllTags();
  const { data: parentTags = [] } = usePlantTags(parentId ?? "");

  // A cutting inherits its parent's species and spot until the user says otherwise.
  useEffect(() => {
    if (!parent) return;
    setType((current) => current || parent.type);
    setLocation((current) => current || parent.location || "");
  }, [parent]);

  // Preselect the parent's tags once, so later deselections aren't undone.
  useEffect(() => {
    if (tagsSeeded || parentTags.length === 0) return;
    setSelectedTagIds(parentTags.map((tag) => tag.id));
    setTagsSeeded(true);
  }, [parentTags, tagsSeeded]);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  const styles = createStyles(theme);
  const parentLabel = parent?.name || parent?.type || "this plant";

  const handleSave = async () => {
    if (!parentId) {
      showAlert("Error", "No parent plant selected");
      return;
    }
    if (!type.trim()) {
      showAlert("Error", "Please enter plant type");
      return;
    }

    setSaving(true);
    try {
      const child = await propagateMutation.mutateAsync({
        parentPlantId: parentId,
        name: name.trim() || undefined,
        type: type.trim(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
        method,
        propagatedAt: propagatedAt.toISOString(),
        tagIds: selectedTagIds,
      });

      modalReplace(`/plant/${child.id}`);
    } catch (error) {
      console.error("Failed to propagate plant:", error);
      showAlert("Error", "Failed to create the propagation");
    } finally {
      setSaving(false);
    }
  };

  if (parentLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!parent) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyText}>Parent plant not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.linkText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <WebContainer>
      <View style={styles.container}>
        <KeyboardAwareScrollView
          extraScrollHeight={100}
          keyboardVerticalOffset={100}
        >
          <View style={styles.form}>
            <Text style={styles.intro}>
              {`New plant propagated from ${parentLabel}.`}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Method</Text>
              <View style={styles.methodGrid}>
                {PROPAGATION_METHODS.map((option) => {
                  const Icon = METHOD_ICONS[option];
                  const selected = option === method;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.methodChip,
                        selected && styles.methodChipSelected,
                      ]}
                      onPress={() => setMethod(option)}
                    >
                      <Icon
                        size={16}
                        color={
                          selected
                            ? theme.colors.textOnPrimary
                            : theme.colors.textSecondary
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
            </View>

            <View style={styles.inputGroup}>
              <DateTimeInput
                value={propagatedAt}
                mode="date"
                label="Date propagated"
                onChange={setPropagatedAt}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plant Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={`e.g., ${parentLabel} cutting (optional)`}
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plant Type *</Text>
              <TextInput
                style={styles.input}
                value={type}
                onChangeText={setType}
                placeholder="e.g., Monstera Deliciosa"
                placeholderTextColor={theme.colors.textTertiary}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Location</Text>
              <LocationDropdown
                value={location}
                onValueChange={setLocation}
                placeholder="Select or enter location"
              />
            </View>

            {allTags.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tags</Text>
                <Text style={styles.tagHint}>
                  Inherited from {parentLabel} — tap to change.
                </Text>
                <View style={styles.tagRow}>
                  {allTags.map((tag) => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[
                          styles.tagChip,
                          {
                            borderColor: tag.color,
                            backgroundColor: selected
                              ? tag.color
                              : "transparent",
                          },
                        ]}
                        onPress={() => toggleTag(tag.id)}
                      >
                        <Text
                          style={[
                            styles.tagChipText,
                            {
                              color: selected
                                ? theme.colors.textOnPrimary
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {tag.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Rooting medium, node count, anything worth remembering..."
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Creating..." : "Create Propagation"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </WebContainer>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: Spacing.sm,
      backgroundColor: theme.colors.background,
    },
    form: {
      padding: Spacing.lg,
    },
    intro: {
      color: theme.colors.textSecondary,
      fontSize: Typography.sm,
      marginBottom: Spacing.lg,
    },
    inputGroup: {
      marginBottom: Spacing.lg,
    },
    label: {
      fontSize: Typography.base,
      fontWeight: "600",
      marginBottom: Spacing.sm,
      color: theme.colors.text,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: BorderRadius.md,
      padding: Spacing.base - 1,
      fontSize: Typography.base,
      color: theme.colors.text,
    },
    notesInput: {
      minHeight: 100,
    },
    tagHint: {
      fontSize: Typography.sm,
      color: theme.colors.textSecondary,
      marginBottom: Spacing.sm,
    },
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    tagChip: {
      paddingVertical: Spacing.xs,
      paddingHorizontal: Spacing.base,
      borderRadius: BorderRadius.full,
      borderWidth: 1,
    },
    tagChipText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.medium,
    },
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
      color: theme.colors.textSecondary,
      fontSize: Typography.sm,
    },
    methodChipTextSelected: {
      color: theme.colors.textOnPrimary,
      fontWeight: "600",
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      padding: Spacing.base - 1,
      borderRadius: BorderRadius.md,
      alignItems: "center",
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: Typography.base,
      fontWeight: "bold",
    },
    emptyText: {
      color: theme.colors.text,
      fontSize: Typography.base,
    },
    linkText: {
      color: theme.colors.primary,
      fontSize: Typography.sm,
    },
  });
