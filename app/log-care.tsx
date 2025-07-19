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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CareEventService } from '../services/CareEventService';
import { PlantService } from '../services/PlantService';
import { DateTimeService } from '../services/DateTimeService';
import { Plant } from '../types/Plant';

export default function LogCareScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'repot' | 'prune' | 'other'>('water');
  const [careDateTime, setCareDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDateTime, setTempDateTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [fertilizerConcentration, setFertilizerConcentration] = useState('');
  const [fertilizerAmount, setFertilizerAmount] = useState('');
  const [healthStatus, setHealthStatus] = useState<'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical' | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (plantId) {
      loadPlant();
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

  const handleSave = async () => {
    if (!plantId) {
      Alert.alert('Error', 'No plant selected');
      return;
    }

    setSaving(true);
    try {
      await CareEventService.createCareEvent({
        plant_id: plantId,
        event_type: eventType,
        date: careDateTime.toISOString(),
        notes: notes.trim() || undefined,
        fertilizer_concentration: fertilizerConcentration.trim() || undefined,
        fertilizer_amount: fertilizerAmount.trim() || undefined,
        health_status: healthStatus,
      });

      // If health status was provided, update the plant's health status too
      if (healthStatus && plant) {
        await PlantService.updatePlant(plant.id, { health_status: healthStatus });
      }

      // Navigate back directly to refresh the plant detail screen
      router.back();
    } catch (error) {
      console.error('Failed to log care event:', error);
      Alert.alert('Error', 'Failed to log care event');
    } finally {
      setSaving(false);
    }
  };

  const careTypes = [
    { value: 'water', label: 'Water', icon: '💧' },
    { value: 'fertilize', label: 'Fertilize', icon: '🌱' },
    { value: 'repot', label: 'Repot', icon: '🪴' },
    { value: 'prune', label: 'Prune', icon: '✂️' },
    { value: 'other', label: 'Other', icon: '📝' },
  ] as const;

  const showFertilizerOptions = eventType === 'fertilize';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* Plant Info */}
          {plant && (
            <View style={styles.plantInfo}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantType}>{plant.type}</Text>
            </View>
          )}

          {/* Care Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Care Type</Text>
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time</Text>
            
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                setShowTimePicker(false);
                setTempDateTime(new Date(careDateTime));
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateTimeText}>
                Date: {DateTimeService.formatDate(careDateTime)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => {
                setShowDatePicker(false);
                setTempDateTime(new Date(careDateTime));
                setShowTimePicker(true);
              }}
            >
              <Text style={styles.dateTimeText}>
                Time: {DateTimeService.formatTime(careDateTime)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, styles.pickerButtonDone]}
                    onPress={() => {
                      setCareDateTime(tempDateTime);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerButtonText, styles.pickerButtonTextDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDateTime}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setTempDateTime(selectedDate);
                    }
                  }}
                />
              </View>
            )}

            {showTimePicker && (
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Select Time</Text>
                  <TouchableOpacity
                    style={[styles.pickerButton, styles.pickerButtonDone]}
                    onPress={() => {
                      setCareDateTime(tempDateTime);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[styles.pickerButtonText, styles.pickerButtonTextDone]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDateTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedTime) => {
                    if (selectedTime) {
                      setTempDateTime(selectedTime);
                    }
                  }}
                />
              </View>
            )}
          </View>

          {/* Fertilizer Options (only show for fertilize) */}
          {showFertilizerOptions && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fertilizer Concentration</Text>
                <TextInput
                  style={styles.input}
                  value={fertilizerConcentration}
                  onChangeText={setFertilizerConcentration}
                  placeholder="e.g., 1/4 strength, 20-20-20"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount Used</Text>
                <TextInput
                  style={styles.input}
                  value={fertilizerAmount}
                  onChangeText={setFertilizerAmount}
                  placeholder="e.g., 1 cup, 500ml"
                />
              </View>
            </>
          )}

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes about this care event..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Quick Add Buttons */}
          <View style={styles.quickButtons}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => {
                setCareDateTime(new Date());
              }}
            >
              <Text style={styles.quickButtonText}>Set to Now</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Logging Event...' : 'Log Care Event'}
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
  plantInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  plantName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  plantType: {
    fontSize: 16,
    color: '#666',
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
  careTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  careTypeOption: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
  },
  careTypeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0f9ff',
  },
  careTypeIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  careTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  careTypeTextSelected: {
    color: '#4CAF50',
  },
  dateTimeRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  quickButtons: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  quickButton: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  quickButtonText: {
    fontSize: 14,
    color: '#666',
  },
  dateTimeButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  pickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  pickerButtonDone: {
    backgroundColor: '#4CAF50',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#666',
  },
  pickerButtonTextDone: {
    color: 'white',
    fontWeight: '600',
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
