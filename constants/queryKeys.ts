// Query keys for consistent cache management across the app
export const queryKeys = {
  plants: ['plants'] as const,
  plant: (id: string) => ['plants', id] as const,
  plantPhotos: (plantId: string) => ['plant-photos', plantId] as const,
  plantEvents: (plantId: string) => ['plant-events', plantId] as const,
  plantStats: (plantId: string) => ['plant-stats', plantId] as const,
  allPhotos: ['all-photos'] as const,
  recentEvents: ['recent-events'] as const,
  allEvents: ['all-events'] as const,
  plantsByLocation: (location: string) =>
    ['plants-by-location', location] as const,
  plantsByLocationRoot: ['plants-by-location'] as const,
  thumbnailPhoto: (plantId: string) => ['thumbnail-photo', plantId] as const,
  batchThumbnails: (plantIds: string[]) =>
    ['batch-thumbnails', [...plantIds].sort().join(',')] as const,
  batchLastEvents: (plantIds: string[], eventTypes: string[]) =>
    [
      'batch-last-events',
      [...plantIds].sort().join(','),
      [...eventTypes].sort().join(','),
    ] as const,
  batchLastEventsRoot: ['batch-last-events'] as const,
  archivedPlants: ['archived-plants'] as const,
  allTags: ['all-tags'] as const,
  plantTags: (plantId: string) => ['plant-tags', plantId] as const,
  batchPlantTags: (plantIds: string[]) =>
    ['batch-plant-tags', [...plantIds].sort().join(',')] as const,
  batchPlantTagsRoot: ['batch-plant-tags'] as const,
};
