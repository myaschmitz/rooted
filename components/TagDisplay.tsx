import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { Tag } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import TagChip from './TagChip';

interface TagDisplayProps {
  tag: Tag;
  onPress?: (tag: Tag) => void;
  onLongPress?: (tag: Tag) => void;
  showRemoveButton?: boolean;
  onRemove?: (tag: Tag) => void;
  /** Edit mode: tapping the tag edits it and an × removes it. */
  showEditMode?: boolean;
  onEdit?: (tag: Tag) => void;
}

export default function TagDisplay({
  tag,
  onPress,
  onLongPress,
  showRemoveButton = false,
  onRemove,
  showEditMode = false,
  onEdit,
}: TagDisplayProps) {
  const { theme } = useTheme();
  const showRemove = showRemoveButton || showEditMode;

  const handlePress = showEditMode
    ? onEdit && (() => onEdit(tag))
    : onPress && (() => onPress(tag));

  return (
    <TagChip
      name={tag.name}
      color={tag.color}
      onPress={handlePress}
      onLongPress={!showEditMode && onLongPress ? () => onLongPress(tag) : undefined}
      accessibilityLabel={showEditMode ? `Edit ${tag.name}` : tag.name}
      style={showRemove ? styles.withRemove : undefined}
      trailing={
        showRemove ? (
          <Pressable
            onPress={() => onRemove?.(tag)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${tag.name}`}
            style={[styles.remove, { backgroundColor: theme.colors.surfaceSecondary }]}
          >
            <X size={11} color={theme.colors.textSecondary} strokeWidth={2.5} />
          </Pressable>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  withRemove: {
    paddingRight: 5,
  },
  remove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
