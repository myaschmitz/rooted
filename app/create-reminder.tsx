import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ReminderService } from '../services/ReminderService';
import { PlantService } from '../services/PlantService';
import { NotificationService } from '../services/NotificationService';
import { Plant } from '../types/Plant';
import { RecurrenceType } from '../types/Reminder';
import KeyboardAwareScrollView from '../components/KeyboardAwareScrollView';
import { useTheme } from '../contexts/ThemeContext';
import { useGlobalStyles } from '../styles';

export default function CreateReminderScreen() {
  const { theme } = useTheme();
  const { plantId } = useLocalSearchParams<{ plantId?: string }>();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlantId, setSelectedPlantId] = useState<string>(plantId || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderDateTime, setReminderDateTime] = useState(new Date());
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [customInterval, setCustomInterval] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState<'days' | 'weeks' | 'months'>('days');
  const [showPlantPicker, setShowPlantPicker] = useState(false);
  const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const styles = createStyles(theme);
  const globalStyles = useGlobalStyles();

  useEffect(() => {
    loadPlants();
  }, []);

  const loadPlants = async () => {
    try {
      const plantsData = await PlantService.getAllPlants();
      setPlants(plantsData);
    } catch (error) {
      console.error('Failed to load plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    }
  };

  const handleSave = async () => {
    if (!selectedPlantId) {
      Alert.alert('Error', 'Please select a plant');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    setSaving(true);
    try {
      // Check notification permissions
      const hasPermission = await NotificationService.requestPermissions();
      if (!hasPermission) {
        Alert.alert('Error', 'Notification permissions are required for reminders');
        setSaving(false);
        return;
      }

      // Validate that the selected date/time is not in the past
      const now = new Date();
      if (reminderDateTime < now) {
        Alert.alert('Error', 'Cannot create reminders for past dates. Please select a future date and time.');
        setSaving(false);
        return;
      }

      // Create reminder
      const reminderData = {
        plant_id: selectedPlantId,
        title: title.trim(),
        description: description.trim(),
        date: reminderDateTime.toISOString().split('T')[0], // YYYY-MM-DD
        time: `${reminderDateTime.getHours().toString().padStart(2, '0')}:${reminderDateTime.getMinutes().toString().padStart(2, '0')}`,
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceType === 'custom' ? customInterval : undefined,
        recurrence_unit: recurrenceType === 'custom' ? customUnit : undefined,
        is_active: true,
      };

      const reminder = await ReminderService.createReminder(reminderData);
      
      // Notification is already scheduled by ReminderService.createReminder()

      Alert.alert('Success', 'Reminder created successfully', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Failed to create reminder:', error);
      Alert.alert('Error', 'Failed to create reminder');
    } finally {
      setSaving(false);
    }
  };


  const getSelectedPlantName = () => {
    const plant = plants.find(p => p.id === selectedPlantId);
    return plant ? (plant.name || plant.type) : 'Select Plant';
  };

  const recurrenceOptions = [
    { value: 'none', label: 'One time only' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom...' },
  ];

  const getRecurrenceLabel = () => {
    if (recurrenceType === 'custom') {
      const unit = customUnit === 'days' ? 'day' : customUnit === 'weeks' ? 'week' : 'month';
      const plural = customInterval > 1 ? unit + 's' : unit;
      return `Every ${customInterval} ${plural}`;
    }
    return recurrenceOptions.find(opt => opt.value === recurrenceType)?.label || 'Select';
  };

  return (
    <KeyboardAwareScrollView style={styles.container}>
      <Text style={styles.title}>Create Reminder</Text>

      {/* Plant Selection */}
      <View style={styles.section}>
        <Text style={styles.label}>Plant *</Text>
        <TouchableOpacity 
          style={styles.dropdownButton} 
          onPress={() => setShowPlantPicker(true)}
        >
          <Text style={[styles.dropdownText, !selectedPlantId && styles.placeholderText]}>
            {getSelectedPlantName()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Title */}
      <View style={styles.section}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Water reminder"
          placeholderTextColor={theme.colors.textTertiary}
        />
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g., Time to water your plant!"
          placeholderTextColor={theme.colors.textTertiary}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Date and Time */}
      <View style={globalStyles.inputGroup}>
        <View style={styles.dateTimeRow}>
          <View style={styles.dateTimeSection}>
            <Text style={globalStyles.label}>Date *</Text>
            <DateTimePicker
              value={reminderDateTime}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  setReminderDateTime(selectedDate);
                }
              }}
            />
          </View>
          <View style={styles.dateTimeSection}>
            <Text style={globalStyles.label}>Time</Text>
            <DateTimePicker
              value={reminderDateTime}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                if (selectedTime) {
                  setReminderDateTime(selectedTime);
                }
              }}
            />
          </View>
          <View style={styles.buttonSection}>
            <TouchableOpacity
              style={styles.nowButton}
              onPress={() => {
                setReminderDateTime(new Date());
              }}
            >
              <Text style={styles.nowButtonText}>Set to Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Recurrence */}
      <View style={styles.section}>
        <Text style={styles.label}>Repeat</Text>
        <TouchableOpacity 
          style={styles.dropdownButton} 
          onPress={() => setShowRecurrencePicker(true)}
        >
          <Text style={styles.dropdownText}>{getRecurrenceLabel()}</Text>
        </TouchableOpacity>
      </View>

      {/* Custom Recurrence Settings */}
      {recurrenceType === 'custom' && (
        <View style={styles.section}>
          <Text style={styles.label}>Custom Repeat</Text>
          <View style={styles.customRecurrenceRow}>
            <Text style={styles.customLabel}>Every</Text>
            <TextInput
              style={styles.numberInput}
              value={customInterval.toString()}
              onChangeText={(text) => {
                const num = parseInt(text) || 1;
                setCustomInterval(Math.max(1, num));
              }}
              keyboardType="number-pad"
            />
            <TouchableOpacity 
              style={styles.unitButton} 
              onPress={() => {
                const units: ('days' | 'weeks' | 'months')[] = ['days', 'weeks', 'months'];
                const currentIndex = units.indexOf(customUnit);
                const nextIndex = (currentIndex + 1) % units.length;
                setCustomUnit(units[nextIndex]);
              }}
            >
              <Text style={styles.unitText}>{customUnit}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Save Button */}
      <TouchableOpacity 
        style={[styles.saveButton, saving && styles.disabledButton]} 
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Creating...' : 'Create Reminder'}
        </Text>
      </TouchableOpacity>

      {/* Plant Picker Modal */}
      <Modal visible={showPlantPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPlantPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Plant</Text>
            <View style={styles.modalSpacer} />
          </View>
          <FlatList
            data={plants}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.plantItem}
                onPress={() => {
                  setSelectedPlantId(item.id);
                  setShowPlantPicker(false);
                }}
              >
                <Text style={styles.plantName}>{item.name || item.type}</Text>
                {item.location && <Text style={styles.plantLocation}>{item.location}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Recurrence Picker Modal */}
      <Modal visible={showRecurrencePicker} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRecurrencePicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Repeat</Text>
            <View style={styles.modalSpacer} />
          </View>
          <FlatList
            data={recurrenceOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recurrenceItem}
                onPress={() => {
                  setRecurrenceType(item.value as RecurrenceType);
                  setShowRecurrencePicker(false);
                }}
              >
                <Text style={styles.recurrenceText}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

    </KeyboardAwareScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.colors.text,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.text,
  },
  textInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropdownButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textTertiary,
  },
  dateButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 16,
    color: theme.colors.text,
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
    color: theme.colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  customRecurrenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customLabel: {
    fontSize: 16,
    color: theme.colors.text,
  },
  numberInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    width: 80,
    textAlign: 'center',
  },
  unitButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    minWidth: 80,
  },
  unitText: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalCancelText: {
    fontSize: 16,
    color: theme.colors.primary,
  },
  modalSpacer: {
    width: 50,
  },
  plantItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  plantLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recurrenceItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  recurrenceText: {
    fontSize: 16,
    color: theme.colors.text,
  },
});