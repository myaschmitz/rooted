import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Pin, Check, Camera, Droplets } from 'lucide-react-native';
import { router } from 'expo-router';
import { Plant, Tag } from '../types/Plant';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { BaseColors, Spacing, Typography, BorderRadius } from '../styles/theme';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { PlantThumbnail } from './PlantThumbnail';
import { TextSkeleton } from './Skeleton';
import {
  formatTimeSinceWatering,
  getWateringStatusColor,
  needsPhoto,
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

const THUMBNAIL_SIZE = 56;
const MAX_TAGS = 3;

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

  const watering = formatTimeSinceWatering(lastWateredDate);
  const neverWatered = !lastWateredDate;
  const wateringColor = getWateringStatusColor(lastWateredDate, theme.colors.textTertiary);
  const showCameraBadge = !batchModeEnabled && needsPhoto(lastPhotoDate);

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
    onTogglePin?.(plant.id, event);
  };

  const hoverProps =
    Platform.OS === 'web'
      ? {
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
        }
      : {};

  const visibleTags = tags.slice(0, MAX_TAGS);
  const extraTags = tags.length - visibleTags.length;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.card,
        isGrid && styles.cardGrid,
        isHovered && styles.cardHovered,
        batchModeEnabled && isSelected && styles.cardSelected,
      ]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={batchModeEnabled ? { selected: isSelected } : undefined}
      {...hoverProps}
    >
      {batchModeEnabled ? (
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected ? <Check size={14} color={BaseColors.white} strokeWidth={3} /> : null}
        </View>
      ) : null}

      <View>
        <PlantThumbnail imageUri={thumbnail} size={THUMBNAIL_SIZE} borderRadius={BorderRadius.lg} />
        {showCameraBadge ? (
          <View style={styles.cameraBadge} accessibilityLabel="Due for a new photo">
            <Camera size={10} color={BaseColors.white} strokeWidth={2.5} />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {plant.name || plant.type}
        </Text>

        <View style={styles.metaRow}>
          {isEventsLoading ? (
            <TextSkeleton width={84} height={20} />
          ) : (
            <View
              style={[
                styles.waterPill,
                { backgroundColor: neverWatered ? theme.colors.surfaceSecondary : `${wateringColor}22` },
              ]}
              accessibilityLabel={neverWatered ? 'Not watered yet' : `Watered ${watering.timeAgo}`}
            >
              <Droplets size={12} color={wateringColor} />
              <Text style={styles.waterText} numberOfLines={1}>
                {neverWatered ? 'Not watered yet' : watering.timeAgo}
              </Text>
            </View>
          )}

          {visibleTags.map((tag) => (
            <View key={tag.id} style={styles.tag}>
              <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
              <Text style={styles.tagText} numberOfLines={1}>
                {tag.name}
              </Text>
            </View>
          ))}
          {extraTags > 0 ? <Text style={styles.tagText}>+{extraTags}</Text> : null}
        </View>
      </View>

      {!batchModeEnabled ? (
        <TouchableOpacity
          style={styles.pinButton}
          onPress={handlePinPress}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={isPinned ? 'Unpin plant' : 'Pin plant'}
        >
          <Pin
            size={16}
            color={isPinned ? theme.colors.primary : theme.colors.textTertiary}
            fill={isPinned ? theme.colors.primary : 'transparent'}
            style={isPinned ? undefined : styles.pinIdle}
          />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm + 4,
      backgroundColor: theme.colors.surface,
      padding: Spacing.sm + 4,
      marginHorizontal: Spacing.base,
      marginBottom: Spacing.sm,
      borderRadius: BorderRadius['2xl'] - 2,
      borderWidth: 1.5,
      borderColor: 'transparent',
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer' as any,
            transition: 'box-shadow 0.2s ease, transform 0.15s ease, border-color 0.15s ease' as any,
          }
        : {}),
    },
    cardGrid: {
      marginHorizontal: Spacing.sm,
    },
    cardHovered: {
      ...(Platform.OS === 'web'
        ? {
            transform: [{ translateY: -1 }],
            shadowColor: BaseColors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
          }
        : {}),
    },
    cardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: `${theme.colors.primary}14`,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    cameraBadge: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.warning,
      borderWidth: 2,
      borderColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: {
      flex: 1,
      gap: Spacing.xs + 2,
    },
    name: {
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.text,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    waterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 3,
      borderRadius: BorderRadius.full,
    },
    waterText: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: 110,
    },
    tagDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    tagText: {
      fontSize: Typography.xs,
      color: theme.colors.textTertiary,
      flexShrink: 1,
    },
    pinButton: {
      alignSelf: 'flex-start',
      padding: Spacing.xs,
    },
    pinIdle: {
      opacity: 0.6,
    },
  });
