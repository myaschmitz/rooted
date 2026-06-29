/**
 * Domain Constants
 *
 * This module centralizes all configuration values, magic numbers, and
 * implementation details that would otherwise leak across the codebase.
 *
 * By keeping these values in one place:
 * 1. Changes only need to happen here
 * 2. The rest of the codebase doesn't need to know implementation details
 * 3. Values are easy to find and reason about
 */

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/**
 * Cache TTL (Time To Live) values in milliseconds.
 * These control how long data is considered "fresh" before needing a refetch.
 */
export const CACHE_TTL = {
  // Plant data - moderately stable
  PLANTS_LIST: 5 * 60 * 1000, // 5 minutes
  PLANT_SINGLE: 10 * 60 * 1000, // 10 minutes
  PLANTS_BY_LOCATION: 5 * 60 * 1000, // 5 minutes
  PLANTS_SEARCH: 2 * 60 * 1000, // 2 minutes (searches change more)
  PLANTS_WITH_WATERING: 5 * 60 * 1000, // 5 minutes

  // Photo data - very stable, expensive to fetch
  PHOTOS_LIST: 10 * 60 * 1000, // 10 minutes
  PHOTOS_ALL: 10 * 60 * 1000, // 10 minutes
  THUMBNAIL: 30 * 60 * 1000, // 30 minutes
  BATCH_THUMBNAILS: 10 * 60 * 1000, // 10 minutes

  // Event data - changes more frequently
  EVENTS_LIST: 5 * 60 * 1000, // 5 minutes
  EVENTS_RECENT: 2 * 60 * 1000, // 2 minutes
  EVENTS_ALL: 5 * 60 * 1000, // 5 minutes
  EVENTS_STATS: 3 * 60 * 1000, // 3 minutes
  BATCH_LAST_EVENTS: 3 * 60 * 1000, // 3 minutes

  // Tag data - fairly stable
  TAGS_ALL: 10 * 60 * 1000, // 10 minutes
  TAGS_BY_PLANT: 10 * 60 * 1000, // 10 minutes

  // Notes data
  NOTES_LIST: 10 * 60 * 1000, // 10 minutes

  // System/background tasks
  CACHE_REFRESH_INTERVAL: 30 * 60 * 1000, // 30 minutes
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes fallback
} as const;

/**
 * Garbage collection times for React Query.
 * Data is removed from cache after this time if not being used.
 */
export const CACHE_GC_TIME = {
  SHORT: 15 * 60 * 1000, // 15 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  VERY_LONG: 2 * 60 * 60 * 1000, // 2 hours
} as const;

// ============================================================================
// DATABASE TABLE NAMES
// ============================================================================

/**
 * Database table names.
 * Centralizes table name strings to prevent leakage.
 * If we rename tables, only this needs to change.
 */
export const DB_TABLES = {
  PLANTS: "plants",
  EVENTS: "events",
  PLANT_PHOTOS: "plant_photos",
  TAGS: "tags",
  PLANT_TAGS: "plant_tags",
  HOUSEHOLDS: "households",
  NOTES: "notes",
  HOUSEHOLD_USERS: "household_users",
  HOUSEHOLD_MEMBERS: "household_members",
  ACTIVITY_LOG: "activity_log",
} as const;

/**
 * Database column names that are frequently accessed.
 * Centralizes column name strings to prevent leakage.
 */
export const DB_COLUMNS = {
  HOUSEHOLD_ID: "household_id",
  PLANT_ID: "plant_id",
  EVENT_TYPE: "event_type",
} as const;

// ============================================================================
// STORAGE CONFIGURATION
// ============================================================================

/**
 * Supabase storage bucket configuration.
 * Centralizes all storage-related settings.
 */
export const STORAGE_CONFIG = {
  BUCKET_NAME: "plant-photos",
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/jpg"] as const,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
} as const;

/**
 * Image processing configuration.
 */
export const IMAGE_CONFIG = {
  THUMBNAIL_WIDTH: 300,
  COMPRESSION_QUALITY: 0.7,
  PICKER_QUALITY: 0.8,
} as const;

// ============================================================================
// ASYNC STORAGE KEYS
// ============================================================================

/**
 * AsyncStorage key constants.
 * Centralizes all persistent storage keys to prevent key collisions
 * and make storage management easier.
 */
export const STORAGE_KEYS = {
  USER_SESSION: "household_user_session",
  HOUSEHOLD_CACHE: "household_cache",
  THEME_MODE: "@rooted_theme_mode",
  FILTER_SELECTED_TAGS: "filter_selected_tags",
  SORT_PREFERENCES: "global_plant_sort_preferences",
  PINNED_PLANTS: "pinned_plants",
} as const;

// ============================================================================
// DATABASE ERROR CODES
// ============================================================================

