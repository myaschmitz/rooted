import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { PlantService } from '../services/PlantService';
import { PhotoService } from '../services/PhotoService';
import { Plant } from '../types/Plant';
import LocationDropdown from '../components/LocationDropdown';

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [healthStatus, setHealthStatus] = useState<'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical'>('good');
  const [notes, setNotes] = useState('');
  const [plantPhoto, setPlantPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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
        setHealthStatus(plantData.health_status || 'good');
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
        health_status: healthStatus,
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

  const healthOptions = [
    { value: 'excellent', label: 'Excellent', color: '#2E7D32', emoji: '🌟' },
    { value: 'good', label: 'Good', color: '#4CAF50', emoji: '😊' },
    { value: 'okay', label: 'Okay', color: '#FF9800', emoji: '😐' },
    { value: 'poor', label: 'Poor', color: '#FF5722', emoji: '😟' },
    { value: 'concerning', label: 'Concerning', color: '#F44336', emoji: '😰' },
    { value: 'critical', label: 'Critical', color: '#B71C1C', emoji: '💀' },
  ] as const;

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading plant data...</Text>
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* Plant Photo */}
          <View style={styles.inputGroup}>
            <TouchableOpacity style={styles.photoContainer} onPress={handleAddPhoto}>
              {plantPhoto ? (
                <View style={styles.photoWrapper}>
                  <Image source={{ uri: plantPhoto }} style={styles.plantImage} />
                  <TouchableOpacity style={styles.changePhotoButton} onPress={handleAddPhoto}>
                    <Text style={styles.changePhotoText}>📷</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>📷</Text>
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
              placeholder="Select or enter location (e.g., living room, kitchen window)"
            />
          </View>

          {/* Health Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Health Status</Text>
            <View style={styles.healthOptions}>
              {healthOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.healthOption,
                    healthStatus === option.value && [
                      styles.healthOptionSelected,
                      { backgroundColor: option.color + '20', borderColor: option.color }
                    ]
                  ]}
                  onPress={() => setHealthStatus(option.value)}
                >
                  <Text style={styles.healthEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.healthOptionText,
                      healthStatus === option.value && { 
                        color: option.color, 
                        fontWeight: 'bold' 
                      }
                    ]}
                  >
                    {option.label}
                  </Text>
                  {healthStatus === option.value && (
                    <View style={[styles.selectedIndicator, { backgroundColor: option.color }]} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
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
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  photoPlaceholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  photoPlaceholderSubtext: {
    fontSize: 16,
    color: '#666',
  },
  healthOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'relative',
  },
  healthOptionSelected: {
    borderWidth: 3,
  },
  healthEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  healthOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
