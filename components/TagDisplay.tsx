import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tag } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import { X, Edit } from 'lucide-react-native';

interface TagDisplayProps {
  tag: Tag;
  onPress?: (tag: Tag) => void;
  onLongPress?: (tag: Tag) => void;
  showRemoveButton?: boolean;
  onRemove?: (tag: Tag) => void;
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
  onEdit
}: TagDisplayProps) {
  const { theme } = useTheme();

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

  const styles = createStyles(theme, tag.color, getTextColor(tag.color));

  const handlePress = () => {
    if (onPress) {
      onPress(tag);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(tag);
    }
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(tag);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(tag);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      disabled={!onPress && !onLongPress}
    >
      {showEditMode && (
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Edit size={12} color={getTextColor(tag.color)} />
        </TouchableOpacity>
      )}
      <Text style={[styles.text, showEditMode && styles.textWithIcons]} numberOfLines={1}>
        {tag.name}
      </Text>
      {(showRemoveButton || showEditMode) && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={12} color={getTextColor(tag.color)} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (theme: any, backgroundColor: string, textColor: string) => {

  return StyleSheet.create({
    container: {
      backgroundColor: backgroundColor,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginBottom: 8,
    },
    text: {
      color: textColor,
      fontSize: 14,
      fontWeight: '600',
    },
    removeButton: {
      marginLeft: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editButton: {
      marginRight: 6,
      width: 18,
      height: 18,
      borderRadius: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWithIcons: {
      marginHorizontal: 4,
    },
  });
};