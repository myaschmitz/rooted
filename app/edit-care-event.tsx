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
import { CareEventService } from '../services/CareEventService';
import { CareEvent } from '../types/Plant';
import { useTheme } from '../contexts/ThemeContext';
import { useCareStyles } from '../styles/CareStyles';

export default function EditCareEventScreen() {
  const { theme } = useTheme();
  const careStyles = useCareStyles();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [careEvent, setCareEvent] = useState<CareEvent | null>(null);
  const [eventType, setEventType] = useState<'water' | 'fertilize' | 'prune' | 'repot' | 'pest_spotted' | 'insecticide_spray' | 'other'>('water');
  const [healthStatus, setHealthStatus] = useState<'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical'>('good');
  const [notes, setNotes] = useState('');
  const [fertilizerConcentration, setFertilizerConcentration] = useState('');
  const [fertilizerAmount, setFertilizerAmount] = useState('');
  const [pestSeverity, setPestSeverity] = useState<number>(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const styles = createStyles(theme);

  useEffect(() => {
    loadCareEventData();
  }, [id]);

  const loadCareEventData = async () => {
    if (!id) return;
    
    try {
      const eventData = await CareEventService.getCareEventById(id);
      if (eventData) {
        setCareEvent(eventData);
        setEventType(eventData.event_type);
        setHealthStatus(eventData.health_status || 'good');
        setNotes(eventData.notes || '');
        setFertilizerConcentration(eventData.fertilizer_concentration || '');
        setFertilizerAmount(eventData.fertilizer_amount || '');
        setPestSeverity(eventData.pest_severity || 1);
      }
    } catch (error) {
      console.error('Failed to load care event:', error);
      Alert.alert('Error', 'Failed to load care event data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      await CareEventService.updateCareEvent(id, {
        event_type: eventType,
        health_status: healthStatus,
        notes: notes.trim() || undefined,
        fertilizer_concentration: fertilizerConcentration.trim() || undefined,
        fertilizer_amount: fertilizerAmount.trim() || undefined,
        pest_severity: eventType === 'pest_spotted' ? pestSeverity : undefined,
      });

      router.back();
    } catch (error) {
      console.error('Failed to update care event:', error);
      Alert.alert('Error', 'Failed to update care event');
    } finally {
      setSaving(false);
    }
  };

  const careTypeOptions = [
    { value: 'water', label: 'Watering', emoji: '💧' },
    { value: 'fertilize', label: 'Fertilizing', emoji: '🌱' },
    { value: 'prune', label: 'Pruning', emoji: '✂️' },
    { value: 'repot', label: 'Repotting', emoji: '🪴' },
    { value: 'pest_spotted', label: 'Pest Spotted', emoji: '🐛' },
    { value: 'insecticide_spray', label: 'Insecticide Spray', emoji: '🧴' },
    { value: 'other', label: 'Other', emoji: '📝' },
  ] as const;

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!careEvent) {
    return (
      <View style={styles.container}>
        <Text>Care event not found</Text>
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
          {/* Care Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Care Type</Text>
            <View style={styles.optionsContainer}>
              {careTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionButton,
                    eventType === option.value && styles.optionButtonSelected
                  ]}
                  onPress={() => setEventType(option.value)}
                >
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <Text
                    style={[
                      styles.optionText,
                      eventType === option.value && styles.optionTextSelected
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Health Status */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Health Status After Care</Text>
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

          {/* Fertilizer Details (only show if fertilizing) */}
          {eventType === 'fertilize' && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Fertilizer Concentration</Text>
                <TextInput
                  style={styles.input}
                  value={fertilizerConcentration}
                  onChangeText={setFertilizerConcentration}
                  placeholder="e.g., Half strength, 10-10-10"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount Used</Text>
                <TextInput
                  style={styles.input}
                  value={fertilizerAmount}
                  onChangeText={setFertilizerAmount}
                  placeholder="e.g., 1 cup, 500ml"
                  autoCapitalize="none"
                />
              </View>
            </>
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
              placeholder="Any additional notes about this care event..."
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
              {saving ? 'Updating...' : 'Update Care Event'}
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
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
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
    color: '#2196F3',
    fontWeight: 'bold',
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
});
