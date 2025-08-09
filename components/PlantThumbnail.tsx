import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
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
    loadingOverlay: {
      position: 'absolute',
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 8,
    },
  });

  if (imageUri && !hasError) {
    return (
      <View style={styles.container}>
        <Image 
          source={{ uri: imageUri }} 
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator 
              size="small" 
              color={theme.colors.primary} 
            />
          </View>
        )}
      </View>
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