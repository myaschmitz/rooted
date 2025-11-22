import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { TagService } from '../services/TagService';
import { Tag } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useAddTagToPlant, useCreateTagAndAddToPlant } from '../hooks/queries';
import { TextSkeleton } from '../components/Skeleton';

const { width: screenWidth } = Dimensions.get('window');

export default function AddTagScreen() {
  const { theme } = useTheme();
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  
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
      Alert.alert('Error', 'Failed to load available tags');
      setMode('create'); // Fallback to create mode
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plantId) {
      Alert.alert('Error', 'Plant ID is required');
      return;
    }

    try {
      if (mode === 'select') {
        // Adding existing tags
        if (selectedExistingTags.length === 0) {
          Alert.alert('Error', 'Please select at least one tag');
          return;
        }
        // Use the new multiple tags method from TagService
        const tagIds = selectedExistingTags.map(tag => tag.id);
        await TagService.addMultipleTagsToPlant(plantId, tagIds);
      } else {
        // Creating a new tag
        const validation = TagService.validateTagName(tagName);
        if (!validation.isValid) {
          Alert.alert('Error', validation.error);
          return;
        }

        if (!TagService.validateTagColor(selectedColor)) {
          Alert.alert('Error', 'Please select a valid color');
          return;
        }

        const result = await createTagMutation.mutateAsync({ plantId, name: tagName.trim(), color: selectedColor });
        
        if (!result.isNew) {
          // Inform user that an existing tag was used
          Alert.alert('Info', 'An existing tag with this name and color was added to your plant.');
        }
      }
      
      router.back();
    } catch (error) {
      console.error('Failed to add tag:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to add tag');
    }
  };

  const handleCancel = () => {
    router.back();
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
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Add Tag to Plant</Text>
        
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
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 30,
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 25,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  modeButtonTextActive: {
    color: theme.colors.textOnPrimary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  existingTagOption: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
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
  section: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: theme.colors.text,
  },
  characterCount: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    textAlign: 'right',
    marginTop: 4,
  },
  previewContainer: {
    alignItems: 'flex-start',
  },
  tagPreview: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTagPreview: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  tagPreviewText: {
    fontSize: 14,
    fontWeight: '600',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  colorOption: {
    width: (screenWidth - 40 - (11 * 4)) / 4, // 4 colors per row with gaps
    height: 50,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColorOption: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  customColorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  colorInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: 'monospace', // For better hex display
  },
  colorPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 30,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});