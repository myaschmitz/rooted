import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Check, Star, Trash2 } from 'lucide-react-native';
import { PlantPhoto } from '../../types/Plant';
import { PhotoService } from '../../services/PhotoService';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { BaseColors, Spacing, Typography, BorderRadius } from '../../styles/theme';
import { TextSkeleton } from '../Skeleton';

interface FormattedDate {
  date: string;
  timeAgo: string;
}

interface PlantPhotosSectionProps {
  photos: PlantPhoto[];
  thumbnailPhotoId: string | null;
  isMultiSelectMode: boolean;
  selectedPhotos: Set<string>;
  formattedDates: { [key: string]: FormattedDate };
  onPhotoPress: (photo: PlantPhoto) => void;
  onPhotoLongPress: (photo: PlantPhoto) => void;
  onToggleMultiSelect: () => void;
  onTogglePhotoSelection: (photoId: string) => void;
  onDeleteSelectedPhotos: () => void;
}

const TILE_SIZE = 104;

export default function PlantPhotosSection({
  photos,
  thumbnailPhotoId,
  isMultiSelectMode,
  selectedPhotos,
  formattedDates,
  onPhotoPress,
  onPhotoLongPress,
  onToggleMultiSelect,
  onTogglePhotoSelection,
  onDeleteSelectedPhotos,
}: PlantPhotosSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (photos.length === 0) {
    return null;
  }

  const selectedCount = selectedPhotos.size;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Photos</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{photos.length}</Text>
          </View>
        </View>

        {isMultiSelectMode ? (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={onDeleteSelectedPhotos}
              disabled={selectedCount === 0}
              style={[styles.textButton, selectedCount === 0 && styles.disabled]}
              accessibilityRole="button"
            >
              <Trash2 size={15} color={theme.colors.error} />
              <Text style={[styles.textButtonLabel, { color: theme.colors.error }]}>
                {selectedCount > 0 ? `Delete ${selectedCount}` : 'Delete'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onToggleMultiSelect}
              style={styles.textButton}
              accessibilityRole="button"
            >
              <Text style={[styles.textButtonLabel, styles.doneLabel]}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={onToggleMultiSelect}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={styles.textButtonLabel}>Select</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {photos.map((photo) => {
          const isSelected = selectedPhotos.has(photo.id);
          const isCover = thumbnailPhotoId === photo.id;
          const dates = formattedDates[photo.id];

          return (
            <TouchableOpacity
              key={photo.id}
              style={styles.tile}
              activeOpacity={0.8}
              onPress={() =>
                isMultiSelectMode ? onTogglePhotoSelection(photo.id) : onPhotoPress(photo)
              }
              onLongPress={() => !isMultiSelectMode && onPhotoLongPress(photo)}
              accessibilityLabel={dates ? `Photo from ${dates.date}` : 'Photo'}
              accessibilityState={isMultiSelectMode ? { selected: isSelected } : undefined}
            >
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: PhotoService.getImageUrl(photo, true) }}
                  style={styles.image}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />

                {isCover && !isMultiSelectMode ? (
                  <View style={styles.coverBadge}>
                    <Star size={10} color={BaseColors.white} fill={BaseColors.white} />
                    <Text style={styles.coverText}>Cover</Text>
                  </View>
                ) : null}

                {isMultiSelectMode ? (
                  <>
                    {isSelected ? <View style={styles.selectedOverlay} /> : null}
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected ? (
                        <Check size={13} color={BaseColors.white} strokeWidth={3} />
                      ) : null}
                    </View>
                  </>
                ) : null}
              </View>

              {dates ? (
                <Text style={styles.caption} numberOfLines={1}>
                  {dates.timeAgo}
                </Text>
              ) : (
                <View style={styles.captionSkeleton}>
                  <TextSkeleton width={64} height={12} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      margin: 10,
      marginTop: 0,
      paddingVertical: Spacing.base,
      borderRadius: BorderRadius.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: Spacing.base,
      marginBottom: Spacing.sm + 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    title: {
      fontSize: Typography.lg,
      fontWeight: Typography.weights.bold,
      color: theme.colors.text,
    },
    countBadge: {
      minWidth: 22,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: 'center',
    },
    countText: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
    },
    textButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.xs,
      borderRadius: BorderRadius.base,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    textButtonLabel: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
    },
    doneLabel: {
      color: theme.colors.primary,
    },
    disabled: {
      opacity: 0.4,
    },
    strip: {
      paddingHorizontal: Spacing.base,
      gap: Spacing.sm + 2,
    },
    tile: {
      width: TILE_SIZE,
    },
    imageWrap: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSecondary,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    coverBadge: {
      position: 'absolute',
      left: 6,
      bottom: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    coverText: {
      color: BaseColors.white,
      fontSize: 10,
      fontWeight: Typography.weights.semibold,
    },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: BorderRadius.lg,
      borderWidth: 3,
      borderColor: theme.colors.primary,
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
    },
    checkbox: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: BaseColors.white,
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    caption: {
      marginTop: Spacing.xs + 2,
      fontSize: Typography.xs,
      color: theme.colors.textSecondary,
    },
    captionSkeleton: {
      marginTop: Spacing.xs + 2,
    },
  });
