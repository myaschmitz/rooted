import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantService } from '../services/PlantService';
import { EventService } from '../services/EventService';
import { PhotoService } from '../services/PhotoService';

export const DATE_FORMATS = [
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
] as const;

export const TIME_FORMATS = [
  { label: '12-hour (AM/PM)', value: '12' },
  { label: '24-hour', value: '24' },
] as const;

export type DateFormatValue = (typeof DATE_FORMATS)[number]['value'];
export type TimeFormatValue = (typeof TIME_FORMATS)[number]['value'];

export interface UseSettingsReturn {
  dateFormat: DateFormatValue;
  timeFormat: TimeFormatValue;
  loading: boolean;
  setDateFormat: (format: DateFormatValue) => Promise<void>;
  setTimeFormat: (format: TimeFormatValue) => Promise<void>;
  generateThumbnails: () => Promise<void>;
  deleteAllData: () => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const [dateFormat, setDateFormatState] = useState<DateFormatValue>('MM/DD/YYYY');
  const [timeFormat, setTimeFormatState] = useState<TimeFormatValue>('12');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [savedDateFormat, savedTimeFormat] = await Promise.all([
          AsyncStorage.getItem('dateFormat'),
          AsyncStorage.getItem('timeFormat'),
        ]);

        if (savedDateFormat) {
          setDateFormatState(savedDateFormat as DateFormatValue);
        }
        if (savedTimeFormat) {
          setTimeFormatState(savedTimeFormat as TimeFormatValue);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  const setDateFormat = useCallback(async (format: DateFormatValue) => {
    try {
      await AsyncStorage.setItem('dateFormat', format);
      setDateFormatState(format);
    } catch (error) {
      console.error('Error saving date format:', error);
    }
  }, []);

  const setTimeFormat = useCallback(async (format: TimeFormatValue) => {
    try {
      await AsyncStorage.setItem('timeFormat', format);
      setTimeFormatState(format);
    } catch (error) {
      console.error('Failed to save time format:', error);
      Alert.alert('Error', 'Failed to save time format setting');
    }
  }, []);

  const generateThumbnails = useCallback(async () => {
    setLoading(true);
    try {
      const result = await PhotoService.generateThumbnailsForExistingPhotos();
      Alert.alert(
        'Thumbnails Generated',
        `Successfully created ${result.success} thumbnails.\n${result.failed} failed, ${result.skipped} skipped.\n\nYour app will now use less data when loading photos!`
      );
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate thumbnails');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteAllData = useCallback(async () => {
    setLoading(true);
    try {
      await PhotoService.deleteAllPhotos();
      await EventService.deleteAllEvents();
      await PlantService.deleteAllPlants();
      await AsyncStorage.clear();

      setDateFormatState('MM/DD/YYYY');
      setTimeFormatState('12');

      Alert.alert('Success', 'All data has been deleted successfully.');
    } catch (error) {
      console.error('Failed to delete all data:', error);
      Alert.alert('Error', 'Failed to delete all data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    dateFormat,
    timeFormat,
    loading,
    setDateFormat,
    setTimeFormat,
    generateThumbnails,
    deleteAllData,
  };
};
