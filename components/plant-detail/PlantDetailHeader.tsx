import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SquarePen, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { Plant, PlantPhoto } from '../../types/Plant';
import { PhotoService } from '../../services/PhotoService';
import { useTheme, Theme } from '../../contexts/ThemeContext';

interface PlantDetailHeaderProps {
  plant: Plant;
  thumbnailPhoto: PlantPhoto | null | undefined;
  onThumbnailPress: () => void;
  onDeletePlant: () => void;
}

export default function PlantDetailHeader({
  plant,
  thumbnailPhoto,
  onThumbnailPress,
  onDeletePlant,
}: PlantDetailHeaderProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          {thumbnailPhoto && (
            <TouchableOpacity onPress={onThumbnailPress}>
              <Image
                source={{ uri: PhotoService.getImageUrl(thumbnailPhoto, true) }}
                style={styles.thumbnailImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            </TouchableOpacity>
          )}
          <View style={[styles.headerContent, thumbnailPhoto && styles.headerContentWithThumbnail]}>
            <Text style={styles.plantName}>{plant.name || `${plant.type}`}</Text>
            <Text style={styles.plantType}>{plant.type}</Text>
            {plant.location && (
              <Text style={styles.location}>{plant.location}</Text>
            )}
          </View>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/edit-plant?id=${plant.id}`)}
          >
            <SquarePen size={16} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerDeleteButton}
            onPress={onDeletePlant}
          >
            <Trash2 size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      marginBottom: 10,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerContent: {
      flex: 1,
    },
    headerContentWithThumbnail: {
      marginLeft: 15,
    },
    thumbnailImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    plantName: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 5,
      color: theme.colors.text,
    },
    plantType: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      marginBottom: 5,
    },
    location: {
      fontSize: 16,
      color: theme.colors.textTertiary,
      marginBottom: 10,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    editButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerDeleteButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
