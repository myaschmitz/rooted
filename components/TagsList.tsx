import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Pencil, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import { Tag, PlantTag } from '../types/Plant';
import { useWebModal } from '../contexts/WebModalContext';
import { usePlantTags, useRemoveTagFromPlant } from '../hooks/queries';
import { useTheme } from '../contexts/ThemeContext';
import TagDisplay from './TagDisplay';
import { Skeleton } from './Skeleton';
import { useAlert } from '../contexts/AlertContext';

interface TagsListProps {
  plantId: string;
  onAddTagPress: () => void;
  onTagPress?: (tag: Tag) => void;
  onTagLongPress?: (tag: Tag) => void;
  refreshTrigger?: number; // Used to trigger refresh from parent
}

export default function TagsList({ 
  plantId, 
  onAddTagPress, 
  onTagPress, 
  onTagLongPress,
  refreshTrigger = 0
}: TagsListProps) {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { openModal } = useWebModal();
  const [isEditMode, setIsEditMode] = useState(false);
  const {
    data: tags = [],
    isLoading: loading,
    error,
    refetch: loadTags,
  } = usePlantTags(plantId);
  const removeTagMutation = useRemoveTagFromPlant();

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadTags();
    }
  }, [refreshTrigger, loadTags]);

  // Leave edit mode once the last tag is gone
  useEffect(() => {
    if (tags.length === 0 && isEditMode) {
      setIsEditMode(false);
    }
  }, [tags.length, isEditMode]);

  const handleRemoveTagFromPlant = async (tag: Tag) => {
    showAlert(
      'Remove Tag',
      `Are you sure you want to remove the "${tag.name}" tag from this plant?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTagMutation.mutateAsync({ plantId, tagId: tag.id });
            } catch (err) {
              console.error('Failed to remove tag from plant:', err);
              showAlert('Error', 'Failed to remove tag from plant');
            }
          },
        },
      ]
    );
  };

  const handleTagLongPress = (tag: Tag) => {
    // Only handle long press when not in edit mode
    if (!isEditMode) {
      if (onTagLongPress) {
        onTagLongPress(tag);
      } else {
        // Default action: show remove option
        showAlert(
          'Tag Options',
          `What would you like to do with "${tag.name}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => handleRemoveTagFromPlant(tag),
            },
          ]
        );
      }
    }
  };

  const handleRemoveTag = (tag: Tag) => {
    handleRemoveTagFromPlant(tag);
  };

  const handleEditTag = (tag: Tag) => {
    if (!openModal('edit-tag', { tagId: tag.id })) {
      router.push(`/edit-tag?tagId=${tag.id}`);
    }
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.row}>
        <Skeleton width={84} height={30} borderRadius={15} />
        <Skeleton width={64} height={30} borderRadius={15} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorRow}>
        <Text style={styles.errorText}>Couldn't load tags.</Text>
        <TouchableOpacity onPress={() => loadTags()} hitSlop={8}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        {tags.map((tag) => (
          <TagDisplay
            key={tag.id}
            tag={tag}
            onPress={isEditMode ? undefined : onTagPress}
            onLongPress={handleTagLongPress}
            showEditMode={isEditMode}
            onRemove={handleRemoveTag}
            onEdit={handleEditTag}
          />
        ))}

        {!isEditMode ? (
          <TouchableOpacity
            style={[styles.addChip, tags.length > 0 && styles.addChipIconOnly]}
            onPress={onAddTagPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add tag"
          >
            <Plus size={14} color={theme.colors.textSecondary} strokeWidth={2.5} />
            {tags.length === 0 ? <Text style={styles.addChipText}>Add tag</Text> : null}
          </TouchableOpacity>
        ) : null}

        {tags.length > 0 ? (
          <TouchableOpacity
            style={[styles.editChip, isEditMode && styles.editChipActive]}
            onPress={toggleEditMode}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isEditMode ? 'Done editing tags' : 'Edit tags'}
          >
            {isEditMode ? (
              <Text style={styles.editChipText}>Done</Text>
            ) : (
              <Pencil size={13} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      {isEditMode ? (
        <Text style={styles.hint}>Tap a tag to edit it, or × to remove it from this plant.</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 6,
    },
    addChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 30,
      paddingHorizontal: 12,
      borderRadius: 15,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    addChipIconOnly: {
      width: 30,
      paddingHorizontal: 0,
      justifyContent: 'center',
    },
    addChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    editChip: {
      height: 30,
      minWidth: 30,
      paddingHorizontal: 9,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    editChipActive: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 14,
    },
    editChipText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textOnPrimary,
    },
    hint: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 8,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    retryText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
  });
