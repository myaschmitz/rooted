import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { TagService } from '../services/TagService';
import { useTheme } from '../contexts/ThemeContext';
import { formStyles } from '../styles/FormStyles';
import { Tag } from '../types/Plant';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { Skeleton } from '../components/Skeleton';
import TagForm from '../components/TagForm';
import { useUpdateTag } from '../hooks/queries';
import WebContainer from '../components/WebContainer';
import { useModalDismiss, useModalParams } from '../hooks/useModalNav';
import { useAlert } from '../contexts/AlertContext';

export default function EditTagScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { tagId } = useModalParams<{ tagId: string }>();
  const dismiss = useModalDismiss();
  const updateTagMutation = useUpdateTag();
  
  const [originalTag, setOriginalTag] = useState<Tag | null>(null);
  const [tagName, setTagName] = useState('');
  const [selectedColor, setSelectedColor] = useState(TagService.getDefaultTagColors()[0]);
  const [loading, setLoading] = useState(true);
  
  const saving = updateTagMutation.isPending;
  
  const styles = createStyles(theme);

  useEffect(() => {
    loadTag();
  }, [tagId]);

  const loadTag = async () => {
    if (!tagId) {
      showAlert('Error', 'Tag ID is required');
      dismiss();
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
      showAlert('Error', 'Failed to load tag details');
      dismiss();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const validation = TagService.validateTagName(tagName);
    if (!validation.isValid) {
      showAlert('Error', validation.error);
      return;
    }

    if (!TagService.validateTagColor(selectedColor)) {
      showAlert('Error', 'Please select a valid color');
      return;
    }

    if (!originalTag) {
      showAlert('Error', 'Tag data not loaded');
      return;
    }

    // Check if anything actually changed
    if (tagName.trim() === originalTag.name && selectedColor === originalTag.color) {
      dismiss();
      return;
    }

    try {
      await updateTagMutation.mutateAsync({
        id: originalTag.id,
        updates: {
          name: tagName.trim(),
          color: selectedColor,
        }
      });
      dismiss();
    } catch (error) {
      console.error('Failed to update tag:', error);
      showAlert('Error', error instanceof Error ? error.message : 'Failed to update tag');
    }
  };

  const handleCancel = () => {
    dismiss();
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.content]}>
        <Skeleton height={48} borderRadius={12} style={{ marginBottom: 20 }} />
        <View style={styles.swatchSkeletons}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} width={36} height={36} borderRadius={18} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <WebContainer>
      <KeyboardAwareScrollView style={styles.container}>
        <View style={styles.content}>
          <TagForm
            name={tagName}
            onNameChange={setTagName}
            color={selectedColor}
            onColorChange={setSelectedColor}
          />

          <Text style={styles.helper}>
            Changes apply to every plant with this tag.
          </Text>

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
                (saving || !tagName.trim()) && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || !tagName.trim()}
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
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
    helper: { ...f.helper, marginTop: -4, marginBottom: 16 },
    swatchSkeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    buttonContainer: { flexDirection: 'row', gap: 10 },
    button: { flex: 1 },
    cancelButton: f.secondaryButton,
    saveButton: f.primaryButton,
    buttonDisabled: f.buttonDisabled,
    cancelButtonText: f.secondaryButtonText,
    saveButtonText: f.primaryButtonText,
  });
};
