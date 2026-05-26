/**
 * Cache Key Builder
 *
 * Centralizes cache key construction logic to prevent leakage of caching strategy.
 *
 * Benefits:
 * - Single source of truth for cache key formats
 * - Easy to change key structure (e.g., add versioning, change delimiters)
 * - Prevents typos and inconsistencies
 * - Makes cache invalidation patterns obvious
 */
export class CacheKeyBuilder {
  // Separator used in cache keys (can be changed in one place)
  private static readonly SEP = ":";

  // ============================================================================
  // PLANT KEYS
  // ============================================================================

  static plantsList(householdId: string): string {
    return `plants${this.SEP}household${this.SEP}${householdId}`;
  }

  static plant(plantId: string, householdId: string): string {
    return `plant${this.SEP}${plantId}${this.SEP}household${this.SEP}${householdId}`;
  }

  static plantsByLocation(householdId: string, location: string): string {
    return `plants${this.SEP}location${this.SEP}${householdId}${this.SEP}${location}`;
  }

  static plantsSearch(householdId: string, query: string): string {
    return `plants${this.SEP}search${this.SEP}${householdId}${this.SEP}${query}`;
  }

  static plantsWithWatering(householdId: string): string {
    return `plants${this.SEP}watering${this.SEP}${householdId}`;
  }

  // ============================================================================
  // PHOTO KEYS
  // ============================================================================

  static plantPhotos(plantId: string, householdId: string): string {
    return `photos${this.SEP}plant${this.SEP}${plantId}${this.SEP}household${this.SEP}${householdId}`;
  }

  static plantPhotosOldest(plantId: string, householdId: string): string {
    return `photos${this.SEP}oldest${this.SEP}plant${this.SEP}${plantId}${this.SEP}household${this.SEP}${householdId}`;
  }

  static allPhotos(householdId: string): string {
    return `photos${this.SEP}all${this.SEP}household${this.SEP}${householdId}`;
  }

  static batchThumbnails(householdId: string, plantIds: string[]): string {
    return `thumbnails${this.SEP}batch${this.SEP}${householdId}${this.SEP}${[...plantIds].sort().join(",")}`;
  }

  // ============================================================================
  // TAG KEYS
  // ============================================================================

  static allTags(householdId: string): string {
    return `tags${this.SEP}all${this.SEP}household${this.SEP}${householdId}`;
  }

  static plantTags(plantId: string, householdId: string): string {
    return `tags${this.SEP}plant${this.SEP}${plantId}${this.SEP}household${this.SEP}${householdId}`;
  }

  // ============================================================================
  // EVENT KEYS (if needed in the future)
  // ============================================================================

  static plantEvents(plantId: string): string {
    return `events${this.SEP}plant${this.SEP}${plantId}`;
  }

  static recentEvents(householdId: string, limit: number): string {
    return `events${this.SEP}recent${this.SEP}${householdId}${this.SEP}${limit}`;
  }

  // ============================================================================
  // NOTE KEYS (if needed in the future)
  // ============================================================================

  static plantNotes(plantId: string): string {
    return `notes${this.SEP}plant${this.SEP}${plantId}`;
  }
}
