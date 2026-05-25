import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { X, ChevronRight, ExternalLink } from "lucide-react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { usePlantDetailState } from "../hooks/usePlantDetailState";
import { useRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import TagsList from "./TagsList";
import {
  PlantDetailHeader,
  PlantActionButtons,
  PlantPhotosSection,
  PlantEventsSection,
  PhotoViewerModal,
  ThumbnailViewerModal,
} from "./plant-detail";

interface PlantDetailPanelProps {
  plantId: string;
  onClose: () => void;
  style?: any;
}

export default function PlantDetailPanel({
  plantId,
  onClose,
  style,
}: PlantDetailPanelProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [tagRefreshTrigger, setTagRefreshTrigger] = useState(0);

  const {
    plant,
    typedEvents,
    typedPhotos,
    allPhotos,
    thumbnailPhoto,
    eventPhotos,
    formattedDates,
    currentThumbnailId,
    loading,
    refreshing,
    uploadingPhoto,
    imageViewerVisible,
    currentPhotoIndex,
    photoViewerOpenId,
    thumbnailViewerVisible,
    isMultiSelectMode,
    selectedPhotos,
    onRefresh,
    handleLogCare,
    handleAddTag,
    handleAddPhoto,
    handlePhotoPress,
    handleThumbnailPress,
    handleSetThumbnail,
    handlePhotoOptions,
    handleDeleteSelectedPhotos,
    handleDeletePlant,
    handleDeleteCareEvent,
    handleDownloadPhoto,
    toggleMultiSelect,
    togglePhotoSelection,
    closeImageViewer,
    closeThumbnailViewer,
  } = usePlantDetailState(plantId);

  useRealtimeUpdates({});

  const handleOpenFullPage = () => {
    router.push(`/plant/${plantId}`);
  };

  if (loading) {
    return (
      <View style={[styles.panel, style]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Plant Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={[styles.panel, style]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Plant Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.notFoundText}>Plant not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.panel, style]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle} numberOfLines={1}>
          {plant.name || plant.type}
        </Text>
        <View style={styles.panelHeaderActions}>
          <TouchableOpacity
            onPress={handleOpenFullPage}
            style={styles.expandButton}
          >
            <ExternalLink size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.panelContent}>
        <PlantDetailHeader
          plant={plant}
          thumbnailPhoto={thumbnailPhoto}
          onThumbnailPress={handleThumbnailPress}
          onDeletePlant={handleDeletePlant}
        />

        <View style={styles.tagSection}>
          <TagsList
            plantId={plantId}
            onAddTagPress={handleAddTag}
            refreshTrigger={tagRefreshTrigger}
          />
        </View>

        <PlantActionButtons
          onLogCare={handleLogCare}
          onAddPhoto={handleAddPhoto}
          uploadingPhoto={uploadingPhoto}
        />

        {plant.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{plant.notes}</Text>
          </View>
        )}

        <PlantPhotosSection
          photos={typedPhotos}
          thumbnailPhotoId={currentThumbnailId}
          isMultiSelectMode={isMultiSelectMode}
          selectedPhotos={selectedPhotos}
          formattedDates={formattedDates}
          onPhotoPress={handlePhotoPress}
          onPhotoLongPress={handlePhotoOptions}
          onToggleMultiSelect={toggleMultiSelect}
          onTogglePhotoSelection={togglePhotoSelection}
          onDeleteSelectedPhotos={handleDeleteSelectedPhotos}
        />

        <PlantEventsSection
          events={typedEvents}
          eventPhotos={eventPhotos}
          formattedDates={formattedDates}
          onDeleteEvent={handleDeleteCareEvent}
          onPhotoPress={handlePhotoPress}
        />
      </ScrollView>

      <PhotoViewerModal
        key={photoViewerOpenId}
        visible={imageViewerVisible}
        photos={allPhotos}
        currentIndex={currentPhotoIndex}
        currentThumbnailId={currentThumbnailId}
        formattedDates={formattedDates}
        onClose={closeImageViewer}
        onDownload={handleDownloadPhoto}
        onSetThumbnail={handleSetThumbnail}
      />

      <ThumbnailViewerModal
        visible={thumbnailViewerVisible}
        thumbnailPhoto={thumbnailPhoto}
        onClose={closeThumbnailViewer}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    panel: {
      width: 420,
      backgroundColor: theme.colors.background,
      borderLeftWidth: 1,
      borderLeftColor: theme.colors.border,
      ...(Platform.OS === "web" ? { height: "100%" as any } : { flex: 1 }),
    },
    panelHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    panelTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.textPrimary,
      flex: 1,
    },
    panelHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    expandButton: {
      padding: 8,
      borderRadius: 6,
      ...(Platform.OS === "web"
        ? {
            cursor: "pointer" as any,
            transition: "background-color 0.15s ease" as any,
          }
        : {}),
    },
    closeButton: {
      padding: 8,
      borderRadius: 6,
      ...(Platform.OS === "web"
        ? {
            cursor: "pointer" as any,
            transition: "background-color 0.15s ease" as any,
          }
        : {}),
    },
    panelContent: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    notFoundText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    tagSection: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: 10,
      marginTop: 0,
      marginBottom: 10,
      padding: 15,
      borderRadius: 8,
    },
    section: {
      backgroundColor: theme.colors.surface,
      margin: 10,
      marginTop: 0,
      padding: 15,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10,
      color: theme.colors.text,
    },
    notesText: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
  });
