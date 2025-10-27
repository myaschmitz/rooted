import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { PlantTag } from '../types/Plant';
import { TagService } from '../services/TagService';
import { useTheme } from '../contexts/ThemeContext';
import TagDisplay from './TagDisplay';

interface TagsListProps {
  plantId: string;
  onAddTagPress: () => void;
  onTagPress?: (tag: PlantTag) => void;
  onTagLongPress?: (tag: PlantTag) => void;
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
  const [tags, setTags] = useState<PlantTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleDeleteTag = async (tag: PlantTag) => {
    Alert.alert(
      'Delete Tag',
      `Are you sure you want to delete the "${tag.name}" tag?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await TagService.deleteTag(tag.id);
              // Remove the tag from local state for immediate UI update
              setTags(prevTags => prevTags.filter(t => t.id !== tag.id));
            } catch (err) {
              console.error('Failed to delete tag:', err);
              Alert.alert('Error', 'Failed to delete tag');
            }
          },
        },
      ]
    );
  };

  const handleTagLongPress = (tag: PlantTag) => {
    if (onTagLongPress) {
      onTagLongPress(tag);
    } else {
      // Default action: show delete option
      Alert.alert(
        'Tag Options',
        `What would you like to do with "${tag.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteTag(tag),
          },
        ]
      );
    }
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading tags...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error loading tags</Text>
        <TouchableOpacity onPress={loadTags} style={styles.retryButton}>
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
            onPress={onTagPress}
            onLongPress={handleTagLongPress}
          />
        ))}
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
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    marginVertical: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});