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
import { ChevronDown, Palette, Sun, Moon, Monitor } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantService } from '../../services/PlantService';
import { CareEventService } from '../../services/CareEventService';
import { PhotoService } from '../../services/PhotoService';
import { useTheme } from '../../contexts/ThemeContext';
import { useColorScheme } from 'react-native';

const DATE_FORMATS = [
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
];

const TIME_FORMATS = [
  { label: '12-hour (AM/PM)', value: '12' },
  { label: '24-hour', value: '24' },
];

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const systemColorScheme = useColorScheme();
  const styles = createStyles(theme.colors);
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
      'This will permanently delete all plants, care events, photos, and settings. This action cannot be undone.',
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
      
      // Delete all care events
      await CareEventService.deleteAllCareEvents();
      
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
            onPress: () => {
              // Reset preferences to defaults
              setDateFormat('MM/DD/YYYY');
              setTimeFormat('12');
            },
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
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Theme Settings Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
        
        <View style={[styles.settingRow, { borderColor: theme.colors.border }]}>
          <View style={styles.settingInfo}>
            <Palette size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Theme</Text>
          </View>
          
          <View style={[styles.themeSelector, { backgroundColor: theme.colors.background }]}>
            {[
              { value: 'light', icon: Sun },
              { value: 'dark', icon: Moon },
              { value: 'system', icon: Monitor },
            ].map((option) => {
              const IconComponent = option.icon;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOptionCompact,
                    themeMode === option.value && [styles.selectedThemeOptionCompact, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => setThemeMode(option.value as 'light' | 'dark' | 'system')}
                >
                  <IconComponent 
                    size={18} 
                    color={themeMode === option.value ? theme.colors.textOnPrimary : theme.colors.text}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date & Time Format</Text>
        
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Date Format</Text>
        
        {/* Dropdown for Date Format */}
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setDropdownVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{dateFormat}</Text>
          <ChevronDown size={20} color={theme.colors.textSecondary} />
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
          This will permanently delete all plants, care history, photos, and settings.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Rooted - Plant Care Tracker{'\n'}
          Track your plants, log care events, and keep your green friends healthy!
        </Text>
        <Text style={styles.versionText}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
    </>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  section: {
    backgroundColor: theme.surface,
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.text,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  themeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeButtonText: {
    fontSize: 16,
    color: theme.text,
    marginLeft: 15,
  },
  settingValue: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  button: {
    backgroundColor: theme.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: theme.textOnPrimary,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: theme.danger,
  },
  dangerButtonText: {
    color: theme.textOnPrimary,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: theme.text,
  },
  formatOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  selectedFormat: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  formatText: {
    fontSize: 16,
    color: theme.text,
  },
  selectedFormatText: {
    color: theme.textOnPrimary,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: theme.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    maxWidth: 300,
    shadowColor: theme.shadow,
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
    backgroundColor: theme.primary,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: theme.text,
    textAlign: 'center',
  },
  selectedDropdownOptionText: {
    color: theme.textOnPrimary,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: theme.danger,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  disabledButton: {
    backgroundColor: theme.disabled,
  },
  deleteButtonText: {
    color: theme.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  aboutText: {
    fontSize: 16,
    color: theme.text,
    marginBottom: 5,
    lineHeight: 22,
  },
  versionText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  // Compact theme selector styles
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  themeOptionCompact: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedThemeOptionCompact: {
    backgroundColor: theme.primary,
  },
  themeIconCompact: {
    fontSize: 16,
  },
});
