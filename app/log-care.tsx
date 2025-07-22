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
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CareEventService } from '../services/CareEventService';
import { PlantService } from '../services/PlantService';
import { DateTimeService } from '../services/DateTimeService';
import { Plant } from '../types/Plant';
import { useGlobalStyles } from '../styles';
import { useTheme } from '../contexts/ThemeContext';
import { useCareStyles } from '../styles/CareStyles';

export default function LogCareScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  const careStyles = useCareStyles();
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'repot' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other'>('water');
  const [careDateTime, setCareDateTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
      style={globalStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={globalStyles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={globalStyles.form}>
          {/* Plant Info */}
          {plant && (
            <View style={styles.plantInfo}>
              <Text style={styles.plantName}>{plant.name}</Text>
              <Text style={styles.plantType}>{plant.type}</Text>
            </View>
          )}

          {/* Care Type Selection */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Care Type</Text>
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

          <View style={globalStyles.inputGroup}>
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

          {/* Set to Now Button */}
          <View style={[globalStyles.flexRow, { marginBottom: 20 }]}>
            <TouchableOpacity
              style={globalStyles.buttonSmall}
              onPress={() => {
                setCareDateTime(new Date());
              }}
            >
              <Text style={globalStyles.buttonTextSmall}>Set to Now</Text>
            </TouchableOpacity>
          </View>

          {/* Fertilizer Options (only show for fertilize) */}
          {showFertilizerOptions && (
            <>
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Fertilizer Concentration</Text>
                <TextInput
                  style={globalStyles.input}
                  value={fertilizerConcentration}
                  onChangeText={setFertilizerConcentration}
                  placeholder="e.g., 1/4 strength, 20-20-20"
                />
              </View>

              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Amount Used</Text>
                <TextInput
                  style={globalStyles.input}
                  value={fertilizerAmount}
                  onChangeText={setFertilizerAmount}
                  placeholder="e.g., 1 cup, 500ml"
                />
              </View>
            </>
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

          {/* Notes */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Notes</Text>
            <TextInput
              style={globalStyles.inputTextArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes about this care event..."
              multiline
              numberOfLines={4}
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
              {saving ? 'Logging Event...' : 'Log Care Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme) => StyleSheet.create({
  plantInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  plantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  plantType: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  careTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  careTypeOption: {
    width: '30%',
    aspectRatio: 1,
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
    fontSize: 32,
  },
  careTypeText: {
    fontSize: 14,
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
});


