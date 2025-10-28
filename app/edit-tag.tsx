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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { TagService } from '../services/TagService';
import { useTheme } from '../contexts/ThemeContext';
import { PlantTag } from '../types/Plant';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

const { width: screenWidth } = Dimensions.get('window');

export default function EditTagScreen() {
  const { theme } = useTheme();
  const { tagId } = useLocalSearchParams<{ tagId: string }>();
  
  const [originalTag, setOriginalTag] = useState<PlantTag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TagService.getDefaultTagColors()[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const styles = createStyles(theme);

  useEffect(() => {
    loadTag();
  }, [tagId]);

  const loadTag = async () => {
    if (!tagId) {
      Alert.alert('Error', 'Tag ID is required');
      router.back();
      return;
    }

    try {
      setLoading(true);
      const tag = await TagService.getTagById(tagId);
      setOriginalTag(tag);
      setTagName(tag.name);
      setSelectedColor(tag.color);
    } catch (error) {
      console.error('Failed to load tag:', error);
      Alert.alert('Error', 'Failed to load tag details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const validation = TagService.validateTagName(tagName);
    if (!validation.isValid) {
      Alert.alert('Error', validation.error);
      return;
    }

    if (!TagService.validateTagColor(selectedColor)) {
      Alert.alert('Error', 'Please select a valid color');
      return;
    }

    if (!originalTag) {
      Alert.alert('Error', 'Tag data not loaded');
      return;
    }

    // Check if anything actually changed
    if (tagName.trim() === originalTag.name && selectedColor === originalTag.color) {
      router.back();
      return;
    }

    setSaving(true);
    try {
      await TagService.updateTag(originalTag.id, {
        name: tagName.trim(),
        color: selectedColor,
      });
      router.back();
    } catch (error) {
      console.error('Failed to update tag:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update tag');
    } finally {
      setSaving(false);
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
        <Text style={styles.loadingText}>Loading tag...</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Edit Tag</Text>
        
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
              saving && styles.buttonDisabled
            ]}
            onPress={handleSave}
            disabled={saving || !tagName.trim()}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Updating...' : 'Update Tag'}
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