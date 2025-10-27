import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlantTag } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';

interface TagDisplayProps {
  tag: PlantTag;
  onPress?: (tag: PlantTag) => void;
  onLongPress?: (tag: PlantTag) => void;
  showRemoveButton?: boolean;
  onRemove?: (tag: PlantTag) => void;
}

export default function TagDisplay({ 
  tag, 
  onPress, 
  onLongPress,
  showRemoveButton = false,
  onRemove 
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      disabled={!onPress && !onLongPress}
    >
      <Text style={styles.text} numberOfLines={1}>
        {tag.name}
      </Text>
      {showRemoveButton && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={handleRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.removeButtonText}>×</Text>
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
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    removeButtonText: {
      color: textColor,
      fontSize: 12,
      fontWeight: 'bold',
      lineHeight: 14,
    },
  });
};