import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { PlantPhoto } from "../types/Plant";
import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { PlantService } from "./PlantService";
import { CacheService } from "./CacheService";
import { CachedPhotoService } from "./CachedPhotoService";
import { CacheInvalidationService } from "./CacheInvalidationService";
import type { Database } from "../types/Database";
import {
  CACHE_TTL,
  STORAGE_CONFIG,
  IMAGE_CONFIG,
  IMAGE_PICKER_CONFIG,
  isNotFoundError,
  generatePhotoFilename,
  generateEventPhotoFilename,
  extractFilenameFromPath,
  generateThumbnailFilename,
  isCloudUrl,
  BATCH_CONFIG,
  DB_TABLES,
  DB_COLUMNS,
} from "../constants/domain";
import { ErrorMapper } from "../errors/ErrorMapper";
import { CacheKeyBuilder } from "./CacheKeyBuilder";

type PlantPhotoRow = Database["public"]["Tables"]["plant_photos"]["Row"];
type PlantPhotoInsert = Database["public"]["Tables"]["plant_photos"]["Insert"];
type PlantPhotoUpdate = Database["public"]["Tables"]["plant_photos"]["Update"];

export class PhotoService {
  private static readonly STORAGE_BUCKET = STORAGE_CONFIG.BUCKET_NAME;
  private static readonly THUMBNAIL_SIZE = IMAGE_CONFIG.THUMBNAIL_WIDTH;

  static async ensurePhotosDirectory(): Promise<void> {
    // No-op on web — no local file system
  }

