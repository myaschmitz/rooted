import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plant } from '../types/Plant';
import LocationDropdown from '../components/LocationDropdown';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useTheme } from '../contexts/ThemeContext';
import { usePlant, useUpdatePlant } from '../hooks/queries';

export default function EditPlantScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: plant, isLoading: loading } = usePlant(id!);
  const updatePlantMutation = useUpdatePlant();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  
  const styles = createStyles(theme);

  useEffect(() => {
    if (plant) {
      setName(plant.name || '');
      setType(plant.type);
      setLocation(plant.location || '');
      setNotes(plant.notes || '');
    }
  }, [plant]);

  const handleSave = async () => {
    if (!type.trim()) {
      Alert.alert('Error', 'Please enter plant type');
      return;
    }

    if (!id) return;

    setSaving(true);
    try {
      await updatePlantMutation.mutateAsync({
        id,
        updates: {
          name: name.trim() || undefined,
          type: type.trim(),
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
        }
      });

      router.back();
    } catch (error) {
      console.error('Failed to update plant:', error);
      Alert.alert('Error', 'Failed to update plant');
    } finally {
      setSaving(false);
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
