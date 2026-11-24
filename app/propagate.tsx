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
import DateTimeInput from "../components/DateTimeInput";
import PropagationMethodPicker from "../components/PropagationMethodPicker";
import LocationDropdown from "../components/LocationDropdown";
import KeyboardAwareScrollView from "../components/KeyboardAwareScrollView";
import WebContainer from "../components/WebContainer";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import { useModalParams, useModalReplace } from "../hooks/useModalNav";
import { usePlant, usePropagatePlant, useAllTags, usePlantTags } from "../hooks/queries";
import { PropagationMethod } from "../constants/propagation";
import { Spacing, Typography, BorderRadius } from "../styles/theme";
import { formStyles } from "../styles/FormStyles";
import TagChip from "../components/TagChip";

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
                      <TagChip
                        key={tag.id}
                        name={tag.name}
                        color={tag.color}
                        selected={selected}
                        onPress={() => toggleTag(tag.id)}
                      />
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
    container: formStyles(theme).screen,
    loadingContainer: { ...formStyles(theme).screen, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
    form: formStyles(theme).form,
    intro: { ...formStyles(theme).helper, marginBottom: Spacing.lg },
    inputGroup: formStyles(theme).inputGroup,
    label: formStyles(theme).label,
    input: formStyles(theme).input,
    notesInput: { minHeight: 104, textAlignVertical: 'top' },
    tagHint: formStyles(theme).sublabel,
    tagRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.sm,
    },
    saveButton: { ...formStyles(theme).primaryButton, marginTop: 8 },
    saveButtonDisabled: formStyles(theme).buttonDisabled,
    saveButtonText: formStyles(theme).primaryButtonText,
    emptyText: formStyles(theme).empty,
    linkText: formStyles(theme).link,
  });
