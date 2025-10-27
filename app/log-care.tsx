import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  ScrollView,
  Modal,
  FlatList,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EventService } from '../services/EventService';
import { PlantService } from '../services/PlantService';
import { PhotoService } from '../services/PhotoService';
import { DateTimeService } from '../services/DateTimeService';
import { Plant, PlantPhoto } from '../types/Plant';
import { useGlobalStyles } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { useCareStyles } from '../styles/CareStyles';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';

export default function LogCareScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  const careStyles = useCareStyles();
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'fertigate' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other'>('water');
  const [activeTab, setActiveTab] = useState<'care' | 'events'>('care');
  const [careDateTime, setCareDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [fertilizerStrength, setFertilizerStrength] = useState<'1/4' | '1/2' | '1x' | '1.5x' | '2x'>('1x');
  const [pestSeverity, setPestSeverity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [plantPhotos, setPlantPhotos] = useState<PlantPhoto[]>([]);
  const [showPhotoPickerModal, setShowPhotoPickerModal] = useState(false);
  const [selectedPlantPhotoIds, setSelectedPlantPhotoIds] = useState<string[]>([]);
  const [selectedExistingPhotoIds, setSelectedExistingPhotoIds] = useState<string[]>([]);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [pickingPhotos, setPickingPhotos] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);

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
      console.error('Failed to load plant:', error);
      Alert.alert('Error', 'Failed to load plant information');
    }
  };

  const loadPlantPhotos = async () => {
    try {
      const photos = await PhotoService.getPhotosByPlantId(plantId!);
      setPlantPhotos(photos);
    } catch (error) {
      console.error('Failed to load plant photos:', error);
    }
  };

  const handleTakePhoto = async () => {
    setTakingPhoto(true);
    try {
      const result = await PhotoService.takePhoto();
      if (result) {
        setSelectedPhotos(prev => [...prev, result.uri]);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setTakingPhoto(false);
    }
  };

  const handlePickFromLibrary = async () => {
    setPickingPhotos(true);
    try {
      const result = await PhotoService.pickMultiplePhotos();
      if (result) {
        setSelectedPhotos(prev => [...prev, ...result.map(r => r.uri)]);
      }
    } catch (error) {
      console.error('Failed to pick photos:', error);
      Alert.alert('Error', 'Failed to pick photos from library');
    } finally {
      setPickingPhotos(false);
    }
  };

  const handlePickFromPlantPhotos = () => {
    if (plantPhotos.length === 0) {
      Alert.alert('No Photos', 'This plant doesn\'t have any photos yet. Take some photos first!');
      return;
    }
    setSelectedPlantPhotoIds([]);
    setShowPhotoPickerModal(true);
  };

  const togglePlantPhotoSelection = (photoId: string) => {
    setSelectedPlantPhotoIds(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const confirmPlantPhotoSelection = () => {
    // Store the photo IDs instead of URLs for existing photos
    setSelectedExistingPhotoIds(prev => [...prev, ...selectedPlantPhotoIds]);
    setShowPhotoPickerModal(false);
    setSelectedPlantPhotoIds([]);
  };

  const cancelPlantPhotoSelection = () => {
    setShowPhotoPickerModal(false);
    setSelectedPlantPhotoIds([]);
  };

  const removeSelectedPhoto = (photoUri: string) => {
    setSelectedPhotos(prev => prev.filter(uri => uri !== photoUri));
  };

  const removeSelectedExistingPhoto = (photoId: string) => {
    setSelectedExistingPhotoIds(prev => prev.filter(id => id !== photoId));
  };

  const handleSave = async () => {
    if (!plantId) {
      Alert.alert('Error', 'No plant selected');
      return;
    }

    setSaving(true);
    try {
      // First create the event
      const event = await EventService.createEvent({
        plant_id: plantId,
        event_type: eventType,
        date: careDateTime.toISOString(),
        notes: notes.trim() || undefined,
        fertilizer_concentration: (eventType === 'fertilize' || eventType === 'fertigate') ? fertilizerStrength : undefined,
        pest_severity: eventType === 'pest_spotted' ? pestSeverity : undefined,
      });

      // Handle photos
      const photoErrors: string[] = [];

      // Save any new photos (from camera/library) if selected
      if (selectedPhotos.length > 0) {
        try {
          await PhotoService.saveMultipleEventPhotos(plantId, event.id, selectedPhotos);
        } catch (photoError) {
          console.error('Failed to save new photos:', photoError);
          photoErrors.push('Some new photos could not be saved.');
        }
      }

      // Link any existing plant photos to this event
      if (selectedExistingPhotoIds.length > 0) {
        for (const photoId of selectedExistingPhotoIds) {
          try {
            await PhotoService.linkPhotoToEvent(photoId, event.id);
          } catch (photoError) {
            console.error(`Failed to link photo ${photoId} to event:`, photoError);
            photoErrors.push('Some existing photos could not be linked.');
          }
        }
      }

      // Show appropriate success/warning message
      if (photoErrors.length > 0) {
        Alert.alert(
          'Event Saved',
          `Event was saved successfully, but ${photoErrors.join(' ')} You can add photos later by editing the event.`,
          [{ text: 'OK' }]
        );
      }

      setSaving(false);
      router.back();
    } catch (error) {
      console.error('Failed to log event:', error);
      Alert.alert('Error', 'Failed to log event');
      setSaving(false);
    }
  };

  const allCareTypes = {
    care: [
      { value: 'water', label: 'Water', icon: '💧' },
      { value: 'fertilize', label: 'Fertilize', icon: '🌱' },
      { value: 'fertigate', label: 'Fertigate', icon: '💧🌱' },
      { value: 'repot', label: 'Repot', icon: '🪴' },
      { value: 'prune', label: 'Prune', icon: '✂️' },
      { value: 'insecticide_spray', label: 'Insecticide', icon: '🧴' },
    ],
    events: [
      { value: 'pest_spotted', label: 'Pest Spotted', icon: '🐛' },
      { value: 'new_leaf', label: 'New Leaf', icon: '🍃' },
      { value: 'relocation', label: 'Relocation', icon: '📦' },
      { value: 'new_roots_spotted', label: 'New Roots', icon: '🌿' },
      { value: 'other', label: 'Other', icon: '📝' },
    ],
  } as const;

  const careTypes = allCareTypes[activeTab];

  const showFertilizerOptions = eventType === 'fertilize' || eventType === 'fertigate';
  const showPestSeverity = eventType === 'pest_spotted';

  return (
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
                style={[
                  styles.tab,
                  activeTab === 'care' && styles.tabActive,
                ]}
                onPress={() => {
                  setActiveTab('care');
                  setEventType('water');
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'care' && styles.tabTextActive,
                  ]}
                >
                  Care
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeTab === 'events' && styles.tabActive,
                ]}
                onPress={() => {
                  setActiveTab('events');
                  setEventType('pest_spotted');
                }}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === 'events' && styles.tabTextActive,
                  ]}
                >
                  Events
                </Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.careTypeGrid}>
              {careTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.careTypeOption,
                    eventType === type.value && styles.careTypeOptionSelected,
                  ]}
                  onPress={() => setEventType(type.value)}
                >
                  <Text style={styles.careTypeIcon}>{type.icon}</Text>
                  <Text
                    style={[
                      styles.careTypeText,
                      eventType === type.value && styles.careTypeTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date and Time */}
          <View style={globalStyles.inputGroup}>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeSection}>
                <Text style={globalStyles.label}>Date</Text>
                <DateTimePicker
                  value={careDateTime}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setCareDateTime(selectedDate);
                    }
                  }}
                />
              </View>
              <View style={styles.dateTimeSection}>
                <Text style={globalStyles.label}>Time</Text>
                <DateTimePicker
                  value={careDateTime}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    if (selectedTime) {
                      setCareDateTime(selectedTime);
                    }
                  }}
                />
              </View>
              <View style={styles.buttonSection}>
                <TouchableOpacity
                  style={styles.nowButton}
                  onPress={() => {
                    setCareDateTime(new Date());
                  }}
                >
                  <Text style={styles.nowButtonText}>Set to Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Fertilizer Options (only show for fertilize/fertigate) */}
          {showFertilizerOptions && (
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Fertilizer Strength</Text>
              <View style={styles.strengthContainer}>
                {['1/4', '1/2', '1x', '1.5x', '2x'].map((strength) => (
                  <TouchableOpacity
                    key={strength}
                    style={[
                      styles.strengthOption,
                      fertilizerStrength === strength && styles.strengthOptionSelected,
                    ]}
                    onPress={() => setFertilizerStrength(strength as '1/4' | '1/2' | '1x' | '1.5x' | '2x')}
                  >
                    <Text
                      style={[
                        styles.strengthText,
                        fertilizerStrength === strength && styles.strengthTextSelected,
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
              <Text style={globalStyles.label}>Pest Severity (1-10 scale)</Text>
              <Text style={globalStyles.sublabel}>1 = Minor issue, 10 = Severe infestation</Text>
              <View style={careStyles.severityContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      careStyles.severityButton,
                      pestSeverity === severity && careStyles.severityButtonSelected,
                      pestSeverity === severity 
                        ? (severity <= 3 && careStyles.severityLowSelected) ||
                          (severity >= 4 && severity <= 6 && careStyles.severityMediumSelected) ||
                          (severity >= 7 && careStyles.severityHighSelected)
                        : (severity <= 3 && careStyles.severityLow) ||
                          (severity >= 4 && severity <= 6 && careStyles.severityMedium) ||
                          (severity >= 7 && careStyles.severityHigh),
                    ]}
                    onPress={() => setPestSeverity(severity)}
                  >
                    <Text
                      style={[
                        careStyles.severityText,
                        pestSeverity === severity && careStyles.severityTextSelected,
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
          <View style={[globalStyles.inputGroup, styles.photosSection]}>
            <TouchableOpacity 
              style={styles.photosSectionHeader}
              onPress={() => setPhotosExpanded(!photosExpanded)}
            >
              <Text style={globalStyles.label}>Photos (Optional)</Text>
              <Text style={styles.expandIcon}>
                {photosExpanded ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            
            {photosExpanded && (
              <>
                {/* Photo Action Buttons */}
                <View style={styles.photoActionContainer}>
              <TouchableOpacity
                style={[styles.photoActionButton, takingPhoto && styles.photoActionButtonDisabled]}
                onPress={handleTakePhoto}
                disabled={takingPhoto}
              >
                {takingPhoto ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    <Text style={styles.photoActionText}>Taking...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.photoActionIcon}>📸</Text>
                    <Text style={styles.photoActionText}>Take Photo</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.photoActionButton, pickingPhotos && styles.photoActionButtonDisabled]}
                onPress={handlePickFromLibrary}
                disabled={pickingPhotos}
              >
                {pickingPhotos ? (
                  <>
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    <Text style={styles.photoActionText}>Picking...</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.photoActionIcon}>🖼️</Text>
                    <Text style={styles.photoActionText}>From Library</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={handlePickFromPlantPhotos}
              >
                <Text style={styles.photoActionIcon}>🌱</Text>
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
                      <Image source={{ uri: photoUri }} style={styles.selectedPhotoImage} />
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
                    const photo = plantPhotos.find(p => p.id === photoId);
                    if (!photo) return null;
                    return (
                      <View key={photoId} style={styles.selectedPhotoItem}>
                        <Image 
                          source={{ uri: PhotoService.getImageUrl(photo, true) }} 
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
              {saving ? 'Logging Event...' : 'Log Event'}
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
                selectedPlantPhotoIds.length === 0 && styles.modalConfirmButtonDisabled
              ]}
              onPress={confirmPlantPhotoSelection}
              disabled={selectedPlantPhotoIds.length === 0}
            >
              <Text style={[
                styles.modalConfirmText,
                selectedPlantPhotoIds.length === 0 && styles.modalConfirmTextDisabled
              ]}>
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
                  selectedPlantPhotoIds.includes(photo.id) && styles.photoGridItemSelected
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
  );
}

const createStyles = (theme) => StyleSheet.create({
  plantInfo: {
    marginBottom: 20,
    alignItems: 'center',
  },
  plantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  plantType: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  careTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  careTypeOption: {
    width: '30%',
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  careTypeTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  dateTimeButton: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  dateTimeText: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  saveButton: {
    ...useGlobalStyles().buttonLarge,
    marginTop: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: theme.colors.background,
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeSection: {
    flex: 1,
    marginHorizontal: 4,
  },
  dateTimeLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  buttonSection: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 26,
  },
  nowButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  nowButtonText: {
    color: theme.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  strengthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    marginHorizontal: 4,
  },
  strengthOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  strengthTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  photoActionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    marginHorizontal: 4,
  },
  photoActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  photoActionText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  photoActionButtonDisabled: {
    opacity: 0.6,
  },
  selectedPhotosContainer: {
    marginTop: 8,
  },
  selectedPhotosLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 8,
  },
  selectedPhotosScroll: {
    maxHeight: 100,
  },
  selectedPhotoItem: {
    position: 'relative',
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
    position: 'absolute',
    top: 0,
    right: -8,
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 50,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: Dimensions.get('window').width / 3 - 16,
  },
  photoGridItemSelected: {
    borderColor: theme.colors.primary,
  },
  photoGridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surface,
  },
  photoSelectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSelectedIcon: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyPhotoList: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyPhotoText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  notesSection: {
    marginTop: 6,
  },
  photosSection: {
    marginBottom: 8,
  },
  photosSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  expandIcon: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
});


