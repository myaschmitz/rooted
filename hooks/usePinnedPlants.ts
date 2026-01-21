import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PINNED_PLANTS_KEY = 'pinned_plants';

export interface UsePinnedPlantsReturn {
  pinnedPlantIds: Set<string>;
  isPinned: (plantId: string) => boolean;
  togglePin: (plantId: string) => Promise<void>;
  isLoading: boolean;
}

export const usePinnedPlants = (): UsePinnedPlantsReturn => {
  const [pinnedPlantIds, setPinnedPlantIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load pinned plants from AsyncStorage on mount
  useEffect(() => {
    const loadPinnedPlants = async () => {
      try {
        const stored = await AsyncStorage.getItem(PINNED_PLANTS_KEY);
        if (stored) {
          setPinnedPlantIds(new Set(JSON.parse(stored)));
        }
      } catch (error) {
        console.error('Failed to load pinned plants:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPinnedPlants();
  }, []);

  // Save pinned plants to AsyncStorage
  const savePinnedPlants = useCallback(async (pinnedIds: Set<string>) => {
    try {
      await AsyncStorage.setItem(PINNED_PLANTS_KEY, JSON.stringify(Array.from(pinnedIds)));
    } catch (error) {
      console.error('Failed to save pinned plants:', error);
    }
  }, []);

  // Check if a plant is pinned
  const isPinned = useCallback(
    (plantId: string) => pinnedPlantIds.has(plantId),
    [pinnedPlantIds]
  );

  // Toggle pin status for a plant
  const togglePin = useCallback(
    async (plantId: string) => {
      const newPinnedIds = new Set(pinnedPlantIds);
      if (newPinnedIds.has(plantId)) {
        newPinnedIds.delete(plantId);
      } else {
        newPinnedIds.add(plantId);
      }
      setPinnedPlantIds(newPinnedIds);
      await savePinnedPlants(newPinnedIds);
    },
    [pinnedPlantIds, savePinnedPlants]
  );

  return {
    pinnedPlantIds,
    isPinned,
    togglePin,
    isLoading,
  };
};
