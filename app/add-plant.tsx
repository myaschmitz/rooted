import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { PhotoService } from '../services/PhotoService';
import LocationDropdown from '../components/LocationDropdown';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useTheme } from '../contexts/ThemeContext';
import { BaseColors } from '../styles/theme';
import { formStyles } from '../styles/FormStyles';
import { Camera } from 'lucide-react-native';
import { useCreatePlant, useSavePhoto, useCreateEvent } from '../hooks/queries';
import WebContainer from '../components/WebContainer';
import { useModalReplace } from '../hooks/useModalNav';
import { useAlert } from '../contexts/AlertContext';

export default function AddPlantScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const modalReplace = useModalReplace();
  const createPlantMutation = useCreatePlant();
  const savePhotoMutation = useSavePhoto();
  const createEventMutation = useCreateEvent();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [plantPhoto, setPlantPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const styles = createStyles(theme);

  const handleSave = async () => {
    if (!type.trim()) {
      showAlert('Error', 'Please enter plant type');
      return;
    }

    setSaving(true);
    try {
      const newPlant = await createPlantMutation.mutateAsync({
        name: name.trim() || undefined,
        type: type.trim(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // If there's a photo, save it
      if (plantPhoto && newPlant) {
        try {
          await savePhotoMutation.mutateAsync({
            plantId: newPlant.id,
            sourceUri: plantPhoto,
            caption: 'Initial photo'
          });
        } catch (photoError) {
          console.warn('Failed to save photo, but plant was created:', photoError);
        }
      }

      // Create a "plant added" event to track when the plant was added
      if (newPlant) {
        try {
          await createEventMutation.mutateAsync({
            plant_id: newPlant.id,
            event_type: 'other',
            date: new Date().toISOString(),
            notes: 'Plant added to collection'
          });
        } catch (eventError) {
          console.warn('Failed to create plant added event:', eventError);
        }
      }

      // Navigate to the new plant's detail page
      modalReplace(`/plant/${newPlant.id}`);
    } catch (error) {
      console.error('Failed to create plant:', error);
      showAlert('Error', 'Failed to add plant');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = () => {
    setShowPhotoOptions(true);
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await PhotoService.takePhoto();
      if (photo) {
        setPlantPhoto(photo.uri);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      showAlert('Error', 'Failed to take photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const photo = await PhotoService.pickPhoto();
      if (photo) {
        setPlantPhoto(photo.uri);
      }
    } catch (error) {
      console.error('Failed to pick photo:', error);
      showAlert('Error', 'Failed to pick photo');
    }
  };

  const handleRemovePhoto = () => {
    setPlantPhoto(null);
  };


  return (
    <WebContainer>
    <View style={styles.container}>
      <KeyboardAwareScrollView
        extraScrollHeight={100}
        keyboardVerticalOffset={100}
      >
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <TouchableOpacity style={styles.photoContainer} onPress={handleAddPhoto}>
              {plantPhoto ? (
                <View style={styles.photoWrapper}>
                  <Image 
                    source={{ uri: plantPhoto }} 
                    style={styles.plantImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                  <View style={styles.photoButtonsContainer}>
                    <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemovePhoto}>
                      <Text style={styles.removePhotoButtonText}>×</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.changePhotoButton} onPress={handleAddPhoto}>
                      <Camera size={20} color={BaseColors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={30} color={theme.colors.textTertiary} />
                  <Text style={styles.photoPlaceholderSubtext}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., My Monstera (optional)"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Plant Type *</Text>
            <TextInput
              style={styles.input}
              value={type}
              onChangeText={setType}
              placeholder="e.g., Monstera Deliciosa"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <LocationDropdown
              value={location}
              onValueChange={setLocation}
              placeholder="Select or enter location"
            />
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about your plant..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Adding Plant...' : 'Add Plant'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
      {/* Photo Options Modal */}
      <Modal
        visible={showPhotoOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Photo</Text>
            <Text style={styles.modalMessage}>Choose how to add a photo</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => { setShowPhotoOptions(false); handleTakePhoto(); }}
              >
                <Text style={styles.modalButtonTextPrimary}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => { setShowPhotoOptions(false); handlePickPhoto(); }}
              >
                <Text style={styles.modalButtonTextPrimary}>Photo Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowPhotoOptions(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </WebContainer>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: formStyles(theme).screen,
  form: formStyles(theme).form,
  inputGroup: formStyles(theme).inputGroup,
  label: formStyles(theme).label,
  input: formStyles(theme).input,
  notesInput: { minHeight: 104, textAlignVertical: 'top' },
  photoContainer: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  photoWrapper: {
    position: 'relative',
    width: '100%',
  },
  plantImage: {
    width: '100%',
    aspectRatio: 1,
    resizeMode: 'contain',
  },
  photoButtonsContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  changePhotoButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButton: { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 18, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  removePhotoButtonText: {
    color: BaseColors.white,
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  changePhotoText: {
    fontSize: 18,
  },
  photoPlaceholder: { width: '100%', height: 168, backgroundColor: theme.colors.surface, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: theme.colors.border, borderStyle: 'dashed', borderRadius: 16 },
  photoPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoPlaceholderSubtext: { fontSize: 15, fontWeight: '500', color: theme.colors.textSecondary },
  saveButton: { ...formStyles(theme).primaryButton, marginTop: 8, marginBottom: 30 },
  saveButtonDisabled: formStyles(theme).buttonDisabled,
  saveButtonText: formStyles(theme).primaryButtonText,
  modalOverlay: formStyles(theme).dialogOverlay,
  modalContent: formStyles(theme).dialogCard,
  modalTitle: formStyles(theme).dialogTitle,
  modalMessage: formStyles(theme).dialogMessage,
  modalButtons: formStyles(theme).dialogButtons,
  modalButton: formStyles(theme).primaryButton,
  modalButtonTextPrimary: formStyles(theme).primaryButtonText,
  modalButtonCancel: formStyles(theme).secondaryButton,
  modalButtonTextCancel: formStyles(theme).secondaryButtonText,
});
