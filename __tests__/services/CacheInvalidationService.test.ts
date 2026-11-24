import { QueryClient } from '@tanstack/react-query';
import { CacheInvalidationService } from '../../services/CacheInvalidationService';
import { queryKeys } from '../../constants/queryKeys';

// jest.setup.js mocks this service globally; test the real one here.
jest.unmock('../../services/CacheInvalidationService');
jest.mock('../../services/CachedPhotoService', () => ({
  CachedPhotoService: {},
}));

const isStale = (client: QueryClient, queryKey: readonly unknown[]) =>
  client.getQueryState(queryKey)?.isInvalidated ?? false;

describe('CacheInvalidationService', () => {
  let client: QueryClient;

  // Seed a cache entry for every query the home and plant screens render.
  const seed = () => {
    const plantIds = ['p1', 'p2'];
    const keys = [
      queryKeys.plants,
      queryKeys.plant('p1'),
      queryKeys.plant('p2'),
      queryKeys.plantPhotos('p1'),
      queryKeys.plantPhotos('p2'),
      queryKeys.plantEvents('p1'),
      queryKeys.plantEvents('p2'),
      queryKeys.thumbnailPhoto('p1'),
      queryKeys.allPhotos,
      queryKeys.allTags,
      queryKeys.plantTags('p1'),
      queryKeys.batchPlantTags(plantIds),
      queryKeys.batchThumbnails(plantIds),
      queryKeys.batchLastPhotoDates(plantIds),
      queryKeys.batchLastEvents(plantIds, ['water']),
      queryKeys.eventPhotos('e1'),
      queryKeys.recentEvents,
      queryKeys.plantLineage('p1'),
    ];
    keys.forEach((key) => client.setQueryData(key, 'cached'));
  };

  beforeEach(() => {
    client = new QueryClient();
    seed();
  });

  afterEach(() => {
    client.clear();
  });

  it('refreshes the batched tag chips on the plant list when tags change', () => {
    CacheInvalidationService.invalidate('tags_changed', {}, client);

    expect(isStale(client, queryKeys.allTags)).toBe(true);
    expect(isStale(client, queryKeys.plantTags('p1'))).toBe(true);
    expect(isStale(client, queryKeys.batchPlantTags(['p1', 'p2']))).toBe(true);
    expect(isStale(client, queryKeys.plants)).toBe(false);
  });

  it('refreshes the plant, its thumbnail and the list thumbnails when a photo is added', () => {
    CacheInvalidationService.invalidate('photo_added', { plantId: 'p1' }, client);

    expect(isStale(client, queryKeys.plant('p1'))).toBe(true);
    expect(isStale(client, queryKeys.plantPhotos('p1'))).toBe(true);
    expect(isStale(client, queryKeys.thumbnailPhoto('p1'))).toBe(true);
    expect(isStale(client, queryKeys.batchThumbnails(['p1', 'p2']))).toBe(true);
    expect(isStale(client, queryKeys.batchLastPhotoDates(['p1', 'p2']))).toBe(true);
    expect(isStale(client, queryKeys.allPhotos)).toBe(true);
    // Only the affected plant
    expect(isStale(client, queryKeys.plant('p2'))).toBe(false);
    expect(isStale(client, queryKeys.plantPhotos('p2'))).toBe(false);
  });

  it('refreshes watering status on the plant list when an event changes', () => {
    CacheInvalidationService.invalidate(
      'event_changed',
      { plantId: 'p1', eventId: 'e1' },
      client,
    );

    expect(isStale(client, queryKeys.plantEvents('p1'))).toBe(true);
    expect(isStale(client, queryKeys.batchLastEvents(['p1', 'p2'], ['water']))).toBe(true);
    expect(isStale(client, queryKeys.recentEvents)).toBe(true);
    expect(isStale(client, queryKeys.eventPhotos('e1'))).toBe(true);
    expect(isStale(client, queryKeys.plantEvents('p2'))).toBe(false);
  });

  it("falls back to every plant's queries when the plant isn't known", () => {
    // e.g. a realtime DELETE that only carries the row id
    CacheInvalidationService.invalidate('photo_deleted', {}, client);

    expect(isStale(client, queryKeys.plantPhotos('p1'))).toBe(true);
    expect(isStale(client, queryKeys.plantPhotos('p2'))).toBe(true);
  });

  it('refreshes every plant in a propagation', () => {
    CacheInvalidationService.invalidate(
      'plant_propagated',
      { plantId: 'p1', relatedPlantIds: ['p2', null] },
      client,
    );

    expect(isStale(client, queryKeys.plantEvents('p1'))).toBe(true);
    expect(isStale(client, queryKeys.plantEvents('p2'))).toBe(true);
    expect(isStale(client, queryKeys.plantLineage('p1'))).toBe(true);
  });

  it('drops every cached query when the household changes', () => {
    CacheInvalidationService.invalidate('household_changed', {}, client);

    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });

  it('does nothing without a query client', () => {
    expect(() =>
      CacheInvalidationService.invalidate('plant_added', {}, null),
    ).not.toThrow();
  });
});
