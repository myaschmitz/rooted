import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { PlantService } from '../services/PlantService';
import { PhotoService } from '../services/PhotoService';
import LocationDropdown from '../components/LocationDropdown';
import { useTheme } from '../contexts/ThemeContext';

export default function AddPlantScreen() {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [healthStatus, setHealthStatus] = useState<'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical'>('good');
  const [notes, setNotes] = useState('');
  const [plantPhoto, setPlantPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const styles = createStyles(theme);

  const handleSave = async () => {
    if (!type.trim()) {
      Alert.alert('Error', 'Please enter plant type');
      return;
    }

    setSaving(true);
    try {
      const newPlant = await PlantService.createPlant({
        name: name.trim() || undefined,
        type: type.trim(),
        location: location.trim() || undefined,
        health_status: healthStatus,
        notes: notes.trim() || undefined,
      });

      // If there's a photo, save it
      if (plantPhoto && newPlant) {
        try {
          await PhotoService.savePhoto(newPlant.id, plantPhoto, 'Initial photo');
        } catch (photoError) {
          console.warn('Failed to save photo, but plant was created:', photoError);
        }
      }

      // Navigate back and refresh the home screen
      router.back();
    } catch (error) {
      console.error('Failed to create plant:', error);
      Alert.alert('Error', 'Failed to add plant');
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
    paddingBottom: 40, // Extra bottom padding for keyboard
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
    backgroundColor: '#f0f0f0',
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
  healthOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  healthOption: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
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
    color: theme.colors.textSecondary,
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
});
