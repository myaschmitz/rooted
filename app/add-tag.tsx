import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { TagService } from '../services/TagService';
import { Tag } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import { formStyles } from '../styles/FormStyles';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useAddTagToPlant, useCreateTagAndAddToPlant } from '../hooks/queries';
import { Skeleton } from '../components/Skeleton';
import TagChip from '../components/TagChip';
import TagForm from '../components/TagForm';
import WebContainer from '../components/WebContainer';
import { useModalDismiss, useModalParams } from '../hooks/useModalNav';
import { useAlert } from '../contexts/AlertContext';

export default function AddTagScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { plantId } = useModalParams<{ plantId: string }>();
  const dismiss = useModalDismiss();
  
  // React Query mutations
  const addTagMutation = useAddTagToPlant();
  const createTagMutation = useCreateTagAndAddToPlant();
  
  // UI state
  const [mode, setMode] = useState<'select' | 'create'>('select'); // Start with select mode
  const [loading, setLoading] = useState(true);
  const saving = addTagMutation.isPending || createTagMutation.isPending;
  
  // Available tags state
  const [availableTags, setAvailableTags] = useState<(Tag & { isAlreadyAdded: boolean })[]>([]);
  const [selectedExistingTags, setSelectedExistingTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  
  // New tag creation state
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TagService.getDefaultTagColors()[0]);
  
  const styles = createStyles(theme);

  // Load available tags when component mounts
  useEffect(() => {
    loadAvailableTags();
  }, [plantId]);

  const loadAvailableTags = async () => {
    if (!plantId) return;
    
    setLoading(true);
    try {
      const tags = await TagService.getAllTagsWithPlantStatus(plantId);
      setAvailableTags(tags);
            
      // If no tags at all, or all tags are already added, switch to create mode
      const availableToAdd = tags.filter(tag => !tag.isAlreadyAdded);
      if (tags.length === 0 || availableToAdd.length === 0) {
        setMode('create');
      }
    } catch (error) {
      console.error('Failed to load available tags:', error);
      showAlert('Error', 'Failed to load available tags');
      setMode('create'); // Fallback to create mode
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plantId) {
      showAlert('Error', 'Plant ID is required');
      return;
    }

    try {
      if (mode === 'select') {
        // Adding existing tags
        if (selectedExistingTags.length === 0) {
          showAlert('Error', 'Please select at least one tag');
          return;
        }
        // Use the new multiple tags method from TagService
        const tagIds = selectedExistingTags.map(tag => tag.id);
        await TagService.addMultipleTagsToPlant(plantId, tagIds);
      } else {
        // Creating a new tag
        const validation = TagService.validateTagName(tagName);
        if (!validation.isValid) {
          showAlert('Error', validation.error);
          return;
        }

        if (!TagService.validateTagColor(selectedColor)) {
          showAlert('Error', 'Please select a valid color');
          return;
        }

        const result = await createTagMutation.mutateAsync({ plantId, name: tagName.trim(), color: selectedColor });
        
        if (!result.isNew) {
          // Inform user that an existing tag was used
          showAlert('Info', 'An existing tag with this name and color was added to your plant.');
        }
      }
      
      dismiss();
    } catch (error) {
      console.error('Failed to add tag:', error);
      showAlert('Error', error instanceof Error ? error.message : 'Failed to add tag');
    }
  };

  const handleCancel = () => {
    dismiss();
  };

  const addable = availableTags.filter((t) => !t.isAlreadyAdded);
  const query = search.trim().toLowerCase();
  const visibleTags = query
    ? availableTags.filter((t) => t.name.toLowerCase().includes(query))
    : availableTags;

  const toggleTag = (tag: Tag) => {
    setSelectedExistingTags((prev) =>
      prev.some((t) => t.id === tag.id) ? prev.filter((t) => t.id !== tag.id) : [...prev, tag],
    );
  };

  const saveDisabled =
    saving ||
    (mode === 'select' && selectedExistingTags.length === 0) ||
    (mode === 'create' && !tagName.trim());

  const saveLabel = saving
    ? mode === 'select'
      ? 'Adding…'
      : 'Creating…'
    : mode === 'select'
      ? selectedExistingTags.length > 1
        ? `Add ${selectedExistingTags.length} Tags`
        : 'Add Tag'
      : 'Create & Add';

  if (loading) {
    return (
      <View style={[styles.container, styles.content]}>
        <Skeleton height={38} borderRadius={10} style={{ marginBottom: 20 }} />
        <View style={styles.tagsGrid}>
          {[90, 70, 110, 80, 60].map((w, i) => (
            <Skeleton key={i} width={w} height={30} borderRadius={15} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <WebContainer>
      <KeyboardAwareScrollView style={styles.container}>
        <View style={styles.content}>
          {availableTags.length > 0 && (
            <View style={styles.modeToggle}>
              {(
                [
                  ['select', 'Existing'],
                  ['create', 'New'],
                ] as const
              ).map(([value, text]) => {
                const active = mode === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.modeButton, active && styles.modeButtonActive]}
                    onPress={() => setMode(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
                      {text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {mode === 'select' ? (
            <View style={styles.section}>
              {availableTags.length > 8 && (
                <View style={styles.searchRow}>
                  <Search size={16} color={theme.colors.textTertiary} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search tags"
                    placeholderTextColor={theme.colors.textTertiary}
                    autoCorrect={false}
                  />
                </View>
              )}

              <Text style={styles.helper}>
                {addable.length === 0
                  ? 'Every tag is already on this plant. Create a new one instead.'
                  : 'Tap tags to add them. Faded tags are already on this plant.'}
              </Text>

              {visibleTags.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No tags match “{search.trim()}”.</Text>
                </View>
              ) : (
                <View style={styles.tagsGrid}>
                  {visibleTags.map((tag) => (
                    <TagChip
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      selected={selectedExistingTags.some((t) => t.id === tag.id)}
                      dimmed={tag.isAlreadyAdded}
                      onPress={() => toggleTag(tag)}
                      accessibilityLabel={
                        tag.isAlreadyAdded ? `${tag.name}, already added` : tag.name
                      }
                    />
                  ))}
                </View>
              )}
            </View>
          ) : (
            <TagForm
              name={tagName}
              onNameChange={setTagName}
              color={selectedColor}
              onColorChange={setSelectedColor}
            />
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, saveDisabled && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saveDisabled}
            >
              <Text style={styles.saveButtonText}>{saveLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </WebContainer>
  );
}

const createStyles = (theme: any) => {
  const f = formStyles(theme);
  return StyleSheet.create({
    container: f.screen,
    content: f.form,
    modeToggle: { ...f.segmented, marginBottom: 20 },
    modeButton: f.segment,
    modeButtonActive: f.segmentActive,
    modeButtonText: f.segmentText,
    modeButtonTextActive: f.segmentTextActive,
    section: f.inputGroup,
    helper: { ...f.helper, marginBottom: 12 },
    searchRow: {
      ...f.input,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 0,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      height: 46,
      fontSize: 16,
      color: theme.colors.text,
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
    },
    emptyState: { padding: 20, alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 14 },
    emptyStateText: f.empty,
    tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 4 },
    button: { flex: 1 },
    cancelButton: f.secondaryButton,
    saveButton: f.primaryButton,
    buttonDisabled: f.buttonDisabled,
    cancelButtonText: f.secondaryButtonText,
    saveButtonText: f.primaryButtonText,
  });
};
