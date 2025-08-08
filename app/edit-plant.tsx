import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PlantService } from '../services/PlantService';
import { PhotoService } from '../services/PhotoService';
import { Plant } from '../types/Plant';
import LocationDropdown from '../components/LocationDropdown';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useTheme } from '../contexts/ThemeContext';
import { Camera } from 'lucide-react-native';

export default function EditPlantScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [plantPhoto, setPlantPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const styles = createStyles(theme);

  useEffect(() => {
    loadPlantData();
  }, [id]);

  const loadPlantData = async () => {
    if (!id) return;
    
    try {
      const plantData = await PlantService.getPlantById(id);
      if (plantData) {
        setPlant(plantData);
        setName(plantData.name || '');
        setType(plantData.type);
        setLocation(plantData.location || '');
        setNotes(plantData.notes || '');
      }
    } catch (error) {
      console.error('Failed to load plant:', error);
      Alert.alert('Error', 'Failed to load plant data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!type.trim()) {
      Alert.alert('Error', 'Please enter plant type');
      return;
    }

    if (!id) return;

    setSaving(true);
    try {
      await PlantService.updatePlant(id, {
        name: name.trim() || undefined,
        type: type.trim(),
        location: location.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      // If there's a new photo, save it
      if (plantPhoto) {
        try {
          await PhotoService.savePhoto(id, plantPhoto, 'Updated photo');
        } catch (photoError) {
          console.warn('Failed to save photo, but plant was updated:', photoError);
        }
      }

      router.back();
    } catch (error) {
      console.error('Failed to update plant:', error);
      Alert.alert('Error', 'Failed to update plant');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Photo Library', onPress: handlePickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await PhotoService.takePhoto();
      if (photo) {
        setPlantPhoto(photo.uri);
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
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
      Alert.alert('Error', 'Failed to pick photo');
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.container}>
        <Text>Plant not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAwareScrollView
        extraScrollHeight={100}
        keyboardVerticalOffset={100}
      >
        <View style={styles.form}>
          {/* Plant Photo */}
          <View style={styles.inputGroup}>
            <TouchableOpacity style={styles.photoContainer} onPress={handleAddPhoto}>
              {plantPhoto ? (
                <View style={styles.photoWrapper}>
                  <Image source={{ uri: plantPhoto }} style={styles.plantImage} />
                  <TouchableOpacity style={styles.changePhotoButton} onPress={handleAddPhoto}>
                    <Camera size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={48} color={theme.colors.textSecondary} />
                  <Text style={styles.photoPlaceholderSubtext}>Tap to add photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Plant Name */}
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

          {/* Plant Type */}
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

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <LocationDropdown
              value={location}
              onValueChange={setLocation}
              placeholder="Select or enter location"
            />
          </View>


          {/* Notes */}
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

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Updating Plant...' : 'Update Plant'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
    fontWeight: '600',
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
  photoContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoWrapper: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  plantImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changePhotoText: {
    fontSize: 18,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  photoPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoPlaceholderSubtext: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30, // Extra bottom margin for keyboard accessibility
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  saveButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});
