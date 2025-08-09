import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EventService } from '../services/EventService';
import { PlantService } from '../services/PlantService';
import { DateTimeService } from '../services/DateTimeService';
import { Plant } from '../types/Plant';
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
      await EventService.createEvent({
        plant_id: plantId,
        event_type: eventType,
        date: careDateTime.toISOString(),
        notes: notes.trim() || undefined,
        fertilizer_concentration: fertilizerStrength,
        pest_severity: eventType === 'pest_spotted' ? pestSeverity : undefined,
      });

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
      { value: 'insecticide_spray', label: 'Insecticide Spray', icon: '🧴' },
    ],
    events: [
      { value: 'pest_spotted', label: 'Pest Spotted', icon: '🐛' },
      { value: 'new_leaf', label: 'New Leaf', icon: '🍃' },
      { value: 'relocation', label: 'Relocation', icon: '📦' },
      { value: 'new_roots_spotted', label: 'New Roots Spotted', icon: '🌿' },
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

          {/* Notes */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Notes</Text>
            <TextInput
              style={globalStyles.inputTextArea}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional notes about this event..."
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
              {saving ? 'Logging Event...' : 'Log Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
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
});


