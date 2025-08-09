// Query keys for consistent cache management across the app
export const queryKeys = {
  plants: ['plants'] as const,
  plant: (id: string) => ['plants', id] as const,
  plantPhotos: (plantId: string) => ['plant-photos', plantId] as const,
  plantEvents: (plantId: string) => ['plant-events', plantId] as const,
  plantStats: (plantId: string) => ['plant-stats', plantId] as const,
  allPhotos: ['all-photos'] as const,
  recentEvents: ['recent-events'] as const,
  plantsByLocation: (location: string) => ['plants-by-location', location] as const,
  thumbnailPhoto: (plantId: string) => ['thumbnail-photo', plantId] as const,
};