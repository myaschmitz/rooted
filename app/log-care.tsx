import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { GlobalStyles, CareStyles, CommonStyles } from '../styles';

export default function LogCareScreen() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other'>('water');
  const [careDateTime, setCareDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDateTime, setTempDateTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [fertilizerConcentration, setFertilizerConcentration] = useState('');
  const [fertilizerAmount, setFertilizerAmount] = useState('');
  const [pestSeverity, setPestSeverity] = useState<number>(1);
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
        pest_severity: eventType === 'pest_spotted' ? pestSeverity : undefined,
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
    { value: 'pest_spotted', label: 'Pest Spotted', icon: '🐛' },
    { value: 'insecticide_spray', label: 'Insecticide Spray', icon: '🧴' },
    { value: 'other', label: 'Other', icon: '📝' },
  ] as const;

  const showFertilizerOptions = eventType === 'fertilize';
  const showPestSeverity = eventType === 'pest_spotted';

  return (
    <KeyboardAvoidingView
      style={GlobalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={GlobalStyles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={CommonStyles.formContainer}>
          {/* Plant Info */}
          {plant && (
            <View style={CareStyles.plantInfo}>
              <Text style={CareStyles.plantName}>{plant.name}</Text>
              <Text style={CareStyles.plantType}>{plant.type}</Text>
            </View>
          )}

          {/* Care Type Selection */}
          <View style={GlobalStyles.inputGroup}>
            <Text style={GlobalStyles.label}>Care Type</Text>
            <View style={CareStyles.careTypeGrid}>
              {careTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    CareStyles.careTypeOption,
                    eventType === type.value && CareStyles.careTypeOptionSelected,
                  ]}
                  onPress={() => setEventType(type.value)}
                >
                  <Text style={CareStyles.careTypeIcon}>{type.icon}</Text>
                  <Text
                    style={[
                      CareStyles.careTypeText,
                      eventType === type.value && CareStyles.careTypeTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date and Time */}
          <View style={GlobalStyles.inputGroup}>
            <Text style={GlobalStyles.label}>Date & Time</Text>
            
            <TouchableOpacity
              style={CareStyles.dateTimeButton}
              onPress={() => {
                setShowTimePicker(false);
                setTempDateTime(new Date(careDateTime));
                setShowDatePicker(true);
              }}
            >
              <Text style={CareStyles.dateTimeText}>
                Date: {DateTimeService.formatDate(careDateTime)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={CareStyles.dateTimeButton}
              onPress={() => {
                setShowDatePicker(false);
                setTempDateTime(new Date(careDateTime));
                setShowTimePicker(true);
              }}
            >
              <Text style={CareStyles.dateTimeText}>
                Time: {DateTimeService.formatTime(careDateTime)}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={CareStyles.pickerContainer}>
                <View style={CareStyles.pickerHeader}>
                  <TouchableOpacity
                    style={CareStyles.pickerButton}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={CareStyles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={CareStyles.pickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    style={[CareStyles.pickerButton, CareStyles.pickerButtonDone]}
                    onPress={() => {
                      setCareDateTime(tempDateTime);
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={[CareStyles.pickerButtonText, CareStyles.pickerButtonTextDone]}>Done</Text>
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
              <View style={CareStyles.pickerContainer}>
                <View style={CareStyles.pickerHeader}>
                  <TouchableOpacity
                    style={CareStyles.pickerButton}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={CareStyles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={CareStyles.pickerTitle}>Select Time</Text>
                  <TouchableOpacity
                    style={[CareStyles.pickerButton, CareStyles.pickerButtonDone]}
                    onPress={() => {
                      setCareDateTime(tempDateTime);
                      setShowTimePicker(false);
                    }}
                  >
                    <Text style={[CareStyles.pickerButtonText, CareStyles.pickerButtonTextDone]}>Done</Text>
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
              <View style={GlobalStyles.inputGroup}>
                <Text style={GlobalStyles.label}>Fertilizer Concentration</Text>
                <TextInput
                  style={GlobalStyles.input}
                  value={fertilizerConcentration}
                  onChangeText={setFertilizerConcentration}
                  placeholder="e.g., 1/4 strength, 20-20-20"
                />
              </View>

              <View style={GlobalStyles.inputGroup}>
                <Text style={GlobalStyles.label}>Amount Used</Text>
                <TextInput
                  style={GlobalStyles.input}
                  value={fertilizerAmount}
                  onChangeText={setFertilizerAmount}
                  placeholder="e.g., 1 cup, 500ml"
                />
              </View>
            </>
          )}

          {/* Pest Severity (only show for pest_spotted) */}
          {showPestSeverity && (
            <View style={GlobalStyles.inputGroup}>
              <Text style={GlobalStyles.label}>Pest Severity (1-10 scale)</Text>
              <Text style={GlobalStyles.sublabel}>1 = Minor issue, 10 = Severe infestation</Text>
              <View style={CareStyles.severityContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      CareStyles.severityButton,
                      pestSeverity === severity && CareStyles.severityButtonSelected,
                      severity <= 3 && CareStyles.severityLow,
                      severity >= 4 && severity <= 6 && CareStyles.severityMedium,
                      severity >= 7 && CareStyles.severityHigh,
                    ]}
                    onPress={() => setPestSeverity(severity)}
                  >
                    <Text
                      style={[
                        CareStyles.severityText,
                        pestSeverity === severity && CareStyles.severityTextSelected,
                      ]}
                    >
                      {severity}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={GlobalStyles.inputGroup}>
            <Text style={GlobalStyles.label}>Notes</Text>
            <TextInput
              style={GlobalStyles.inputTextArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes about this care event..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Quick Add Buttons */}
          <View style={GlobalStyles.flexRow}>
            <TouchableOpacity
              style={GlobalStyles.buttonSmall}
              onPress={() => {
                setCareDateTime(new Date());
              }}
            >
              <Text style={GlobalStyles.buttonTextSmall}>Set to Now</Text>
            </TouchableOpacity>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[CommonStyles.saveButton, saving && GlobalStyles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={GlobalStyles.buttonText}>
              {saving ? 'Logging Event...' : 'Log Care Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


