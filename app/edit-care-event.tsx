import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
} from "react-native";
import DateTimeInput from "../components/DateTimeInput";
import { EventService } from "../services/EventService";
import { PhotoService } from "../services/PhotoService";
import { Event, PlantPhoto } from "../types/Plant";
import {
  CareEventType,
  CARE_ACTIONS,
  OBSERVATION_EVENTS,
} from "../constants/careTypes";
import { useTheme } from "../contexts/ThemeContext";
import { useCareStyles } from "../styles/CareStyles";
import KeyboardAwareScrollView from "../components/KeyboardAwareScrollView";
import { useUpdateEvent } from "../hooks/queries";
import WebContainer from "../components/WebContainer";
import { useModalDismiss, useModalParams } from "../hooks/useModalNav";
import { useAlert } from "../contexts/AlertContext";

export default function EditCareEventScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const careStyles = useCareStyles();
  const { id } = useModalParams<{ id: string }>();
  const dismiss = useModalDismiss();
  const updateEventMutation = useUpdateEvent();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventType, setEventType] = useState<CareEventType>("water");
  const [eventDate, setEventDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [fertilizerStrength, setFertilizerStrength] = useState<
    "1/4" | "1/2" | "1x" | "1.5x" | "2x"
  >("1x");
  const [pestSeverity, setPestSeverity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"care" | "events">("care");
  const [eventPhotos, setEventPhotos] = useState<PlantPhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [plantPhotos, setPlantPhotos] = useState<PlantPhoto[]>([]);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [selectedPlantPhotoIds, setSelectedPlantPhotoIds] = useState<string[]>(
    [],
  );
  const [selectedExistingPhotoIds, setSelectedExistingPhotoIds] = useState<
    string[]
  >([]);

  const styles = createStyles(theme);

  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    if (!id) return;

    try {
      const eventData = await EventService.getEventById(id);
      if (eventData) {
        setEvent(eventData);
        setEventType(eventData.event_type);
        setEventDate(new Date(eventData.date));
        setNotes(eventData.notes || "");
        setFertilizerStrength(
          (eventData.fertilizer_concentration as
            | "1/4"
            | "1/2"
            | "1x"
            | "1.5x"
            | "2x") || "1x",
        );
        setPestSeverity(eventData.pest_severity || 1);

        // Set the correct tab based on event type
        const observationEventTypes = OBSERVATION_EVENTS.map((e) => e.type);
        setActiveTab(
          observationEventTypes.includes(eventData.event_type)
            ? "events"
            : "care",
        );

        // Load existing event photos
        await loadEventPhotos(id);

        // Load plant photos for selection
        if (eventData.plant_id) {
          await loadPlantPhotos(eventData.plant_id);
        }
      }
    } catch (error) {
      console.error("Failed to load event:", error);
      showAlert("Error", "Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  const loadEventPhotos = async (eventId: string) => {
    try {
      const photos = await PhotoService.getPhotosByEventId(eventId);
      setEventPhotos(photos);
    } catch (error) {
      console.error("Failed to load event photos:", error);
    }
  };

  const loadPlantPhotos = async (plantId: string) => {
    try {
      const photos = await PhotoService.getPhotosByPlantId(plantId);
      setPlantPhotos(photos);
    } catch (error) {
      console.error("Failed to load plant photos:", error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const result = await PhotoService.takePhoto();
      if (result) {
        setSelectedPhotos((prev) => [...prev, result.uri]);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      showAlert("Error", "Failed to take photo");
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const result = await PhotoService.pickMultiplePhotos();
      if (result) {
        setSelectedPhotos((prev) => [...prev, ...result.map((r) => r.uri)]);
      }
    } catch (error) {
      console.error("Failed to pick photos:", error);
      showAlert("Error", "Failed to pick photos from library");
    }
  };

  const handlePickFromPlantPhotos = () => {
    const availablePhotos = plantPhotos.filter(
      (photo) => !eventPhotos.some((eventPhoto) => eventPhoto.id === photo.id),
    );
    if (availablePhotos.length === 0) {
      showAlert(
        "No Photos",
        "This plant doesn't have any unlinked photos. All photos are already attached to this event.",
      );
      return;
    }
    setSelectedPlantPhotoIds([]);
    setShowPhotoPickerModal(true);
  };

  const togglePlantPhotoSelection = (photoId: string) => {
    setSelectedPlantPhotoIds((prev) =>
      prev.includes(photoId)
        ? prev.filter((id) => id !== photoId)
        : [...prev, photoId],
    );
  };

  const confirmPlantPhotoSelection = () => {
    // Store the photo IDs instead of URLs for existing photos
    setSelectedExistingPhotoIds((prev) => [...prev, ...selectedPlantPhotoIds]);
    setShowPhotoPickerModal(false);
    setSelectedPlantPhotoIds([]);
  };

  const cancelPlantPhotoSelection = () => {
    setShowPhotoPickerModal(false);
    setSelectedPlantPhotoIds([]);
  };

  const removeSelectedPhoto = (photoUri: string) => {
    setSelectedPhotos((prev) => prev.filter((uri) => uri !== photoUri));
  };

  const removeSelectedExistingPhoto = (photoId: string) => {
    setSelectedExistingPhotoIds((prev) => prev.filter((id) => id !== photoId));
  };

  const removeEventPhoto = async (photoId: string) => {
    try {
      await PhotoService.unlinkPhotoFromEvent(photoId);
      setEventPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (error) {
      console.error("Failed to remove photo from event:", error);
      showAlert("Error", "Failed to remove photo from event");
    }
  };

  const handleSave = async () => {
    if (!id || !event) return;

    setSaving(true);
    try {
      // Update the event
      await updateEventMutation.mutateAsync({
        id,
        updates: {
          event_type: eventType,
          date: eventDate.toISOString(),
          notes: notes.trim() || undefined,
          fertilizer_concentration:
            eventType === "fertilize" || eventType === "fertigate"
              ? fertilizerStrength
              : undefined,
          pest_severity:
            eventType === "pest_spotted" ? pestSeverity : undefined,
        },
      });

      // Handle new photos and existing photos separately
      const photoErrors: string[] = [];

      // Save any new photos (from camera/library) if selected
      if (selectedPhotos.length > 0) {
        try {
          await PhotoService.saveMultipleEventPhotos(
            event.plant_id,
            id,
            selectedPhotos,
          );
        } catch (photoError) {
          console.error("Failed to save new photos:", photoError);
          photoErrors.push("Some new photos could not be saved.");
        }
      }

      // Link any existing plant photos to this event
      if (selectedExistingPhotoIds.length > 0) {
        for (const photoId of selectedExistingPhotoIds) {
          try {
            await PhotoService.linkPhotoToEvent(photoId, id);
          } catch (photoError) {
            console.error(
              `Failed to link photo ${photoId} to event:`,
              photoError,
            );
            photoErrors.push("Some existing photos could not be linked.");
          }
        }
      }

      // Show error alert if there were photo issues
      if (photoErrors.length > 0) {
        showAlert(
          "Event Updated",
          `Event was updated successfully, but ${photoErrors.join(" ")}`,
          [{ text: "OK" }],
        );
      }

      dismiss();
    } catch (error) {
      console.error("Failed to update event:", error);
      showAlert("Error", "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  const allCareTypes = {
    care: CARE_ACTIONS,
    events: OBSERVATION_EVENTS,
  };

  const careTypes = allCareTypes[activeTab];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>Event not found</Text>
      </View>
    );
  }

  return (
    <WebContainer>
      <View style={styles.container}>
        <KeyboardAwareScrollView
          extraScrollHeight={100}
          keyboardVerticalOffset={100}
        >
          <View style={styles.form}>
            {/* Event Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Event Type</Text>

              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === "care" && styles.tabActive]}
                  onPress={() => {
                    setActiveTab("care");
                    setEventType("water");
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "care" && styles.tabTextActive,
                    ]}
                  >
                    Care
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "events" && styles.tabActive,
                  ]}
                  onPress={() => {
                    setActiveTab("events");
                    setEventType("pest_spotted");
                  }}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === "events" && styles.tabTextActive,
                    ]}
                  >
                    Events
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.careTypeGrid}>
                {careTypes.map((careType) => {
                  const Icon = careType.icon;
                  const isSelected = eventType === careType.type;
                  return (
                    <TouchableOpacity
                      key={careType.type}
                      style={[
                        styles.careTypeOption,
                        isSelected && styles.careTypeOptionSelected,
                      ]}
                      onPress={() => setEventType(careType.type)}
                    >
                      <Icon
                        size={24}
                        color={
                          isSelected ? theme.colors.primary : careType.color
                        }
                      />
                      <Text
                        style={[
                          styles.careTypeText,
                          isSelected && styles.careTypeTextSelected,
                        ]}
                      >
                        {careType.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date and Time */}
            <View style={styles.inputGroup}>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeSection}>
                  <DateTimeInput
                    value={eventDate}
                    mode="date"
                    label="Date"
                    onChange={(date) => setEventDate(date)}
                  />
                </View>
                <View style={styles.dateTimeSection}>
                  <DateTimeInput
                    value={eventDate}
                    mode="time"
                    label="Time"
                    onChange={(date) => setEventDate(date)}
                  />
                </View>
                <View style={styles.buttonSection}>
                  <TouchableOpacity
                    style={styles.nowButton}
                    onPress={() => {
                      setEventDate(new Date());
                    }}
                  >
                    <Text style={styles.nowButtonText}>Set to Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Fertilizer Details (only show if fertilizing) */}
            {(eventType === "fertilize" || eventType === "fertigate") && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fertilizer Strength</Text>
                <View style={styles.strengthContainer}>
                  {["1/4", "1/2", "1x", "1.5x", "2x"].map((strength) => (
                    <TouchableOpacity
                      key={strength}
                      style={[
                        styles.strengthOption,
                        fertilizerStrength === strength &&
                          styles.strengthOptionSelected,
                      ]}
                      onPress={() =>
                        setFertilizerStrength(
                          strength as "1/4" | "1/2" | "1x" | "1.5x" | "2x",
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.strengthText,
                          fertilizerStrength === strength &&
                            styles.strengthTextSelected,
                        ]}
                      >
                        {strength}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Pest Severity (only show for pest_spotted) */}
            {eventType === "pest_spotted" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Pest Severity (1-10 scale)</Text>
                <Text style={styles.sublabel}>
                  1 = Minor issue, 10 = Severe infestation
                </Text>
                <View style={careStyles.severityContainer}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((severity) => (
                    <TouchableOpacity
                      key={severity}
                      style={[
                        careStyles.severityButton,
                        pestSeverity === severity &&
                          careStyles.severityButtonSelected,
                        pestSeverity === severity
                          ? (severity <= 3 && careStyles.severityLowSelected) ||
                            (severity >= 4 &&
                              severity <= 6 &&
                              careStyles.severityMediumSelected) ||
                            (severity >= 7 && careStyles.severityHighSelected)
                          : (severity <= 3 && careStyles.severityLow) ||
                            (severity >= 4 &&
                              severity <= 6 &&
                              careStyles.severityMedium) ||
                            (severity >= 7 && careStyles.severityHigh),
                      ]}
                      onPress={() => setPestSeverity(severity)}
                    >
                      <Text
                        style={[
                          careStyles.severityText,
                          pestSeverity === severity &&
                            careStyles.severityTextSelected,
                        ]}
                      >
                        {severity}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Photos */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Photos</Text>

              {/* Photo Action Buttons */}
              <View style={styles.photoActionContainer}>
                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handleTakePhoto}
                >
                  <Text style={styles.photoActionIcon}>📸</Text>
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handlePickFromLibrary}
                >
                  <Text style={styles.photoActionIcon}>🖼️</Text>
                  <Text style={styles.photoActionText}>From Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoActionButton}
                  onPress={handlePickFromPlantPhotos}
                >
                  <Text style={styles.photoActionIcon}>🌱</Text>
                  <Text style={styles.photoActionText}>Plant Photos</Text>
                </TouchableOpacity>
              </View>

              {/* Existing Event Photos */}
              {eventPhotos.length > 0 && (
                <View style={styles.existingPhotosContainer}>
                  <Text style={styles.existingPhotosLabel}>
                    Current Photos ({eventPhotos.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.existingPhotosScroll}
                  >
                    {eventPhotos.map((photo) => (
                      <View key={photo.id} style={styles.existingPhotoItem}>
                        <Image
                          source={{
                            uri: PhotoService.getImageUrl(photo, true),
                          }}
                          style={styles.existingPhotoImage}
                        />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removeEventPhoto(photo.id)}
                        >
                          <Text style={styles.removePhotoText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* New Selected Photos Display */}
              {selectedPhotos.length > 0 && (
                <View style={styles.selectedPhotosContainer}>
                  <Text style={styles.selectedPhotosLabel}>
                    New Photos to Add ({selectedPhotos.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.selectedPhotosScroll}
                  >
                    {selectedPhotos.map((photoUri, index) => (
                      <View key={index} style={styles.selectedPhotoItem}>
                        <Image
                          source={{ uri: photoUri }}
                          style={styles.selectedPhotoImage}
                        />
                        <TouchableOpacity
                          style={styles.removePhotoButton}
                          onPress={() => removeSelectedPhoto(photoUri)}
                        >
                          <Text style={styles.removePhotoText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selected Existing Photos Display */}
              {selectedExistingPhotoIds.length > 0 && (
                <View style={styles.selectedPhotosContainer}>
                  <Text style={styles.selectedPhotosLabel}>
                    Existing Photos to Link ({selectedExistingPhotoIds.length})
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.selectedPhotosScroll}
                  >
                    {selectedExistingPhotoIds.map((photoId) => {
                      const photo = plantPhotos.find((p) => p.id === photoId);
                      if (!photo) return null;
                      return (
                        <View key={photoId} style={styles.selectedPhotoItem}>
                          <Image
                            source={{
                              uri: PhotoService.getImageUrl(photo, true),
                            }}
                            style={styles.selectedPhotoImage}
                          />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={() => removeSelectedExistingPhoto(photoId)}
                          >
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes about this event..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Updating..." : "Update Event"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAwareScrollView>

        {/* Plant Photo Picker Modal */}
        <Modal
          visible={showPhotoPickerModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={cancelPlantPhotoSelection}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select Plant Photos</Text>
              <TouchableOpacity
                style={[
                  styles.modalConfirmButton,
                  selectedPlantPhotoIds.length === 0 &&
                    styles.modalConfirmButtonDisabled,
                ]}
                onPress={confirmPlantPhotoSelection}
                disabled={selectedPlantPhotoIds.length === 0}
              >
                <Text
                  style={[
                    styles.modalConfirmText,
                    selectedPlantPhotoIds.length === 0 &&
                      styles.modalConfirmTextDisabled,
                  ]}
                >
                  Add ({selectedPlantPhotoIds.length})
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={plantPhotos.filter(
                (photo) =>
                  // Exclude photos already linked to this event
                  !eventPhotos.some((eventPhoto) => eventPhoto.id === photo.id),
              )}
              numColumns={3}
              contentContainerStyle={styles.photoGrid}
              renderItem={({ item: photo }) => (
                <TouchableOpacity
                  style={[
                    styles.photoGridItem,
                    selectedPlantPhotoIds.includes(photo.id) &&
                      styles.photoGridItemSelected,
                  ]}
                  onPress={() => togglePlantPhotoSelection(photo.id)}
                >
                  <Image
                    source={{ uri: PhotoService.getImageUrl(photo, true) }}
                    style={styles.photoGridImage}
                  />
                  {selectedPlantPhotoIds.includes(photo.id) && (
                    <View style={styles.photoSelectedOverlay}>
                      <Text style={styles.photoSelectedIcon}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <View style={styles.emptyPhotoList}>
                  <Text style={styles.emptyPhotoText}>No photos available</Text>
                </View>
              }
            />
          </View>
        </Modal>
      </View>
    </WebContainer>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    form: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 8,
      color: theme.colors.text,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      color: theme.colors.text,
    },
    notesInput: {
      minHeight: 100,
    },
    optionsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    optionButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      minWidth: 100,
      flexDirection: "row",
      justifyContent: "center",
    },
    optionButtonSelected: {
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.primary,
      borderWidth: 2,
    },
    optionEmoji: {
      fontSize: 18,
      marginRight: 6,
    },
    optionText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    optionTextSelected: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      padding: 18,
      alignItems: "center",
      marginTop: 20,
    },
    saveButtonDisabled: {
      backgroundColor: theme.colors.disabled,
    },
    saveButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: 18,
      fontWeight: "bold",
    },
    sublabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 10,
      fontStyle: "italic",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    strengthContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
    },
    strengthOption: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 8,
      alignItems: "center",
      marginHorizontal: 4,
    },
    strengthOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    strengthText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.textSecondary,
    },
    strengthTextSelected: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    dateTimeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    dateTimeSection: {
      flex: 1,
      marginRight: 8,
    },
    buttonSection: {
      justifyContent: "flex-end",
      marginLeft: 8,
    },
    nowButton: {
      backgroundColor: theme.colors.secondary,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: "center",
    },
    nowButtonText: {
      color: theme.colors.textOnSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    tabContainer: {
      flexDirection: "row",
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 4,
      marginBottom: 16,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      alignItems: "center",
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.textSecondary,
    },
    tabTextActive: {
      color: theme.colors.background,
      fontWeight: "bold",
    },
    careTypeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    careTypeOption: {
      width: "30%",
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.border,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      padding: 8,
    },
    careTypeOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primaryLight,
    },
    careTypeIcon: {
      fontSize: 24,
    },
    careTypeText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginTop: 8,
      textAlign: "center",
    },
    careTypeTextSelected: {
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    photoActionContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 8,
      marginBottom: 16,
    },
    photoActionButton: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 8,
      padding: 12,
      alignItems: "center",
      marginHorizontal: 4,
    },
    photoActionIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    photoActionText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      textAlign: "center",
    },
    existingPhotosContainer: {
      marginBottom: 16,
    },
    existingPhotosLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginBottom: 8,
    },
    existingPhotosScroll: {
      maxHeight: 100,
    },
    existingPhotoItem: {
      position: "relative",
      marginRight: 20,
      paddingTop: 10,
    },
    existingPhotoImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    selectedPhotosContainer: {
      marginTop: 8,
      paddingTop: 12,
    },
    selectedPhotosLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: "500",
      marginBottom: 8,
    },
    selectedPhotosScroll: {
      maxHeight: 100,
    },
    selectedPhotoItem: {
      position: "relative",
      marginRight: 20,
      paddingTop: 10,
    },
    selectedPhotoImage: {
      width: 80,
      height: 80,
      borderRadius: 8,
      backgroundColor: theme.colors.surface,
    },
    removePhotoButton: {
      position: "absolute",
      top: 0,
      right: -8,
      backgroundColor: theme.colors.error,
      borderRadius: 12,
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    removePhotoText: {
      color: "white",
      fontSize: 12,
      fontWeight: "bold",
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
      paddingTop: 50,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.textPrimary,
    },
    modalCancelButton: {
      padding: 8,
    },
    modalCancelText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    modalConfirmButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    modalConfirmButtonDisabled: {
      backgroundColor: theme.colors.disabled,
    },
    modalConfirmText: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.background,
    },
    modalConfirmTextDisabled: {
      color: theme.colors.textSecondary,
    },
    photoGrid: {
      padding: 20,
    },
    photoGridItem: {
      flex: 1,
      aspectRatio: 1,
      margin: 4,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: 2,
      borderColor: "transparent",
      maxWidth: Dimensions.get("window").width / 3 - 16,
    },
    photoGridItemSelected: {
      borderColor: theme.colors.primary,
    },
    photoGridImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.surface,
    },
    photoSelectedOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      alignItems: "center",
      justifyContent: "center",
    },
    photoSelectedIcon: {
      color: "white",
      fontSize: 24,
      fontWeight: "bold",
    },
    emptyPhotoList: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyPhotoText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
  });
