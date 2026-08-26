import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { useRealtimeUpdates } from "../../hooks/useRealtimeUpdates";
import { usePlantDetailState } from "../../hooks/usePlantDetailState";
import TagsList from "../../components/TagsList";
import WebContainer from "../../components/WebContainer";
import WebBreadcrumb from "../../components/WebBreadcrumb";
import {
  PlantDetailHeader,
  PlantActionButtons,
  PlantPhotosSection,
  PlantCalendarSection,
  PlantLineageSection,
  PhotoViewerModal,
  ThumbnailViewerModal,
} from "../../components/plant-detail";

export default function PlantDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tagRefreshTrigger, setTagRefreshTrigger] = useState(0);

  const {
    // Data
    plant,
    typedEvents,
    typedPhotos,
    allPhotos,
    thumbnailPhoto,
    eventPhotos,
    formattedDates,
    currentThumbnailId,
    lineage,

    // Loading states
    loading,
    refreshing,
    uploadingPhoto,
    lineageLoading,

    // UI state
    imageViewerVisible,
    currentPhotoIndex,
    photoViewerOpenId,
    thumbnailViewerVisible,
    isMultiSelectMode,
    selectedPhotos,

    // Handlers
    onRefresh,
    handleLogCare,
    handleAddTag,
    handlePropagate,
    handleLinkParent,
    handleLinkChild,
    handleUnlinkParent,
    handleOpenPlant,
    handleAddPhoto,
    handlePhotoPress,
    handleThumbnailPress,
    handleSetThumbnail,
    handlePhotoOptions,
    handleDeleteSelectedPhotos,
    handleDeletePlant,
    handleArchivePlant,
    handleDeleteCareEvent,
    handleDownloadPhoto,
    toggleMultiSelect,
    togglePhotoSelection,
    closeImageViewer,
    closeThumbnailViewer,
  } = usePlantDetailState(id!);

  // Set up real-time subscriptions
  useRealtimeUpdates({});

  // Refresh tags when screen comes back into focus
  useFocusEffect(
    useCallback(() => {
      setTagRefreshTrigger((prev) => prev + 1);
    }, []),
  );

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!plant) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Text style={{ color: theme.colors.text }}>Plant not found</Text>
      </View>
    );
  }

  return (
    <WebContainer>
      <View style={{ flex: 1 }}>
        <WebBreadcrumb
          items={[
            { label: "My Plants", href: "/" },
            { label: plant.name || plant.type || "Plant Details" },
          ]}
        />
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <PlantDetailHeader
            plant={plant}
            thumbnailPhoto={thumbnailPhoto}
            onThumbnailPress={handleThumbnailPress}
            onDeletePlant={handleDeletePlant}
            onArchivePlant={handleArchivePlant}
          />

          <View style={styles.tagSection}>
            <TagsList
              plantId={id!}
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

          <PlantLineageSection
            lineage={lineage}
            loading={lineageLoading}
            onPropagate={handlePropagate}
            onPlantPress={handleOpenPlant}
            onLinkParent={handleLinkParent}
            onLinkChild={handleLinkChild}
            onUnlinkParent={handleUnlinkParent}
          />

          <PlantPhotosSection            photos={typedPhotos}
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

          <PlantCalendarSection
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
    </WebContainer>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
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
