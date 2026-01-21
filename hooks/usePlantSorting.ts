import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { Plant } from '../types/Plant';

const SORT_PREFERENCES_KEY = 'global_plant_sort_preferences';

export type SortType = 'name' | 'lastWatered';
export type SortDirection = 'asc' | 'desc';

export interface SortPreference {
  type: SortType;
  direction: SortDirection;
}

export interface UsePlantSortingReturn {
  sortPreference: SortPreference;
  updateSortPreference: (type: SortType, direction: SortDirection) => Promise<void>;
  toggleSortDirection: () => Promise<void>;
  sortPlants: (plants: Plant[], wateringData: Record<string, string | null>) => Plant[];
  isLoading: boolean;
}

const DEFAULT_PREFERENCE: SortPreference = { type: 'name', direction: 'asc' };

export const usePlantSorting = (): UsePlantSortingReturn => {
  const [sortPreference, setSortPreference] = useState<SortPreference>(DEFAULT_PREFERENCE);
  const [isLoading, setIsLoading] = useState(true);

  // Load sort preference from AsyncStorage on mount
  useEffect(() => {
    const loadSortPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem(SORT_PREFERENCES_KEY);
        if (stored) {
          setSortPreference(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load sort preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSortPreference();
  }, []);

  // Save sort preference to AsyncStorage
  const saveSortPreference = useCallback(async (preference: SortPreference) => {
    try {
      await AsyncStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(preference));
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  }, []);

  // Update sort preference
  const updateSortPreference = useCallback(
    async (type: SortType, direction: SortDirection) => {
      const newPreference = { type, direction };
      setSortPreference(newPreference);
      await saveSortPreference(newPreference);
    },
    [saveSortPreference]
  );

  // Toggle sort direction
  const toggleSortDirection = useCallback(async () => {
    const newDirection = sortPreference.direction === 'asc' ? 'desc' : 'asc';
    await updateSortPreference(sortPreference.type, newDirection);
  }, [sortPreference, updateSortPreference]);

  // Sort plants based on current preference
  const sortPlants = useCallback(
    (plants: Plant[], wateringData: Record<string, string | null>): Plant[] => {
      return [...plants].sort((a, b) => {
        let comparison = 0;

        if (sortPreference.type === 'name') {
          const nameA = (a.name || a.type).toLowerCase();
          const nameB = (b.name || b.type).toLowerCase();
          comparison = nameA.localeCompare(nameB);
        } else if (sortPreference.type === 'lastWatered') {
          const lastWateredA = wateringData[a.id];
          const lastWateredB = wateringData[b.id];

          // Handle null values (never watered) - they should come last in ascending, first in descending
          if (!lastWateredA && !lastWateredB) {
            comparison = 0;
          } else if (!lastWateredA) {
            comparison = sortPreference.direction === 'asc' ? 1 : -1;
          } else if (!lastWateredB) {
            comparison = sortPreference.direction === 'asc' ? -1 : 1;
          } else {
            // Compare dates - more recent should come first in desc, last in asc
            comparison = dayjs(lastWateredA).isBefore(dayjs(lastWateredB)) ? -1 : 1;
          }
        }

        return sortPreference.direction === 'desc' ? -comparison : comparison;
      });
    },
    [sortPreference]
  );

  return {
    sortPreference,
    updateSortPreference,
    toggleSortDirection,
    sortPlants,
    isLoading,
  };
};