/**
 * PostgreSQL/Supabase error codes abstracted into domain-specific names.
 * This hides the database implementation from the rest of the codebase.
 *
 * If we switch databases, only this mapping needs to change.
 */
export const DB_ERROR_CODES = {
  /** Record not found (PGRST116 - PostgREST "no rows returned") */
  NOT_FOUND: "PGRST116",
  /** Unique constraint violation (23505 - PostgreSQL) */
  DUPLICATE: "23505",
} as const;

/**
 * Check if an error indicates a "not found" condition.
 * Use this instead of checking error.code directly.
 */
export function isNotFoundError(
  error: { code?: string } | null | undefined,
): boolean {
  return error?.code === DB_ERROR_CODES.NOT_FOUND;
}

/**
 * Check if an error indicates a duplicate/unique constraint violation.
 * Use this instead of checking error.code directly.
 */
export function isDuplicateError(
  error: { code?: string } | null | undefined,
): boolean {
  return error?.code === DB_ERROR_CODES.DUPLICATE;
}

// ============================================================================
// FILE PATH UTILITIES
// ============================================================================

/**
 * Generate a photo filename following our naming convention.
 * Centralizes the file naming pattern so it only needs to change in one place.
 */
export function generatePhotoFilename(
  plantId: string,
  timestamp: number = Date.now(),
): {
  fullSize: string;
  thumbnail: string;
} {
  return {
    fullSize: `${plantId}_${timestamp}.jpg`,
    thumbnail: `${plantId}_${timestamp}_thumb.jpg`,
  };
}

/**
 * Generate an event photo filename.
 */
export function generateEventPhotoFilename(
  plantId: string,
  eventId: string,
  timestamp: number = Date.now(),
): {
  fullSize: string;
  thumbnail: string;
} {
  return {
    fullSize: `${plantId}_event_${eventId}_${timestamp}.jpg`,
    thumbnail: `${plantId}_event_${eventId}_${timestamp}_thumb.jpg`,
  };
}

/**
 * Extract filename from a URL or path.
 * Centralizes the path parsing logic.
 */
export function extractFilenameFromPath(path: string): string | null {
  if (!path) return null;
  const parts = path.split("/");
  return parts[parts.length - 1] || null;
}

/**
 * Generate thumbnail filename from original filename.
 * Inserts '_thumb' before the file extension.
 */
export function generateThumbnailFilename(originalFilename: string): string {
  return originalFilename.replace(/(\.[^.]+)$/, "_thumb$1");
}

/**
 * Check if a path is a cloud URL (vs local file path).
 */
export function isCloudUrl(path: string): boolean {
  return path.startsWith("http");
}

// ============================================================================
// QUERY CLIENT CONFIGURATION
// ============================================================================

/**
 * React Query client default configuration.
 * Centralizes query client settings for consistency.
 */
export const QUERY_CLIENT_CONFIG = {
  DEFAULT_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  DEFAULT_GC_TIME: 30 * 60 * 1000, // 30 minutes
  RETRY_COUNT: 3,
  MUTATION_RETRY_COUNT: 2,
  MAX_RETRY_DELAY: 30000, // 30 seconds
  RETRY_DELAY_BASE: 1000, // 1 second
  RETRY_DELAY_MULTIPLIER: 2,
} as const;

/**
 * Calculate exponential backoff delay for retries.
 */
export function calculateRetryDelay(attemptIndex: number): number {
  return Math.min(
    QUERY_CLIENT_CONFIG.RETRY_DELAY_BASE *
      QUERY_CLIENT_CONFIG.RETRY_DELAY_MULTIPLIER ** attemptIndex,
    QUERY_CLIENT_CONFIG.MAX_RETRY_DELAY,
  );
}

// ============================================================================
// IMAGE PICKER CONFIGURATION
// ============================================================================

/**
 * Image picker configuration for all photo selection.
 * Centralizes image picker settings across the app.
 *
 * Note: MEDIA_TYPES should be used inline as ['images'] due to expo-image-picker type constraints
 */
export const IMAGE_PICKER_CONFIG = {
  ALLOWS_EDITING: false,
  QUALITY: 0.8,
  ALLOWS_MULTIPLE_SELECTION: false,
};

// ============================================================================
// POLLING/REFRESH CONFIGURATION
// ============================================================================

export const POLLING_CONFIG = {
  HOME_PAGE_REFRESH: 2 * 60 * 1000, // 2 minutes
} as const;

// ============================================================================
// BATCH PROCESSING
// ============================================================================

export const BATCH_CONFIG = {
  TAGS_BATCH_SIZE: 20,
  PHOTO_GENERATION_BATCH_SIZE: 5,
  PHOTO_GENERATION_DELAY_MS: 1000,
} as const;
