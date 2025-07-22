import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Flower2 } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface PlantThumbnailProps {
  imageUri?: string;
  size?: number;
}

export const PlantThumbnail: React.FC<PlantThumbnailProps> = ({ 
  imageUri, 
  size = 60 
}) => {
  const { theme } = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      width: size,
      height: size,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceSecondary,
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    },
    image: {
      width: size,
      height: size,
      borderRadius: 8,
    },
    iconContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (imageUri) {
    return (
      <Image 
        source={{ uri: imageUri }} 
        style={styles.image}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Flower2 
          size={size * 0.5} 
          color={theme.colors.primary}
        />
      </View>
    </View>
  );
};