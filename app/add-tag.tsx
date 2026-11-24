import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { TagService } from '../services/TagService';
import { Tag } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import { formStyles } from '../styles/FormStyles';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useAddTagToPlant, useCreateTagAndAddToPlant } from '../hooks/queries';
import { TextSkeleton } from '../components/Skeleton';
import WebContainer from '../components/WebContainer';
import { useModalDismiss, useModalParams } from '../hooks/useModalNav';
import { useAlert } from '../contexts/AlertContext';

const { width: screenWidth } = Dimensions.get('window');

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
      // Bypass cache to ensure fresh data and avoid inconsistencies
      const tags = await TagService.getAllTagsWithPlantStatus(plantId, true);
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

  const getTextColor = (backgroundColor: string): string => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light colors, white for dark colors
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const defaultColors = TagService.getDefaultTagColors();

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={{ alignItems: 'center' }}>
          <TextSkeleton width={200} height={20} style={{ marginBottom: 16 }} />
          <TextSkeleton width={160} height={16} style={{ marginBottom: 12 }} />
          <TextSkeleton width={180} height={16} style={{ marginBottom: 12 }} />
          <TextSkeleton width={140} height={16} />
        </View>
      </View>
    );
  }

  return (
    <WebContainer>
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.content}>
        
        {/* Mode Toggle */}
        {availableTags.length > 0 && (
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'select' && styles.modeButtonActive
              ]}
              onPress={() => setMode('select')}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'select' && styles.modeButtonTextActive
              ]}>
                Select Existing
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modeButton,
                mode === 'create' && styles.modeButtonActive
              ]}
              onPress={() => setMode('create')}
            >
              <Text style={[
                styles.modeButtonText,
                mode === 'create' && styles.modeButtonTextActive
              ]}>
                Create New
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'select' ? (
          // Existing tags selection
          <View>
            <Text style={styles.sectionTitle}>Select an Existing Tag</Text>
            {availableTags.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No existing tags available. Create a new tag instead.
                </Text>
              </View>
            ) : (
              <View style={styles.tagsGrid}>
                {availableTags.map((tag) => {
                  const isSelected = selectedExistingTags.some(t => t.id === tag.id);
                  const isAlreadyAdded = tag.isAlreadyAdded;
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.existingTagOption,
                        isAlreadyAdded && styles.alreadyAddedTagOption
                      ]}
                      onPress={() => {
                        // Prevent selection if already added
                        if (isAlreadyAdded) return;
                        
                        if (isSelected) {
                          // Remove tag from selection
                          setSelectedExistingTags(prev => prev.filter(t => t.id !== tag.id));
                        } else {
                          // Add tag to selection
                          setSelectedExistingTags(prev => [...prev, tag]);
                        }
                      }}
                      disabled={isAlreadyAdded}
                    >
                    <View style={[
                      styles.tagPreview,
                      { backgroundColor: tag.color },
                      isSelected && styles.selectedTagPreview,
                      isAlreadyAdded && styles.alreadyAddedTagPreview
                    ]}>
                      <Text style={[
                        styles.tagPreviewText,
                        { color: getTextColor(tag.color) },
                        isAlreadyAdded && styles.alreadyAddedTagText
                      ]}>
                        {tag.name}
                      </Text>
                      {isAlreadyAdded && (
                        <Text style={[
                          styles.alreadyAddedLabel,
                          { color: getTextColor(tag.color) }
                        ]}>
                          Already added
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          // Create new tag form
          <View>
            <Text style={styles.sectionTitle}>Create New Tag</Text>
            
            {/* Tag Name Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Tag Name</Text>
              <TextInput
                style={styles.input}
                value={tagName}
                onChangeText={setTagName}
                placeholder="Enter tag name"
                placeholderTextColor={theme.colors.textTertiary}
                maxLength={50}
              />
              <Text style={styles.characterCount}>
                {tagName.length}/50
              </Text>
            </View>

            {/* Tag Preview */}
            {tagName.trim() && (
              <View style={styles.section}>
                <Text style={styles.label}>Preview</Text>
                <View style={styles.previewContainer}>
                  <View style={[
                    styles.tagPreview, 
                    { backgroundColor: selectedColor }
                  ]}>
                    <Text style={[
                      styles.tagPreviewText,
                      { color: getTextColor(selectedColor) }
                    ]}>
                      {tagName.trim()}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Color Picker */}
            <View style={styles.section}>
              <Text style={styles.label}>Tag Color</Text>
              <TouchableOpacity 
                style={styles.colorGrid}
                activeOpacity={1}
                onPress={() => Keyboard.dismiss()}
              >
                {defaultColors.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColorOption
                    ]}
                    onPress={() => {
                      setSelectedColor(color);
                      Keyboard.dismiss();
                    }}
                    activeOpacity={0.8}
                  />
                ))}
              </TouchableOpacity>
            </View>

            {/* Custom Color Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Custom Color (Hex)</Text>
              <View style={styles.customColorContainer}>
                <TextInput
                  style={styles.colorInput}
                  value={selectedColor}
                  onChangeText={(text) => {
                    // Ensure it starts with # and only contains valid hex characters
                    let formattedText = text.toUpperCase();
                    if (!formattedText.startsWith('#')) {
                      formattedText = '#' + formattedText;
                    }
                    // Remove any invalid characters
                    formattedText = formattedText.replace(/[^#0-9A-F]/g, '');
                    // Limit to 7 characters (#RRGGBB)
                    if (formattedText.length <= 7) {
                      setSelectedColor(formattedText);
                    }
                  }}
                  placeholder="#FF5733"
                  placeholderTextColor={theme.colors.textTertiary}
                  maxLength={7}
                  autoCapitalize="characters"
                />
                <View style={[
                  styles.colorPreview,
                  { backgroundColor: TagService.validateTagColor(selectedColor) ? selectedColor : theme.colors.border }
                ]} />
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.saveButton,
              saving && styles.buttonDisabled,
              (mode === 'select' && selectedExistingTags.length === 0) && styles.buttonDisabled,
              (mode === 'create' && !tagName.trim()) && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={
              saving || 
              (mode === 'select' && selectedExistingTags.length === 0) ||
              (mode === 'create' && !tagName.trim())
            }
          >
            <Text style={styles.saveButtonText}>
              {saving ? (mode === 'select' ? 'Adding...' : 'Creating...') : 
               (mode === 'select' ? 
                 (selectedExistingTags.length === 1 ? 'Add Tag' : `Add ${selectedExistingTags.length} Tags`) : 
                 'Create Tag')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAwareScrollView>
    </WebContainer>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: formStyles(theme).screen,
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: formStyles(theme).form,
  modeToggle: { ...formStyles(theme).segmented, marginBottom: 20 },
  modeButton: formStyles(theme).segment,
  modeButtonActive: formStyles(theme).segmentActive,
  modeButtonText: formStyles(theme).segmentText,
  modeButtonTextActive: formStyles(theme).segmentTextActive,
  sectionTitle: formStyles(theme).label,
  emptyState: { padding: 24, alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16 },
  emptyStateText: formStyles(theme).empty,
  tagsGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  existingTagOption: { borderRadius: 999 },
  selectedTagOption: {
    // Border moved to selectedTagPreview for better visual alignment
  },
  alreadyAddedTagOption: {
    opacity: 0.5,
    borderColor: 'transparent',
  },
  alreadyAddedTagPreview: {
    opacity: 0.7,
  },
  alreadyAddedTagText: {
    opacity: 0.8,
  },
  alreadyAddedLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.9,
  },
  section: formStyles(theme).inputGroup,
  label: formStyles(theme).label,
  input: formStyles(theme).input,
  characterCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    alignItems: 'flex-start',
  },
  tagPreview: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  selectedTagPreview: { borderColor: theme.colors.text },
  tagPreviewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: 'transparent' },
  selectedColorOption: { borderColor: theme.colors.text, transform: [{ scale: 1.08 }] },
  customColorContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  colorInput: { ...formStyles(theme).input, flex: 1, fontFamily: 'monospace' },
  colorPreview: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border },
  buttonContainer: { flexDirection: 'row', gap: 10, marginTop: 12 },
  button: { flex: 1 },
  cancelButton: formStyles(theme).secondaryButton,
  saveButton: formStyles(theme).primaryButton,
  buttonDisabled: formStyles(theme).buttonDisabled,
  cancelButtonText: formStyles(theme).secondaryButtonText,
  saveButtonText: formStyles(theme).primaryButtonText,
});