import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Plant } from '../types/Plant';
import LocationDropdown from '../components/LocationDropdown';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useTheme } from '../contexts/ThemeContext';
import { formStyles } from '../styles/FormStyles';
import { usePlant, useUpdatePlant } from '../hooks/queries';
import WebContainer from '../components/WebContainer';
import { useModalDismiss, useModalParams } from '../hooks/useModalNav';
import { useAlert } from '../contexts/AlertContext';

export default function EditPlantScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { id } = useModalParams<{ id: string }>();
  const dismiss = useModalDismiss();
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
      showAlert('Error', 'Please enter plant type');
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

      dismiss();
    } catch (error) {
      console.error('Failed to update plant:', error);
      showAlert('Error', 'Failed to update plant');
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
    <WebContainer>
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
              {saving ? 'Saving…' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
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
  saveButton: { ...formStyles(theme).primaryButton, marginTop: 8, marginBottom: 30 },
  saveButtonDisabled: formStyles(theme).buttonDisabled,
  saveButtonText: formStyles(theme).primaryButtonText,
  loadingContainer: { ...formStyles(theme).screen, justifyContent: 'center', alignItems: 'center' },
});