  static async createThumbnail(sourceUri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: this.THUMBNAIL_SIZE } }],
        {
          compress: IMAGE_CONFIG.COMPRESSION_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );
      return result.uri;
    } catch (error) {
      console.error("Error creating thumbnail:", error);
      throw new Error("Failed to create thumbnail");
    }
  }

  static getImageUrl(photo: PlantPhoto, useThumbnail: boolean = false): string {
    if (useThumbnail && photo.thumbnail_path) {
      return photo.thumbnail_path;
    }
    return photo.file_path;
  }

  static async getCachedImageUrl(
    photo: PlantPhoto,
    useThumbnail: boolean = false,
  ): Promise<string> {
    return await CachedPhotoService.getCachedPhotoUrl(photo, useThumbnail);
  }

  /**
   * Web-specific upload: fetches a blob from a URI (data: or blob:)
   * and uploads it to Supabase Storage.
   */
  static async uploadFileToStorage(
    fileUri: string,
    fileName: string,
  ): Promise<string | null> {
    try {
      console.log("Starting web upload for file:", fileName);

      const response = await fetch(fileUri);
      const blob = await response.blob();
      console.log("Blob created, size:", blob.size);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw uploadError;
      }

      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from(this.STORAGE_BUCKET)
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }

      return null;
    } catch (error) {
      console.error("Failed to upload to cloud storage:", error);
      return null;
    }
  }

  static async getPhotosByPlantId(plantId: string): Promise<PlantPhoto[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantPhotos(plantId, session.household_id);

    const cached = await CacheService.getCachedResponse<PlantPhoto[]>(cacheKey);
    if (cached) {
      CachedPhotoService.preloadThumbnails(cached, "medium").catch(() => {});
      return cached;
    }

    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error("Plant not found or not accessible");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select("*")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("taken_at", { ascending: false });

    if (error) {
      console.error("Error fetching photos:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    const photos = (data || []) as PlantPhoto[];

    await CacheService.cacheApiResponse(cacheKey, photos, CACHE_TTL.PHOTOS_LIST);
    CachedPhotoService.preloadThumbnails(photos, "medium").catch(() => {});

    return photos;
  }

  static async getPhotosByPlantIdOldestFirst(plantId: string): Promise<PlantPhoto[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantPhotosOldest(plantId, session.household_id);

    const cached = await CacheService.getCachedResponse<PlantPhoto[]>(cacheKey);
    if (cached) return cached;

    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error("Plant not found or not accessible");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select("*")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("taken_at", { ascending: true });

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    const photos = (data || []) as PlantPhoto[];
    await CacheService.cacheApiResponse(cacheKey, photos, CACHE_TTL.PHOTOS_LIST);
    return photos;
  }

  static async pickAndSavePhoto(plantId: string, caption?: string): Promise<PlantPhoto | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        allowsMultipleSelection: IMAGE_PICKER_CONFIG.ALLOWS_MULTIPLE_SELECTION,
      });

      if (result.canceled) return null;
      return await this.savePhoto(plantId, result.assets[0].uri, caption);
    } catch (error) {
      console.error("Error picking photo:", error);
      throw error;
    }
  }

  static async takeAndSavePhoto(plantId: string, caption?: string): Promise<PlantPhoto | null> {
    // Camera API may not be available on web — fall back to file picker
    return this.pickAndSavePhoto(plantId, caption);
  }

  static async takePhoto(): Promise<{ uri: string } | null> {
    // On web, camera access is limited — fall back to file picker
    return this.pickPhoto();
  }

  static async pickPhoto(): Promise<{ uri: string } | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        allowsMultipleSelection: IMAGE_PICKER_CONFIG.ALLOWS_MULTIPLE_SELECTION,
      });

      if (result.canceled) return null;
      return { uri: result.assets[0].uri };
    } catch (error) {
      console.error("Error picking photo:", error);
      throw error;
    }
  }

  static async pickMultiplePhotos(): Promise<{ uri: string }[] | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        allowsMultipleSelection: true,
      });

      if (result.canceled) return null;
      return result.assets.map((asset) => ({ uri: asset.uri }));
    } catch (error) {
      console.error("Error picking multiple photos:", error);
      throw error;
    }
  }

  static async saveEventPhoto(
    plantId: string,
    eventId: string,
    sourceUri: string,
    caption?: string,
  ): Promise<PlantPhoto> {
    try {
      const { fullSize: fullSizeFileName, thumbnail: thumbnailFileName } =
        generateEventPhotoFilename(plantId, eventId);

      // Create thumbnail
      const thumbnailUri = await this.createThumbnail(sourceUri);

      // Upload both versions to Supabase Storage in parallel
      const [cloudFullSizePath, cloudThumbnailPath] = await Promise.all([
        this.uploadFileToStorage(sourceUri, fullSizeFileName),
        this.uploadFileToStorage(thumbnailUri, thumbnailFileName),
      ]);

      if (!cloudFullSizePath) {
        throw new Error("Failed to upload photo to cloud storage.");
      }

      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error("Plant not found or not accessible");
      }

      const now = new Date().toISOString();
      const photoInsert: PlantPhotoInsert = {
        plant_id: plantId,
        event_id: eventId,
        file_path: cloudFullSizePath,
        thumbnail_path: cloudThumbnailPath || undefined,
        caption: caption || undefined,
        taken_at: now,
        household_id: session.household_id,
      };

      const { data, error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .insert(photoInsert)
        .select()
        .single();

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "create", "photo");
      }

      await CacheInvalidationService.invalidateOnUserAction("photo_added", {
        entityId: plantId,
      });

      return data as PlantPhoto;
    } catch (error) {
      console.error("Error saving event photo:", error);
      throw error;
    }
  }

  static async saveMultipleEventPhotos(
    plantId: string,
    eventId: string,
    sourceUris: string[],
    caption?: string,
  ): Promise<PlantPhoto[]> {
    const savedPhotos: PlantPhoto[] = [];
    for (const sourceUri of sourceUris) {
      try {
        const photo = await this.saveEventPhoto(plantId, eventId, sourceUri, caption);
        savedPhotos.push(photo);
      } catch (error) {
        console.error(`Failed to save photo ${sourceUri}:`, error);
      }
    }
    return savedPhotos;
  }

  static async getPhotosByEventId(eventId: string): Promise<PlantPhoto[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select("*")
      .eq("event_id", eventId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("taken_at", { ascending: false });

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    return (data || []) as PlantPhoto[];
  }

  static async linkPhotoToEvent(photoId: string, eventId: string): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .update({ event_id: eventId, updated_at: new Date().toISOString() } as PlantPhotoUpdate)
      .eq("id", photoId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throw ErrorMapper.mapDatabaseError(error, "update", "photo");
    }

    return data as PlantPhoto;
  }

  static async unlinkPhotoFromEvent(photoId: string): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .update({ event_id: null, updated_at: new Date().toISOString() } as PlantPhotoUpdate)
      .eq("id", photoId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throw ErrorMapper.mapDatabaseError(error, "update", "photo");
    }

    return data as PlantPhoto;
  }

  static async savePhoto(plantId: string, sourceUri: string, caption?: string): Promise<PlantPhoto> {
    try {
      const { fullSize: fullSizeFileName, thumbnail: thumbnailFileName } =
        generatePhotoFilename(plantId);

      const thumbnailUri = await this.createThumbnail(sourceUri);

      const [cloudFullSizePath, cloudThumbnailPath] = await Promise.all([
        this.uploadFileToStorage(sourceUri, fullSizeFileName),
        this.uploadFileToStorage(thumbnailUri, thumbnailFileName),
      ]);

      if (!cloudFullSizePath) {
        throw new Error("Failed to upload photo to cloud storage.");
      }

      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error("Plant not found or not accessible");
      }

      const now = new Date().toISOString();
      const photoInsert: PlantPhotoInsert = {
        plant_id: plantId,
        file_path: cloudFullSizePath,
        thumbnail_path: cloudThumbnailPath || undefined,
        caption: caption || undefined,
        taken_at: now,
        household_id: session.household_id,
      };

      const { data, error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .insert(photoInsert)
        .select()
        .single();

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "create", "photo");
      }

      // Auto-set as thumbnail if plant has none
      const { data: plantData } = await supabase
        .from(DB_TABLES.PLANTS)
        .select("thumbnail_photo_id")
        .eq("id", plantId)
        .single();

      if (plantData && !plantData.thumbnail_photo_id && data) {
        await supabase
          .from(DB_TABLES.PLANTS)
          .update({ thumbnail_photo_id: data.id, updated_at: now })
          .eq("id", plantId);
      }

      await CacheInvalidationService.invalidateOnUserAction("photo_added", {
        entityId: plantId,
      });

      return data as PlantPhoto;
    } catch (error) {
      console.error("Error saving photo:", error);
      throw error;
    }
  }

  static async updatePhotoCaption(photoId: string, caption: string): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .update({ caption, updated_at: new Date().toISOString() } as PlantPhotoUpdate)
      .eq("id", photoId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throw ErrorMapper.mapDatabaseError(error, "update", "photo");
    }

    return data as PlantPhoto;
  }

  static async getPhotoById(id: string): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select("*")
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .single();

    if (error) {
      if (isNotFoundError(error)) return null;
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    return data as PlantPhoto;
  }

  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      // Get current household session for filtering
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const photo = await this.getPhotoById(photoId);
      if (!photo) return false;

      // Delete from cloud storage
      const filesToDelete: string[] = [];

      if (isCloudUrl(photo.file_path)) {
        const fileName = extractFilenameFromPath(photo.file_path);
        if (fileName) filesToDelete.push(fileName);
      }

      if (photo.thumbnail_path && isCloudUrl(photo.thumbnail_path)) {
        const thumbnailFileName = extractFilenameFromPath(photo.thumbnail_path);
        if (thumbnailFileName) filesToDelete.push(thumbnailFileName);
      }

      if (filesToDelete.length > 0) {
        try {
          await supabase.storage.from(this.STORAGE_BUCKET).remove(filesToDelete);
        } catch (storageError) {
          console.warn("Failed to delete files from cloud storage:", storageError);
        }
      }

      const { error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .delete()
        .eq("id", photoId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "delete", "photo");
      }

      if (photo) {
        await CacheInvalidationService.invalidateOnUserAction("photo_deleted", {
          entityId: photo.plant_id,
          clearPhotoCache: true,
        });
      }

      return true;
    } catch (error) {
      console.error("Error deleting photo:", error);
      return false;
    }
  }

  static async getAllPhotos(): Promise<PlantPhoto[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.allPhotos(session.household_id);

    const cached = await CacheService.getCachedResponse<PlantPhoto[]>(cacheKey);
    if (cached) {
      CachedPhotoService.preloadThumbnails(cached, "low").catch(() => {});
      return cached;
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("taken_at", { ascending: false });

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    const photos = (data || []) as PlantPhoto[];
    await CacheService.cacheApiResponse(cacheKey, photos, CACHE_TTL.PHOTOS_ALL);
    CachedPhotoService.preloadThumbnails(photos, "low").catch(() => {});
    return photos;
  }

  static async cleanupOrphanedPhotos(): Promise<void> {
    // No local file system on web — only cloud cleanup needed
    console.log("Orphaned photo cleanup is not available on web");
  }

  static async deleteAllPhotos(): Promise<void> {
    try {
      // Get current household session — only delete photos for the current
      // household, never every row in the table.
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const photos = await this.getAllPhotos();

      for (const photo of photos) {
        try {
          if (isCloudUrl(photo.file_path)) {
            const fileName = extractFilenameFromPath(photo.file_path);
            if (fileName) {
              await supabase.storage.from(this.STORAGE_BUCKET).remove([fileName]);
            }
          }
        } catch (error) {
          console.error(`Error deleting photo file ${photo.file_path}:`, error);
        }
      }

      const { error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .delete()
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "delete", "photo");
      }
    } catch (error) {
      console.error("Error deleting all photos:", error);
      throw error;
    }
  }

  static async setThumbnailPhoto(plantId: string, photoId: string): Promise<void> {
    try {
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const plant = await PlantService.getPlantById(plantId);
      if (!plant) throw new Error("Plant not found or not accessible");

      const photo = await this.getPhotoById(photoId);
      if (!photo) throw new Error("Photo not found or not accessible");

      const { error } = await supabase
        .from(DB_TABLES.PLANTS)
        .update({ thumbnail_photo_id: photoId, updated_at: new Date().toISOString() })
        .eq("id", plantId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "update", "photo");
      }

      const plantCacheKey = `plant-${plantId}-${session.household_id}`;
      await CacheService.invalidateCache(plantCacheKey);
    } catch (error) {
      console.error("Error setting thumbnail photo:", error);
      throw error;
    }
  }

  static async clearThumbnailPhoto(plantId: string): Promise<void> {
    try {
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const plant = await PlantService.getPlantById(plantId);
      if (!plant) throw new Error("Plant not found or not accessible");

      const { error } = await supabase
        .from(DB_TABLES.PLANTS)
        .update({ thumbnail_photo_id: null, updated_at: new Date().toISOString() })
        .eq("id", plantId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "update", "photo");
      }
    } catch (error) {
      console.error("Error clearing thumbnail photo:", error);
      throw error;
    }
  }

  static async testStorageConnection(): Promise<{
    success: boolean;
    error?: string;
    bucketExists?: boolean;
  }> {
    try {
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .list("", { limit: 1 });

      if (error) {
        if (error.message?.includes("bucket") && error.message?.includes("not found")) {
          return { success: false, error: "Bucket does not exist", bucketExists: false };
        }
        return { success: false, error: error.message || "Unknown storage error" };
      }

      return { success: true, bucketExists: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async createStorageBucket(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.storage.createBucket(this.STORAGE_BUCKET, {
        public: true,
        allowedMimeTypes: [...STORAGE_CONFIG.ALLOWED_MIME_TYPES],
        fileSizeLimit: STORAGE_CONFIG.MAX_FILE_SIZE_BYTES,
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async getThumbnailPhoto(plantId: string): Promise<PlantPhoto | null> {
    try {
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const plant = await PlantService.getPlantById(plantId);
      if (!plant) return null;
      if (!plant.thumbnail_photo_id) return null;

      return await this.getPhotoById(plant.thumbnail_photo_id);
    } catch (error) {
      console.error("Error getting thumbnail photo:", error);
      return null;
    }
  }

  static async getBatchThumbnailPhotos(
    plantIds: string[],
  ): Promise<{ [plantId: string]: PlantPhoto | null }> {
    try {
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const cacheKey = CacheKeyBuilder.batchThumbnails(session.household_id, plantIds);

      const cached = await CacheService.getCachedResponse<{
        [plantId: string]: PlantPhoto | null;
      }>(cacheKey);
      if (cached) return cached;

      const { data: plants, error: plantsError } = await supabase
        .from(DB_TABLES.PLANTS)
        .select("id, thumbnail_photo_id")
        .in("id", plantIds)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (plantsError) {
        throw new Error(`Failed to fetch plants: ${plantsError.message}`);
      }

      const result: { [plantId: string]: PlantPhoto | null } = {};
      plantIds.forEach((id) => { result[id] = null; });

      if (!plants || plants.length === 0) {
        await CacheService.cacheApiResponse(cacheKey, result, CACHE_TTL.BATCH_THUMBNAILS);
        return result;
      }

      const thumbnailPhotoIds = plants
        .filter((plant) => plant.thumbnail_photo_id)
        .map((plant) => plant.thumbnail_photo_id!)
        .filter((id, index, arr) => arr.indexOf(id) === index);

      if (thumbnailPhotoIds.length === 0) {
        await CacheService.cacheApiResponse(cacheKey, result, 10 * 60 * 1000);
        return result;
      }

      const { data: thumbnailPhotos, error: photosError } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .select("*")
        .in("id", thumbnailPhotoIds)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (!photosError && thumbnailPhotos) {
        const photoMap = new Map<string, PlantPhoto>();
        thumbnailPhotos.forEach((photo) => {
          photoMap.set(photo.id, photo as PlantPhoto);
        });

        plants.forEach((plant) => {
          if (plant.thumbnail_photo_id && photoMap.has(plant.thumbnail_photo_id)) {
            result[plant.id] = photoMap.get(plant.thumbnail_photo_id)!;
          }
        });
      }

      await CacheService.cacheApiResponse(cacheKey, result, CACHE_TTL.BATCH_THUMBNAILS);
      return result;
    } catch (error) {
      console.error("Error getting batch thumbnail photos:", error);
      const result: { [plantId: string]: PlantPhoto | null } = {};
      plantIds.forEach((id) => { result[id] = null; });
      return result;
    }
  }

  static async generateThumbnailsForExistingPhotos(): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    try {
      const { data: photosWithoutThumbnails, error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .select("*")
        .is("thumbnail_path", null);

      if (error) {
        throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
      }

      if (!photosWithoutThumbnails || photosWithoutThumbnails.length === 0) {
        return { success: 0, failed: 0, skipped: 0 };
      }

      let success = 0;
      let failed = 0;
      let skipped = 0;

      const batchSize = BATCH_CONFIG.PHOTO_GENERATION_BATCH_SIZE;
      for (let i = 0; i < photosWithoutThumbnails.length; i += batchSize) {
        const batch = photosWithoutThumbnails.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (photo) => {
            try {
              if (!isCloudUrl(photo.file_path)) {
                skipped++;
                return;
              }

              const thumbnailUri = await this.createThumbnail(photo.file_path);
              const originalFileName = extractFilenameFromPath(photo.file_path);
              if (!originalFileName) {
                failed++;
                return;
              }

              const thumbnailFileName = generateThumbnailFilename(originalFileName);
              const cloudThumbnailPath = await this.uploadFileToStorage(
                thumbnailUri,
                thumbnailFileName,
              );

              if (!cloudThumbnailPath) {
                failed++;
                return;
              }

              const { error: updateError } = await supabase
                .from(DB_TABLES.PLANT_PHOTOS)
                .update({ thumbnail_path: cloudThumbnailPath, updated_at: new Date().toISOString() })
                .eq("id", photo.id);

              if (updateError) {
                failed++;
              } else {
                success++;
              }
            } catch (error) {
              console.error(`Failed to generate thumbnail for photo ${photo.id}:`, error);
              failed++;
            }
          }),
        );

        if (i + batchSize < photosWithoutThumbnails.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return { success, failed, skipped };
    } catch (error) {
      console.error("Error generating thumbnails:", error);
      throw error;
    }
  }

  static async downloadPhoto(_photo: PlantPhoto): Promise<boolean> {
    // On web, open the image in a new tab for download
    try {
      const url = this.getImageUrl(_photo, false);
      window.open(url, '_blank');
      return true;
    } catch (error) {
      console.error("Error downloading photo on web:", error);
      return false;
    }
  }
}
