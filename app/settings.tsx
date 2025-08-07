import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantService } from '../services/PlantService';
import { EventService } from '../services/EventService';
import { PhotoService } from '../services/PhotoService';

const DATE_FORMATS = [
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
];

const TIME_FORMATS = [
  { label: '12-hour (AM/PM)', value: '12' },
  { label: '24-hour', value: '24' },
];

export default function Settings() {
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12');
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedDateFormat = await AsyncStorage.getItem('dateFormat');
        const savedTimeFormat = await AsyncStorage.getItem('timeFormat');
        
        if (savedDateFormat) {
          setDateFormat(savedDateFormat);
        }
        if (savedTimeFormat) {
          setTimeFormat(savedTimeFormat);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Save date format preference
  const handleDateFormatChange = async (format: string) => {
    try {
      await AsyncStorage.setItem('dateFormat', format);
      setDateFormat(format);
      setDropdownVisible(false);
    } catch (error) {
      console.error('Error saving date format:', error);
    }
  };

  const saveTimeFormat = async (format: string) => {
    try {
      await AsyncStorage.setItem('timeFormat', format);
      setTimeFormat(format);
    } catch (error) {
      console.error('Failed to save time format:', error);
      Alert.alert('Error', 'Failed to save time format setting');
    }
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      'Delete All Data',
      'This will permanently delete all plants, events, photos, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: confirmDeleteAllData,
        },
      ]
    );
  };

  const confirmDeleteAllData = () => {
    Alert.alert(
      'Are you absolutely sure?',
      'This will delete everything and cannot be recovered.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete Everything',
          style: 'destructive',
          onPress: deleteAllData,
        },
      ]
    );
  };

  const deleteAllData = async () => {
    setLoading(true);
    try {
      // Delete all photos first
      await PhotoService.deleteAllPhotos();
      
      // Delete all events
      await EventService.deleteAllEvents();
      
      // Delete all plants
      await PlantService.deleteAllPlants();
      
      // Clear all AsyncStorage settings
      await AsyncStorage.clear();
      
      Alert.alert(
        'Success',
        'All data has been deleted successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to delete all data:', error);
      Alert.alert('Error', 'Failed to delete all data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date & Time Format</Text>
        
        <Text style={styles.settingLabel}>Date Format</Text>
        
        {/* Dropdown for Date Format */}
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownVisible(true)}
        >
          <Text style={styles.dropdownText}>{dateFormat}</Text>
          <ChevronDown size={20} color="#666" />
        </TouchableOpacity>

        {/* Dropdown Modal */}
        <Modal
          visible={dropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.dropdownModal}>
              {DATE_FORMATS.map((format) => (
                <TouchableOpacity
                  key={format.value}
                  style={[
                    styles.dropdownOption,
                    dateFormat === format.value && styles.selectedDropdownOption,
                  ]}
                  onPress={() => handleDateFormatChange(format.value)}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    dateFormat === format.value && styles.selectedDropdownOptionText,
                  ]}>
                    {format.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={[styles.settingLabel, { marginTop: 20 }]}>Time Format</Text>
        {TIME_FORMATS.map((format) => (
          <TouchableOpacity
            key={format.value}
            style={[
              styles.formatOption,
              timeFormat === format.value && styles.selectedFormat,
            ]}
            onPress={() => saveTimeFormat(format.value)}
          >
            <Text
              style={[
                styles.formatText,
                timeFormat === format.value && styles.selectedFormatText,
              ]}
            >
              {format.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity
          style={[styles.deleteButton, loading && styles.disabledButton]}
          onPress={handleDeleteAllData}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>
            {loading ? 'Deleting...' : 'Delete All Plants & Data'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.warningText}>
          This will permanently delete all plants, event history, photos, and settings.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Rooted - Plant Care Tracker
        </Text>
        <Text style={styles.versionText}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  formatOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedFormat: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  formatText: {
    fontSize: 16,
    color: '#333',
  },
  selectedFormatText: {
    color: 'white',
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    maxWidth: 300,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownOption: {
    padding: 12,
    borderRadius: 4,
  },
  selectedDropdownOption: {
    backgroundColor: '#4CAF50',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  selectedDropdownOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  deleteButtonText: {
    color: 'white',
    backgroundColor: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aboutText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
});
