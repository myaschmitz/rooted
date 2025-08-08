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
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { EventService } from '../services/EventService';
import { Event } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import { useCareStyles } from '../styles/CareStyles';

export default function EditCareEventScreen() {
  const { theme } = useTheme();
  const careStyles = useCareStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'fertigate' | 'prune' | 'repot' | 'pest_spotted' | 'insecticide_spray' | 'new_leaf' | 'relocation' | 'new_roots_spotted' | 'other'>('water');
  const [eventDate, setEventDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [fertilizerStrength, setFertilizerStrength] = useState<'1/4' | '1/2' | '1x' | '1.5x' | '2x'>('1x');
  const [pestSeverity, setPestSeverity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'care' | 'events'>('care');
  
  const styles = createStyles(theme);

  useEffect(() => {
    loadEventData();
  }, [id]);

  const loadEventData = async () => {
    if (!id) return;
    
    try {
      const eventData = await EventService.getEventById(id);
      if (eventData) {
        setEvent(eventData);
        setEventType(eventData.event_type);
        setEventDate(new Date(eventData.date));
        setNotes(eventData.notes || '');
        setFertilizerStrength((eventData.fertilizer_concentration as '1/4' | '1/2' | '1x' | '1.5x' | '2x') || '1x');
        setPestSeverity(eventData.pest_severity || 1);
        
        // Set the correct tab based on event type
        const eventTypes = ['pest_spotted', 'new_leaf', 'relocation', 'new_roots_spotted'];
        setActiveTab(eventTypes.includes(eventData.event_type) ? 'events' : 'care');
      }
    } catch (error) {
      console.error('Failed to load event:', error);
      Alert.alert('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await EventService.updateEvent(id, {
        event_type: eventType,
        date: eventDate.toISOString(),
        notes: notes.trim() || undefined,
        fertilizer_concentration: fertilizerStrength,
        pest_severity: eventType === 'pest_spotted' ? pestSeverity : undefined,
      });

      router.back();
    } catch (error) {
      console.error('Failed to update event:', error);
      Alert.alert('Error', 'Failed to update event');
    } finally {
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
      { value: 'other', label: 'Other', icon: '📝' },
    ],
    events: [
      { value: 'pest_spotted', label: 'Pest Spotted', icon: '🐛' },
      { value: 'new_leaf', label: 'New Leaf', icon: '🍃' },
      { value: 'relocation', label: 'Relocation', icon: '📦' },
      { value: 'new_roots_spotted', label: 'New Roots Spotted', icon: '🌿' },
    ],
  } as const;

  const careTypes = allCareTypes[activeTab];


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text>Event not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          {/* Event Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Event Type</Text>
            
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
          <View style={styles.inputGroup}>
            <View style={styles.dateTimeRow}>
              <View style={styles.dateTimeSection}>
                <Text style={styles.label}>Date</Text>
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setEventDate(selectedDate);
                    }
                  }}
                />
              </View>
              <View style={styles.dateTimeSection}>
                <Text style={styles.label}>Time</Text>
                <DateTimePicker
                  value={eventDate}
                  mode="time"
                  display="default"
                  onChange={(event, selectedTime) => {
                    if (selectedTime) {
                      setEventDate(selectedTime);
                    }
                  }}
                />
              </View>
              <View style={styles.buttonSection}>
                <TouchableOpacity
                  style={styles.nowButton}
                  onPress={() => {
                    setEventDate(new Date());
                  }}
                >
                  <Text style={styles.nowButtonText}>Set to Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Fertilizer Details (only show if fertilizing) */}
          {(eventType === 'fertilize' || eventType === 'fertigate') && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fertilizer Strength</Text>
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
          {eventType === 'pest_spotted' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pest Severity (1-10 scale)</Text>
              <Text style={styles.sublabel}>1 = Minor issue, 10 = Severe infestation</Text>
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
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes about this event..."
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
              {saving ? 'Updating...' : 'Update Event'}
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
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    minWidth: 100,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  optionEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  optionTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  saveButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sublabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
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
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateTimeSection: {
    flex: 1,
    marginRight: 8,
  },
  buttonSection: {
    justifyContent: 'flex-end',
    marginLeft: 8,
  },
  nowButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  nowButtonText: {
    color: theme.colors.textOnSecondary,
    fontSize: 12,
    fontWeight: '600',
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
});
