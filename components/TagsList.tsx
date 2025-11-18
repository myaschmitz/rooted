import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Edit } from 'lucide-react-native';
import { router } from 'expo-router';
import { Tag, PlantTag } from '../types/Plant';
import { TagService } from '../services/TagService';
import { useTheme } from '../contexts/ThemeContext';
import TagDisplay from './TagDisplay';
import { TextSkeleton } from './Skeleton';

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
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const loadTags = async (bypassCache = false) => {
    try {
      setLoading(true);
      setError(null);
      const plantTags = await TagService.getTagsByPlantId(plantId, bypassCache);
      setTags(plantTags);
    } catch (err) {
      console.error('Failed to load tags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Bypass cache when refreshTrigger changes (but not on initial load)
    const shouldBypassCache = refreshTrigger > 0;
    loadTags(shouldBypassCache);
  }, [plantId, refreshTrigger]);

  const handleRemoveTagFromPlant = async (tag: Tag) => {
    Alert.alert(
      'Remove Tag',
      `Are you sure you want to remove the "${tag.name}" tag from this plant?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await TagService.removeTagFromPlant(plantId, tag.id);
              // Remove the tag from local state for immediate UI update
              setTags(prevTags => {
                const newTags = prevTags.filter(t => t.id !== tag.id);
                // Exit edit mode if this was the last tag
                if (newTags.length === 0 && isEditMode) {
                  setIsEditMode(false);
                }
                return newTags;
              });
            } catch (err) {
              console.error('Failed to remove tag from plant:', err);
              Alert.alert('Error', 'Failed to remove tag from plant');
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
        Alert.alert(
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
    router.push(`/edit-tag?tagId=${tag.id}`);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.tagsContainer}>
        <TextSkeleton width={100} height={16} style={{ marginBottom: 4 }} />
        <TextSkeleton width={80} height={14} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading tags</Text>
        <TouchableOpacity onPress={() => loadTags()} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tagsRow}>
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
        {!isEditMode && (
          <TouchableOpacity
            style={[
              styles.addButton,
              tags.length === 0 && styles.addButtonEmpty
            ]}
            onPress={onAddTagPress}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.addButtonText,
              tags.length === 0 && styles.addButtonTextEmpty
            ]}>
              {tags.length === 0 ? 'Add tags +' : '+'}
            </Text>
          </TouchableOpacity>
        )}
        {tags.length > 0 && (
          <TouchableOpacity
            style={[
              styles.editButton,
              isEditMode && styles.editButtonActive
            ]}
            onPress={toggleEditMode}
            activeOpacity={0.7}
          >
            {isEditMode ? (
              <Text style={styles.editButtonText}>Done</Text>
            ) : (
              <Edit size={16} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  tagsContainer: {
    marginVertical: 8,
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  addButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  addButtonEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
  },
  addButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonTextEmpty: {
    fontSize: 16,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  errorText: {
    color: theme.colors.error || '#F44336',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  editButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  editButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});