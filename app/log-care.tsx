import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import {
  ChevronRight,
  ChevronDown,
  Camera,
  ImagePlus,
  Sprout,
} from "lucide-react-native";
import DateTimeInput from "../components/DateTimeInput";
import { EventService } from "../services/EventService";
import { PlantService } from "../services/PlantService";
import { PhotoService } from "../services/PhotoService";
import { DateTimeService } from "../services/DateTimeService";
import { Plant, PlantPhoto } from "../types/Plant";
import {
  CareEventType,
  CARE_ACTIONS,
  OBSERVATION_EVENTS,
} from "../constants/careTypes";
import { useGlobalStyles } from "../styles";
import { useTheme } from "../contexts/ThemeContext";
import { useCareStyles } from "../styles/CareStyles";
import { formStyles } from "../styles/FormStyles";
import KeyboardAwareScrollView from "../components/KeyboardAwareScrollView";
import { useCreateEvent, useUpdatePlant } from "../hooks/queries";
import LocationDropdown from "../components/LocationDropdown";
import WebContainer from "../components/WebContainer";
import {
  useModalDismiss,
  useModalParams,
  useModalReplace,
} from "../hooks/useModalNav";
import { useAlert } from "../contexts/AlertContext";

export default function LogCareScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  const careStyles = useCareStyles();
  const { plantId } = useModalParams<{ plantId: string }>();
  const dismiss = useModalDismiss();
  const modalReplace = useModalReplace();
  const { showAlert } = useAlert();
  const createEventMutation = useCreateEvent();
  const updatePlantMutation = useUpdatePlant();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [eventType, setEventType] = useState<CareEventType>("water");
  const [activeTab, setActiveTab] = useState<"care" | "events">("care");
  const [careDateTime, setCareDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [fertilizerStrength, setFertilizerStrength] = useState<
    "1/4" | "1/2" | "1x" | "1.5x" | "2x"
  >("1x");
  const [pestSeverity, setPestSeverity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [plantPhotos, setPlantPhotos] = useState<PlantPhoto[]>([]);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [selectedPlantPhotoIds, setSelectedPlantPhotoIds] = useState<string[]>(
    [],
  );
  const [selectedExistingPhotoIds, setSelectedExistingPhotoIds] = useState<
    string[]
  >([]);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [pickingPhotos, setPickingPhotos] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [newLocation, setNewLocation] = useState("");

  useEffect(() => {
    if (plantId) {
      loadPlant();
      loadPlantPhotos();
    }
  }, [plantId]);

  const loadPlant = async () => {
    try {
      const plantData = await PlantService.getPlantById(plantId!);
      setPlant(plantData);
    } catch (error) {
      console.error("Failed to load plant:", error);
      showAlert("Error", "Failed to load plant information");
    }
  };

  const loadPlantPhotos = async () => {
    try {
      const photos = await PhotoService.getPhotosByPlantId(plantId!);
      setPlantPhotos(photos);
    } catch (error) {
      console.error("Failed to load plant photos:", error);
    }
  };

  const handleTakePhoto = async () => {
    setTakingPhoto(true);
    try {
      const result = await PhotoService.takePhoto();
      if (result) {
        setSelectedPhotos((prev) => [...prev, result.uri]);
      }
    } catch (error) {
      console.error("Failed to take photo:", error);
      showAlert("Error", "Failed to take photo");
    } finally {
      setTakingPhoto(false);
    }
  };

  const handlePickFromLibrary = async () => {
    setPickingPhotos(true);
    try {
      const result = await PhotoService.pickMultiplePhotos();
      if (result) {
        setSelectedPhotos((prev) => [...prev, ...result.map((r) => r.uri)]);
      }
    } catch (error) {
      console.error("Failed to pick photos:", error);
      showAlert("Error", "Failed to pick photos from library");
    } finally {
      setPickingPhotos(false);
    }
  };

  const handlePickFromPlantPhotos = () => {
    if (plantPhotos.length === 0) {
      showAlert(
        "No Photos",
        "This plant doesn't have any photos yet. Take some photos first!",
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

  const handleSave = async () => {
    if (!plantId) {
      showAlert("Error", "No plant selected");
      return;
    }

    if (eventType === "relocation" && !newLocation.trim()) {
      showAlert(
        "Location Required",
        "Please select or enter a new location for this relocation event.",
      );
      return;
    }

    setSaving(true);
    try {
      // First create the event using React Query mutation for cache invalidation
      const event = await createEventMutation.mutateAsync({
        plant_id: plantId,
        event_type: eventType,
        date: careDateTime.toISOString(),
        notes: notes.trim() || undefined,
        fertilizer_concentration:
          eventType === "fertilize" || eventType === "fertigate"
            ? fertilizerStrength
            : undefined,
        pest_severity: eventType === "pest_spotted" ? pestSeverity : undefined,
      });

      // If relocating and a new location was selected, update the plant's location
      if (eventType === "relocation" && newLocation.trim()) {
        await updatePlantMutation.mutateAsync({
          id: plantId,
          updates: { location: newLocation.trim() },
        });
      }

      // Handle photos
      const photoErrors: string[] = [];

      // Save any new photos (from camera/library) if selected
      if (selectedPhotos.length > 0) {
        try {
          await PhotoService.saveMultipleEventPhotos(
            plantId,
            event.id,
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
            await PhotoService.linkPhotoToEvent(photoId, event.id);
          } catch (photoError) {
            console.error(
              `Failed to link photo ${photoId} to event:`,
              photoError,
            );
            photoErrors.push("Some existing photos could not be linked.");
          }
        }
      }

      // Show appropriate success/warning message
      if (photoErrors.length > 0) {
        showAlert(
          "Event Saved",
          `Event was saved successfully, but ${photoErrors.join(" ")} You can add photos later by editing the event.`,
          [{ text: "OK" }],
        );
      }

      setSaving(false);
      dismiss();
    } catch (error) {
      console.error("Failed to log event:", error);
      showAlert("Error", "Failed to log event");
      setSaving(false);
    }
  };

  const allCareTypes = {
    care: CARE_ACTIONS,
    events: OBSERVATION_EVENTS,
  };

  const careTypes = allCareTypes[activeTab];

  const showFertilizerOptions =
    eventType === "fertilize" || eventType === "fertigate";
  const showPestSeverity = eventType === "pest_spotted";

  return (
    <WebContainer>
      <View style={globalStyles.container}>
        <KeyboardAwareScrollView
          extraScrollHeight={100}
          keyboardVerticalOffset={100}
        >
          <View style={globalStyles.form}>
            {/* Plant Info */}
            {plant && (
              <View style={styles.plantInfo}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <Text style={styles.plantType}>{plant.type}</Text>
              </View>
            )}

            {/* Event Type Selection */}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Event Type</Text>

              {/* Tabs */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tab, activeTab === "care" && styles.tabActive]}
                  onPress={() => {
                    setActiveTab("care");
                    setEventType("water");
                    setNewLocation("");
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
                    setNewLocation("");
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
                  // Opens its own form rather than selecting an event type.
                  const opensForm = careType.type === "propagate";
                  return (
                    <TouchableOpacity
                      key={careType.type}
                      accessibilityRole="button"
                      accessibilityHint={
                        opensForm
                          ? `Opens the ${careType.label.toLowerCase()} form`
                          : undefined
                      }
                      style={[
                        styles.careTypeOption,
                        isSelected && styles.careTypeOptionSelected,
                        opensForm && styles.careTypeOptionLink,
                      ]}
                      onPress={() => {
                        // Propagating creates a whole plant, not just an event,
                        // so hand off to the propagate form instead of selecting.
                        if (opensForm) {
                          modalReplace(
                            `/propagate?parentId=${plantId}&date=${encodeURIComponent(
                              careDateTime.toISOString(),
                            )}`,
                          );
                          return;
                        }
                        setEventType(careType.type);
                        if (careType.type !== "relocation") setNewLocation("");
                      }}
                    >
                      {opensForm && (
                        <ChevronRight
                          size={14}
                          color={theme.colors.textSecondary}
                          style={styles.careTypeLinkChevron}
                        />
                      )}
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
            <View style={globalStyles.inputGroup}>
              <View style={styles.whenHeader}>
                <Text style={[globalStyles.label, styles.whenLabel]}>When</Text>
                <TouchableOpacity
                  style={styles.nowButton}
                  onPress={() => setCareDateTime(new Date())}
                  accessibilityRole="button"
                  accessibilityLabel="Set to now"
                >
                  <Text style={styles.nowButtonText}>Now</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateTimeRow}>
                <View style={styles.dateTimeSection}>
                  <DateTimeInput
                    value={careDateTime}
                    mode="date"
                    onChange={(date) => setCareDateTime(date)}
                  />
                </View>
                <View style={styles.dateTimeSection}>
                  <DateTimeInput
                    value={careDateTime}
                    mode="time"
                    onChange={(date) => setCareDateTime(date)}
                  />
                </View>
              </View>
            </View>

            {/* Fertilizer Options (only show for fertilize/fertigate) */}
            {showFertilizerOptions && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Fertilizer Strength</Text>
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
            {showPestSeverity && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>
                  Pest Severity (1-10 scale)
                </Text>
                <Text style={globalStyles.sublabel}>
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

            {/* Relocation - new location picker */}
            {eventType === "relocation" && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>New Location *</Text>
                {plant?.location ? (
                  <Text style={globalStyles.sublabel}>
                    Current location: {plant.location}
                  </Text>
                ) : null}
                <LocationDropdown
                  value={newLocation}
                  onValueChange={setNewLocation}
                  placeholder="Select or enter new location"
                />
              </View>
            )}

            {/* Photos */}
            <View style={[globalStyles.inputGroup, styles.photosSection]}>
              <TouchableOpacity
                style={styles.photosSectionHeader}
                onPress={() => setPhotosExpanded(!photosExpanded)}
              >
                <Text style={globalStyles.label}>Photos (Optional)</Text>
                {photosExpanded ? (
                  <ChevronDown size={18} color={theme.colors.textSecondary} />
                ) : (
                  <ChevronRight size={18} color={theme.colors.textSecondary} />
                )}
              </TouchableOpacity>

              {photosExpanded && (
                <>
                  {/* Photo Action Buttons */}
                  <View style={styles.photoActionContainer}>
                    <TouchableOpacity
                      style={[
                        styles.photoActionButton,
                        takingPhoto && styles.photoActionButtonDisabled,
                      ]}
                      onPress={handleTakePhoto}
                      disabled={takingPhoto}
                    >
                      {takingPhoto ? (
                        <>
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.photoActionText}>Taking...</Text>
                        </>
                      ) : (
                        <>
                          <Camera size={20} color={theme.colors.primary} />
                          <Text style={styles.photoActionText}>Take Photo</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.photoActionButton,
                        pickingPhotos && styles.photoActionButtonDisabled,
                      ]}
                      onPress={handlePickFromLibrary}
                      disabled={pickingPhotos}
                    >
                      {pickingPhotos ? (
                        <>
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.textSecondary}
                          />
                          <Text style={styles.photoActionText}>Picking...</Text>
                        </>
                      ) : (
                        <>
                          <ImagePlus size={20} color={theme.colors.primary} />
                          <Text style={styles.photoActionText}>
                            From Library
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.photoActionButton}
                      onPress={handlePickFromPlantPhotos}
                    >
                      <Sprout size={20} color={theme.colors.primary} />
                      <Text style={styles.photoActionText}>Plant Photos</Text>
                    </TouchableOpacity>
                  </View>

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
                        Existing Photos to Link (
                        {selectedExistingPhotoIds.length})
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.selectedPhotosScroll}
                      >
                        {selectedExistingPhotoIds.map((photoId) => {
                          const photo = plantPhotos.find(
                            (p) => p.id === photoId,
                          );
                          if (!photo) return null;
                          return (
                            <View
                              key={photoId}
                              style={styles.selectedPhotoItem}
                            >
                              <Image
                                source={{
                                  uri: PhotoService.getImageUrl(photo, true),
                                }}
                                style={styles.selectedPhotoImage}
                              />
                              <TouchableOpacity
                                style={styles.removePhotoButton}
                                onPress={() =>
                                  removeSelectedExistingPhoto(photoId)
                                }
                              >
                                <Text style={styles.removePhotoText}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Notes */}
            <View style={[globalStyles.inputGroup, styles.notesSection]}>
              <Text style={globalStyles.label}>Notes</Text>
              <TextInput
                style={globalStyles.inputTextArea}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional notes about this event..."
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && globalStyles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={globalStyles.buttonText}>
                {saving ? "Logging Event..." : "Log Event"}
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
              data={plantPhotos}
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

const createStyles = (theme) =>
  StyleSheet.create({
    plantInfo: { marginBottom: 20, alignItems: 'center', gap: 2 },
    plantName: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
    plantType: { fontSize: 14, color: theme.colors.textSecondary },
    careTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
    careTypeOption: { ...formStyles(theme).tile, width: '31.5%' },
    careTypeOptionSelected: formStyles(theme).tileSelected,
    careTypeOptionLink: {
      borderStyle: "dashed",
      backgroundColor: "transparent",
    },
    careTypeLinkChevron: {
      position: "absolute",
      top: 4,
      right: 4,
    },
    careTypeText: formStyles(theme).tileText,
    careTypeTextSelected: formStyles(theme).tileTextSelected,
    saveButton: { ...formStyles(theme).primaryButton, marginTop: 12 },
    tabContainer: formStyles(theme).segmented,
    tab: formStyles(theme).segment,
    tabActive: formStyles(theme).segmentActive,
    tabText: formStyles(theme).segmentText,
    tabTextActive: formStyles(theme).segmentTextActive,
    dateTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    whenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    whenLabel: { marginBottom: 0 },
    dateTimeSection: { flex: 1 },
    nowButton: { ...formStyles(theme).smallButton, paddingVertical: 5, paddingHorizontal: 12 },
    nowButtonText: formStyles(theme).smallButtonText,
    strengthContainer: { flexDirection: 'row', gap: 8 },
    strengthOption: { ...formStyles(theme).chip, flex: 1, paddingHorizontal: 4 },
    strengthOptionSelected: formStyles(theme).chipSelected,
    strengthText: formStyles(theme).chipText,
    strengthTextSelected: formStyles(theme).chipTextSelected,
    photoActionContainer: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 12 },
    photoActionButton: { flex: 1, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderLight, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', gap: 6 },
    photoActionText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500', textAlign: 'center' },
    photoActionButtonDisabled: {
      opacity: 0.6,
    },
    selectedPhotosContainer: {
      marginTop: 8,
    },
    selectedPhotosLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500', marginBottom: 4 },
    selectedPhotosScroll: {
      maxHeight: 100,
    },
    selectedPhotoItem: {
      position: "relative",
      marginRight: 20,
      paddingTop: 10,
    },
    selectedPhotoImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: theme.colors.surface },
    removePhotoButton: { position: 'absolute', top: 2, right: -8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.background },
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
    modalHeader: formStyles(theme).sheetHeader,
    modalTitle: formStyles(theme).sheetTitle,
    modalCancelButton: { padding: 4 },
    modalCancelText: formStyles(theme).sheetAction,
    modalConfirmButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: theme.colors.primary },
    modalConfirmButtonDisabled: { opacity: 0.4 },
    modalConfirmText: { fontSize: 15, fontWeight: '600', color: theme.colors.textOnPrimary },
    modalConfirmTextDisabled: {},
    photoGrid: { padding: 12 },
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
    photoGridItemSelected: { borderColor: theme.colors.primary },
    photoGridImage: {
      width: "100%",
      height: "100%",
      backgroundColor: theme.colors.surface,
    },
    photoSelectedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.35)', alignItems: 'center', justifyContent: 'center' },
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
    emptyPhotoText: formStyles(theme).empty,
    notesSection: {
      marginTop: 6,
    },
    photosSection: {
      marginBottom: 2,
    },
    photosSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 4,
    },
  });
