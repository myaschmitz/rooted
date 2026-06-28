import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Pin, PinOff, Check, Camera } from 'lucide-react-native';
import { router } from 'expo-router';
import { Plant, Tag } from '../types/Plant';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { BaseColors } from '../styles/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { PlantThumbnail } from './PlantThumbnail';
import { TextSkeleton } from './Skeleton';
import {
  formatTimeSinceWatering,
  getWateringStatusColor,
  needsPhoto,
  getTextColorForBackground,
} from '../utils/plantStatus';

interface PlantListItemProps {
  plant: Plant;
  thumbnail?: string;
  lastWateredDate?: string | null;
  lastPhotoDate?: string | null;
  tags: Tag[];
  isPinned: boolean;
  isEventsLoading: boolean;
  // Batch mode props
  batchModeEnabled: boolean;
  isSelected?: boolean;
  onToggleSelection?: (plantId: string) => void;
  onTogglePin?: (plantId: string, event: any) => void;
  // Override default navigation (for desktop detail panel)
  onPress?: (plantId: string) => void;
}

export default function PlantListItem({
  plant,
  thumbnail,
  lastWateredDate,
  lastPhotoDate,
  tags,
  isPinned,
  isEventsLoading,
  batchModeEnabled,
  isSelected = false,
  onToggleSelection,
  onTogglePin,
  onPress,
}: PlantListItemProps) {
  const { theme } = useTheme();
  const { isDesktop, isTablet } = useBreakpoint();
  const isGrid = Platform.OS === 'web' && (isDesktop || isTablet);
  const styles = createStyles(theme);
  const [isHovered, setIsHovered] = useState(false);

  const wateringDisplay = formatTimeSinceWatering(lastWateredDate);
  const wateringColor = getWateringStatusColor(lastWateredDate, theme.colors.textSecondary);
  const showCameraIcon = needsPhoto(lastPhotoDate);

  const thumbnailSize = isGrid ? 80 : batchModeEnabled ? 40 : 65;

  const handlePress = () => {
    if (batchModeEnabled && onToggleSelection) {
      onToggleSelection(plant.id);
    } else if (onPress) {
      onPress(plant.id);
    } else {
      router.push(`/plant/${plant.id}`);
    }
  };

  const handlePinPress = (event: any) => {
    event.stopPropagation();
    if (onTogglePin) {
      onTogglePin(plant.id, event);
    }
  };

  const hoverProps = Platform.OS === 'web'
    ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      }
    : {};

  const renderTags = () => {
    if (tags.length === 0) {
      return <Text style={styles.noTagsText}>No tags</Text>;
    }

    return tags.map((tag, index) => (
      <View
        key={`${tag.id}-${index}`}
        style={[styles.tagBadge, { backgroundColor: tag.color }]}
      >
        <Text
          style={[styles.tagText, { color: getTextColorForBackground(tag.color) }]}
          numberOfLines={1}
        >
          {tag.name}
        </Text>
      </View>
    ));
  };

  if (batchModeEnabled) {
    return (
      <TouchableOpacity
        style={[
          styles.plantCard,
          isSelected && styles.plantCardSelected,
          isGrid && styles.plantCardGrid,
          isHovered && styles.plantCardHovered,
        ]}
        onPress={handlePress}
        {...hoverProps}
      >
        <View style={[styles.plantCardContent, isGrid && styles.plantCardContentGrid]}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Check size={16} color={theme.colors.textOnPrimary} />}
          </View>

          <View style={styles.thumbnailContainer}>
            <PlantThumbnail imageUri={thumbnail} size={thumbnailSize} />
          </View>

          <View style={styles.plantInfo}>
            <Text style={styles.plantName}>{plant.name || plant.type}</Text>
            <View style={styles.tagsContainer}>{renderTags()}</View>
            <View style={styles.wateringContainer}>
              {isEventsLoading ? (
                <TextSkeleton width={120} height={14} />
              ) : (
                <Text style={[styles.wateringStatus, { color: wateringColor }]}>
                  Last watered: {wateringDisplay.timeAgo}
                </Text>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.plantCard,
        isGrid && styles.plantCardGrid,
        isHovered && styles.plantCardHovered,
      ]}
      onPress={handlePress}
      {...hoverProps}
    >
      <View style={[styles.plantCardContent, isGrid && styles.plantCardContentGrid]}>
        <View style={styles.plantThumbnail}>
          <PlantThumbnail imageUri={thumbnail} size={thumbnailSize} />
        </View>

        <View style={styles.plantInfo}>
          <Text style={[styles.plantName, isGrid && styles.plantNameGrid]}>
            {plant.name || plant.type}
          </Text>
          <View style={styles.tagsContainer}>{renderTags()}</View>
          <View style={styles.wateringContainer}>
            {isEventsLoading ? (
              <TextSkeleton width={120} height={14} />
            ) : (
              <Text style={[styles.wateringStatus, { color: wateringColor }]}>
                Last watered: {wateringDisplay.timeAgo}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.pinButton} onPress={handlePinPress}>
            {isPinned ? (
              <PinOff size={16} color={theme.colors.primary} />
            ) : (
              <Pin size={16} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
          {showCameraIcon && (
            <View style={styles.cameraIconContainer}>
              <Camera size={14} color={theme.colors.warning} />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    plantCard: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 8,
      elevation: 3,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer' as any,
            transition: 'box-shadow 0.2s ease, transform 0.15s ease, background-color 0.15s ease' as any,
          }
        : {}),
    },
    plantCardGrid: {
      // In grid mode, cards are sized by the grid container
    },
    plantCardHovered: {
      ...(Platform.OS === 'web'
        ? {
            transform: [{ translateY: -2 }],
            shadowColor: BaseColors.black,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }
        : {}),
    },
    plantCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    plantCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    plantCardContentGrid: {
      // Can be used for vertical card layout in future
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    thumbnailContainer: {
      marginRight: 12,
    },
    plantThumbnail: {
      marginRight: 12,
    },
    plantInfo: {
      flex: 1,
    },
    plantName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
    },
    plantNameGrid: {
      fontSize: 16,
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      maxWidth: '100%',
      marginBottom: 4,
    },
    tagBadge: {
      opacity: 0.8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 12,
      marginRight: 4,
      marginBottom: 2,
    },
    tagText: {
      fontSize: 12,
      fontWeight: '600',
    },
    noTagsText: {
      fontSize: 12,
      fontStyle: 'italic',
      color: theme.colors.textSecondary,
    },
    wateringContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    wateringStatus: {
      fontSize: 14,
      fontWeight: '500',
    },
    actionsContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      minWidth: 32,
    },
    pinButton: {
      padding: 8,
    },
    cameraIconContainer: {
      padding: 8,
    },
  });
