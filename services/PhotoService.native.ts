import { File, Directory, Paths } from "expo-file-system";
import { logger } from "../utils/logger";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
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
  private static get PHOTOS_DIR(): Directory {
    return new Directory(Paths.document, "plant_photos");
  }
  private static readonly STORAGE_BUCKET = STORAGE_CONFIG.BUCKET_NAME;
  private static readonly THUMBNAIL_SIZE = IMAGE_CONFIG.THUMBNAIL_WIDTH;

  static async ensurePhotosDirectory(): Promise<void> {
    if (!this.PHOTOS_DIR.exists) {
      await this.PHOTOS_DIR.create({ intermediates: true });
    }
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
    // Return thumbnail if requested and available, otherwise fall back to full-size
    if (useThumbnail && photo.thumbnail_path) {
      return photo.thumbnail_path;
    }
    return photo.file_path;
  }

  // Get cached image URL for better performance
  static async getCachedImageUrl(
    photo: PlantPhoto,
    useThumbnail: boolean = false,
  ): Promise<string> {
    return await CachedPhotoService.getCachedPhotoUrl(photo, useThumbnail);
  }

  static async uploadFileToStorage(
    filePath: string,
    fileName: string,
  ): Promise<string | null> {
    try {
      logger.debug("Starting cloud upload for file:", fileName);
      const file = new File(filePath);
      if (!file.exists) {
        console.error("Local file does not exist:", filePath);
        return null;
      }

      const fileInfo = await file.info();
      logger.debug("Local file exists, size:", fileInfo.size);

      // Read file as base64
      const fileContent = await file.base64();
      logger.debug("File read as base64, length:", fileContent.length);

      // Convert base64 to Uint8Array for React Native
      const binaryString = atob(fileContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      logger.debug("Converted to Uint8Array, size:", bytes.length);

      // Upload to Supabase Storage
      logger.debug("Uploading to bucket:", this.STORAGE_BUCKET);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(fileName, bytes, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase storage upload error:", uploadError);
        throw uploadError;
      }

      if (uploadData) {
        logger.debug("Upload successful:", uploadData);
        // Get public URL
        const { data: urlData } = supabase.storage
          .from(this.STORAGE_BUCKET)
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          logger.debug("Public URL obtained:", urlData.publicUrl);
          return urlData.publicUrl;
        } else {
          console.error("Failed to get public URL for uploaded file");
          return null;
        }
      } else {
        console.error("Upload succeeded but no data returned");
        return null;
      }
    } catch (error) {
      console.error("Failed to upload to cloud storage:", error);
      return null;
    }
  }

  static async getPhotosByPlantId(plantId: string): Promise<PlantPhoto[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantPhotos(plantId, session.household_id);

    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<PlantPhoto[]>(cacheKey);
    if (cached) {
      // Preload thumbnails in background for cached results
      CachedPhotoService.preloadThumbnails(cached, "medium").catch(() => {});
      return cached;
    }

    // Verify plant belongs to current household
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

    await CacheService.cacheApiResponse(
      cacheKey,
      photos,
      CACHE_TTL.PHOTOS_LIST,
    );

    // Preload thumbnails in background
    CachedPhotoService.preloadThumbnails(photos, "medium").catch(() => {});

    return photos;
  }

  static async getPhotosByPlantIdOldestFirst(
    plantId: string,
  ): Promise<PlantPhoto[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantPhotosOldest(
      plantId,
      session.household_id,
    );

    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<PlantPhoto[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Verify plant belongs to current household
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
      console.error("Error fetching photos:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    const photos = (data || []) as PlantPhoto[];

    await CacheService.cacheApiResponse(
      cacheKey,
      photos,
      CACHE_TTL.PHOTOS_LIST,
    );

    return photos;
  }

  static async pickAndSavePhoto(
    plantId: string,
    caption?: string,
  ): Promise<PlantPhoto | null> {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error("Permission to access camera roll is required!");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        allowsMultipleSelection: IMAGE_PICKER_CONFIG.ALLOWS_MULTIPLE_SELECTION,
      });

      if (result.canceled) {
        return null;
      }

      return await this.savePhoto(plantId, result.assets[0].uri, caption);
    } catch (error) {
      console.error("Error picking photo:", error);
      throw error;
    }
  }

  static async takeAndSavePhoto(
    plantId: string,
    caption?: string,
  ): Promise<PlantPhoto | null> {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error("Permission to access camera is required!");
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        cameraType: ImagePicker.CameraType.back,
        allowsMultipleSelection: IMAGE_PICKER_CONFIG.ALLOWS_MULTIPLE_SELECTION,
      });

      if (result.canceled) {
        return null;
      }

      return await this.savePhoto(plantId, result.assets[0].uri, caption);
    } catch (error) {
      console.error("Error taking photo:", error);
      throw error;
    }
  }

  static async takePhoto(): Promise<{ uri: string } | null> {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error("Permission to access camera is required!");
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        cameraType: ImagePicker.CameraType.back,
        allowsMultipleSelection: IMAGE_PICKER_CONFIG.ALLOWS_MULTIPLE_SELECTION,
      });

      if (result.canceled) {
        return null;
      }

      return { uri: result.assets[0].uri };
    } catch (error) {
      console.error("Error taking photo:", error);
      throw error;
    }
  }

  static async pickPhoto(): Promise<{ uri: string } | null> {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error("Permission to access camera roll is required!");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        allowsMultipleSelection: IMAGE_PICKER_CONFIG.ALLOWS_MULTIPLE_SELECTION,
      });

      if (result.canceled) {
        return null;
      }

      return { uri: result.assets[0].uri };
    } catch (error) {
      console.error("Error picking photo:", error);
      throw error;
    }
  }

  static async pickMultiplePhotos(): Promise<{ uri: string }[] | null> {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error("Permission to access camera roll is required!");
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: IMAGE_PICKER_CONFIG.ALLOWS_EDITING,
        quality: IMAGE_PICKER_CONFIG.QUALITY,
        allowsMultipleSelection: true,
      });

      if (result.canceled) {
        return null;
      }

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
      await this.ensurePhotosDirectory();

      // Generate unique filenames using centralized naming convention
      const { fullSize: fullSizeFileName, thumbnail: thumbnailFileName } =
        generateEventPhotoFilename(plantId, eventId);
      const localFullSizeFile = new File(this.PHOTOS_DIR, fullSizeFileName);

      // Copy full-size file to local storage for offline access
      await new File(sourceUri).copy(localFullSizeFile);

      // Create thumbnail
      logger.debug("Creating thumbnail...");
      const thumbnailUri = await this.createThumbnail(sourceUri);
      const localThumbnailFile = new File(this.PHOTOS_DIR, thumbnailFileName);

      // Copy thumbnail to local storage
      await new File(thumbnailUri).copy(localThumbnailFile);

      // Upload both versions to Supabase Storage in parallel
      logger.debug("Uploading full-size and thumbnail to cloud storage...");
      const [cloudFullSizePath, cloudThumbnailPath] = await Promise.all([
        this.uploadFileToStorage(localFullSizeFile.uri, fullSizeFileName),
        this.uploadFileToStorage(localThumbnailFile.uri, thumbnailFileName),
      ]);

      // Clean up local files after processing
      try {
        await localFullSizeFile.delete();
        await localThumbnailFile.delete();
        await new File(thumbnailUri).delete();
      } catch (cleanupError) {
        console.warn("Failed to clean up local files:", cleanupError);
      }

      if (!cloudFullSizePath) {
        throw new Error(
          "Failed to upload full-size photo to cloud storage. Please check your internet connection and try again.",
        );
      }

      if (!cloudThumbnailPath) {
        console.warn(
          "Failed to upload thumbnail to cloud storage, but proceeding with full-size image only.",
        );
      }

      // Get current household session and verify access
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
        console.error("Error saving event photo to database:", error);
        throw ErrorMapper.mapDatabaseError(error, "create", "photo");
      }

      logger.debug("Event photo saved successfully");

      // Invalidate relevant caches
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
        const photo = await this.saveEventPhoto(
          plantId,
          eventId,
          sourceUri,
          caption,
        );
        savedPhotos.push(photo);
      } catch (error) {
        console.error(`Failed to save photo ${sourceUri}:`, error);
        // Continue with other photos even if one fails
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
      console.error("Error fetching event photos:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    return (data || []) as PlantPhoto[];
  }

  static async linkPhotoToEvent(
    photoId: string,
    eventId: string,
  ): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const photoUpdate: PlantPhotoUpdate = {
      event_id: eventId,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .update(photoUpdate)
      .eq("id", photoId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error linking photo to event:", error);
      throw ErrorMapper.mapDatabaseError(error, "update", "photo");
    }

    return data as PlantPhoto;
  }

  static async unlinkPhotoFromEvent(
    photoId: string,
  ): Promise<PlantPhoto | null> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const photoUpdate: PlantPhotoUpdate = {
      event_id: null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .update(photoUpdate)
      .eq("id", photoId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error unlinking photo from event:", error);
      throw ErrorMapper.mapDatabaseError(error, "update", "photo");
    }

    return data as PlantPhoto;
  }

  static async savePhoto(
    plantId: string,
    sourceUri: string,
    caption?: string,
  ): Promise<PlantPhoto> {
    try {
      await this.ensurePhotosDirectory();

      // Generate unique filenames using centralized naming convention
      const { fullSize: fullSizeFileName, thumbnail: thumbnailFileName } =
        generatePhotoFilename(plantId);
      const localFullSizeFile = new File(this.PHOTOS_DIR, fullSizeFileName);

      // Copy full-size file to local storage for offline access
      await new File(sourceUri).copy(localFullSizeFile);

      // Create thumbnail
      logger.debug("Creating thumbnail...");
      const thumbnailUri = await this.createThumbnail(sourceUri);
      const localThumbnailFile = new File(this.PHOTOS_DIR, thumbnailFileName);

      // Copy thumbnail to local storage
      await new File(thumbnailUri).copy(localThumbnailFile);

      // Upload both versions to Supabase Storage in parallel
      logger.debug("Uploading full-size and thumbnail to cloud storage...");
      const [cloudFullSizePath, cloudThumbnailPath] = await Promise.all([
        this.uploadFileToStorage(localFullSizeFile.uri, fullSizeFileName),
        this.uploadFileToStorage(localThumbnailFile.uri, thumbnailFileName),
      ]);

      // Clean up local files after processing
      try {
        await localFullSizeFile.delete();
        await localThumbnailFile.delete();
        // Clean up the temporary thumbnail from ImageManipulator
        await new File(thumbnailUri).delete();
      } catch (cleanupError) {
        console.warn("Failed to clean up local files:", cleanupError);
      }

      // Only proceed if we have both cloud URLs
      if (!cloudFullSizePath) {
        throw new Error(
          "Failed to upload full-size photo to cloud storage. Please check your internet connection and try again.",
        );
      }

      if (!cloudThumbnailPath) {
        console.warn(
          "Failed to upload thumbnail to cloud storage, but proceeding with full-size image only.",
        );
      }

      // Get current household session and verify plant access
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      // Verify plant belongs to current household
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

      // Save to Supabase database
      const { data, error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .insert(photoInsert)
        .select()
        .single();

      if (error) {
        console.error("Error saving photo to database:", error);
        throw ErrorMapper.mapDatabaseError(error, "create", "photo");
      }

      // Check if this plant has no thumbnail yet, and if so, set this as the thumbnail
      const { data: plantData, error: plantError } = await supabase
        .from(DB_TABLES.PLANTS)
        .select("thumbnail_photo_id")
        .eq("id", plantId)
        .single();

      if (!plantError && plantData && !plantData.thumbnail_photo_id && data) {
        await supabase
          .from(DB_TABLES.PLANTS)
          .update({
            thumbnail_photo_id: data.id,
            updated_at: now,
          })
          .eq("id", plantId);
      }

      logger.debug(
        "Photo saved successfully with full-size and thumbnail versions",
      );

      // Invalidate relevant caches
      await CacheInvalidationService.invalidateOnUserAction("photo_added", {
        entityId: plantId,
      });

      return data as PlantPhoto;
    } catch (error) {
      console.error("Error saving photo:", error);
      throw error;
    }
  }

  static async updatePhotoCaption(
    photoId: string,
    caption: string,
  ): Promise<PlantPhoto | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const photoUpdate: PlantPhotoUpdate = {
      caption,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .update(photoUpdate)
      .eq("id", photoId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error updating photo caption:", error);
      throw ErrorMapper.mapDatabaseError(error, "update", "photo");
    }

    return data as PlantPhoto;
  }

  static async getPhotoById(id: string): Promise<PlantPhoto | null> {
    // Get current household session for filtering
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
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error fetching photo:", error);
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

      // Delete both full-size and thumbnail from Supabase Storage
      const filesToDelete: string[] = [];

      // Add full-size file to deletion list
      if (isCloudUrl(photo.file_path)) {
        const fileName = extractFilenameFromPath(photo.file_path);
        if (fileName) {
          filesToDelete.push(fileName);
        }
      }

      // Add thumbnail file to deletion list
      if (photo.thumbnail_path && isCloudUrl(photo.thumbnail_path)) {
        const thumbnailFileName = extractFilenameFromPath(photo.thumbnail_path);
        if (thumbnailFileName) {
          filesToDelete.push(thumbnailFileName);
        }
      }

      // Delete files from cloud storage
      if (filesToDelete.length > 0) {
        try {
          await supabase.storage
            .from(this.STORAGE_BUCKET)
            .remove(filesToDelete);
          logger.debug(
            `Deleted ${filesToDelete.length} files from cloud storage:`,
            filesToDelete,
          );
        } catch (storageError) {
          console.warn(
            "Failed to delete files from cloud storage:",
            storageError,
          );
        }
      }

      // Handle local file deletion (legacy support)
      if (!isCloudUrl(photo.file_path)) {
        const file = new File(photo.file_path);
        if (file.exists) {
          await file.delete();
        }
      }

      // Delete from database
      const { error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .delete()
        .eq("id", photoId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        console.error("Error deleting photo from database:", error);
        throw ErrorMapper.mapDatabaseError(error, "delete", "photo");
      }

      // Invalidate relevant caches
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
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.allPhotos(session.household_id);

    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<PlantPhoto[]>(cacheKey);
    if (cached) {
      // Preload thumbnails in background for cached results
      CachedPhotoService.preloadThumbnails(cached, "low").catch(() => {});
      return cached;
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("taken_at", { ascending: false });

    if (error) {
      console.error("Error fetching all photos:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
    }

    const photos = (data || []) as PlantPhoto[];

    await CacheService.cacheApiResponse(cacheKey, photos, CACHE_TTL.PHOTOS_ALL);

    // Preload thumbnails in background
    CachedPhotoService.preloadThumbnails(photos, "low").catch(() => {});

    return photos;
  }

  static async cleanupOrphanedPhotos(): Promise<void> {
    try {
      // Get all photos from database
      const photos = await this.getAllPhotos();

      // Check local files and clean up orphaned database records
      for (const photo of photos) {
        if (!isCloudUrl(photo.file_path)) {
          const file = new File(photo.file_path);
          if (!file.exists) {
            await supabase
              .from(DB_TABLES.PLANT_PHOTOS)
              .delete()
              .eq("id", photo.id);
          }
        }
      }

      // Clean up orphaned local files
      if (this.PHOTOS_DIR.exists) {
        const files = await this.PHOTOS_DIR.list();
        const dbPhotoPaths = new Set(
          photos
            .filter((p) => !isCloudUrl(p.file_path))
            .map((p) => extractFilenameFromPath(p.file_path)),
        );

        for (const fileName of files) {
          if (!dbPhotoPaths.has(fileName)) {
            await new File(this.PHOTOS_DIR, fileName).delete();
          }
        }
      }
    } catch (error) {
      console.error("Error cleaning up orphaned photos:", error);
    }
  }

  static async deleteAllPhotos(): Promise<void> {
    try {
      // Get current household session — only delete photos for the current
      // household, never every row in the table.
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      // Get all photos before deleting from database (already scoped to household)
      const photos = await this.getAllPhotos();

      // Delete all files (both local and cloud)
      for (const photo of photos) {
        try {
          if (isCloudUrl(photo.file_path)) {
            // Delete from cloud storage
            const fileName = extractFilenameFromPath(photo.file_path);
            if (fileName) {
              await supabase.storage
                .from(this.STORAGE_BUCKET)
                .remove([fileName]);
            }
          } else {
            // Delete local file
            const file = new File(photo.file_path);
            if (file.exists) {
              await file.delete();
            }
          }
        } catch (error) {
          console.error(`Error deleting photo file ${photo.file_path}:`, error);
        }
      }

      // Delete all database records for this household
      const { error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .delete()
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        console.error("Error deleting all photos from database:", error);
        throw ErrorMapper.mapDatabaseError(error, "delete", "photo");
      }

      // Clean up local photos directory
      if (this.PHOTOS_DIR.exists) {
        try {
          await this.PHOTOS_DIR.delete();
        } catch (error) {
          console.error("Error deleting photos directory:", error);
        }
      }
    } catch (error) {
      console.error("Error deleting all photos:", error);
      throw error;
    }
  }

  static async setThumbnailPhoto(
    plantId: string,
    photoId: string,
  ): Promise<void> {
    try {
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error("Plant not found or not accessible");
      }

      // Verify photo belongs to current household
      const photo = await this.getPhotoById(photoId);
      if (!photo) {
        throw new Error("Photo not found or not accessible");
      }

      const { error } = await supabase
        .from(DB_TABLES.PLANTS)
        .update({
          thumbnail_photo_id: photoId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plantId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        console.error("Error setting thumbnail photo:", error);
        throw ErrorMapper.mapDatabaseError(error, "update", "photo");
      }

      // Invalidate the plant cache so fresh data is loaded
      const plantCacheKey = `plant-${plantId}-${session.household_id}`;
      await CacheService.invalidateCache(plantCacheKey);
    } catch (error) {
      console.error("Error setting thumbnail photo:", error);
      throw error;
    }
  }

  static async clearThumbnailPhoto(plantId: string): Promise<void> {
    try {
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error("Plant not found or not accessible");
      }

      const { error } = await supabase
        .from(DB_TABLES.PLANTS)
        .update({
          thumbnail_photo_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plantId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (error) {
        console.error("Error clearing thumbnail photo:", error);
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
      logger.debug("Testing Supabase storage connection...");
      logger.debug("Testing bucket:", this.STORAGE_BUCKET);

      // Try to list files in the bucket to test permissions
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .list("", {
          limit: 1,
        });

      if (error) {
        console.error("Storage bucket access test failed:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));

        // Check if bucket exists
        if (
          error.message?.includes("bucket") &&
          error.message?.includes("not found")
        ) {
          return {
            success: false,
            error: "Bucket does not exist",
            bucketExists: false,
          };
        }

        return {
          success: false,
          error: error.message || "Unknown storage error",
        };
      }

      logger.debug("Storage bucket access test successful:", data);
      return { success: true, bucketExists: true };
    } catch (error) {
      console.error("Storage connection test error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async createStorageBucket(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.debug("Creating storage bucket:", this.STORAGE_BUCKET);

      const { data, error } = await supabase.storage.createBucket(
        this.STORAGE_BUCKET,
        {
          public: true,
          allowedMimeTypes: [...STORAGE_CONFIG.ALLOWED_MIME_TYPES],
          fileSizeLimit: STORAGE_CONFIG.MAX_FILE_SIZE_BYTES,
        },
      );

      if (error) {
        console.error("Failed to create storage bucket:", error);
        return { success: false, error: error.message };
      }

      logger.debug("Storage bucket created successfully:", data);
      return { success: true };
    } catch (error) {
      console.error("Error creating storage bucket:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static async getThumbnailPhoto(plantId: string): Promise<PlantPhoto | null> {
    try {
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      // Verify plant belongs to current household first
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        return null; // Plant not found or not accessible
      }

      if (!plant.thumbnail_photo_id) {
        return null; // No thumbnail set
      }

      // Fetch the actual photo (this will also verify household access)
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
      // Get current household session
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const cacheKey = CacheKeyBuilder.batchThumbnails(
        session.household_id,
        plantIds,
      );

      // Try to get from cache first
      const cached = await CacheService.getCachedResponse<{
        [plantId: string]: PlantPhoto | null;
      }>(cacheKey);
      if (cached) {
        return cached;
      }

      // Fetch plants with their thumbnail photo IDs in a single query
      const { data: plants, error: plantsError } = await supabase
        .from(DB_TABLES.PLANTS)
        .select("id, thumbnail_photo_id")
        .in("id", plantIds)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (plantsError) {
        console.error("Error fetching plants for thumbnails:", plantsError);
        throw new Error(`Failed to fetch plants: ${plantsError.message}`);
      }

      const result: { [plantId: string]: PlantPhoto | null } = {};

      // Initialize all plant IDs with null
      plantIds.forEach((id) => {
        result[id] = null;
      });

      if (!plants || plants.length === 0) {
        await CacheService.cacheApiResponse(
          cacheKey,
          result,
          CACHE_TTL.BATCH_THUMBNAILS,
        );
        return result;
      }

      // Get all unique thumbnail photo IDs
      const thumbnailPhotoIds = plants
        .filter((plant) => plant.thumbnail_photo_id)
        .map((plant) => plant.thumbnail_photo_id!)
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

      if (thumbnailPhotoIds.length === 0) {
        await CacheService.cacheApiResponse(cacheKey, result, 10 * 60 * 1000);
        return result;
      }

      // Fetch all thumbnail photos in a single query
      const { data: thumbnailPhotos, error: photosError } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .select("*")
        .in("id", thumbnailPhotoIds)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (photosError) {
        console.error("Error fetching thumbnail photos:", photosError);
        // Don't throw error, just return empty results
      } else if (thumbnailPhotos) {
        // Create a map of photo ID to photo
        const photoMap = new Map<string, PlantPhoto>();
        thumbnailPhotos.forEach((photo) => {
          photoMap.set(photo.id, photo as PlantPhoto);
        });

        // Map plants to their thumbnail photos
        plants.forEach((plant) => {
          if (
            plant.thumbnail_photo_id &&
            photoMap.has(plant.thumbnail_photo_id)
          ) {
            result[plant.id] = photoMap.get(plant.thumbnail_photo_id)!;
          }
        });
      }

      await CacheService.cacheApiResponse(
        cacheKey,
        result,
        CACHE_TTL.BATCH_THUMBNAILS,
      );

      return result;
    } catch (error) {
      console.error("Error getting batch thumbnail photos:", error);
      // Return empty results for all requested plant IDs
      const result: { [plantId: string]: PlantPhoto | null } = {};
      plantIds.forEach((id) => {
        result[id] = null;
      });
      return result;
    }
  }

  /**
   * Returns the `taken_at` timestamp of the most recent photo for each given
   * plant in a single round-trip. Replaces the N+1 pattern of calling
   * `getPhotosByPlantId` once per plant.
   *
   * Returns null for any plant with no photos.
   */
  static async getLastPhotoDatesByPlantIds(
    plantIds: string[],
  ): Promise<{ [plantId: string]: string | null }> {
    const result: { [plantId: string]: string | null } = {};
    plantIds.forEach((id) => {
      result[id] = null;
    });

    if (plantIds.length === 0) return result;

    try {
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const cacheKey = CacheKeyBuilder.batchLastPhotoDates(
        session.household_id,
        plantIds,
      );

      const cached = await CacheService.getCachedResponse<{
        [plantId: string]: string | null;
      }>(cacheKey);
      if (cached) return cached;

      // Single query: every photo for these plants, newest first.
      // We only need plant_id + taken_at, no need to fetch full rows.
      const { data, error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .select("plant_id, taken_at")
        .in("plant_id", plantIds)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
        .order("taken_at", { ascending: false });

      if (error) {
        console.error("Error fetching last photo dates:", error);
        throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
      }

      // Order-DESC means the first row per plant_id is the newest.
      if (data) {
        for (const row of data) {
          if (result[row.plant_id] == null) {
            result[row.plant_id] = row.taken_at;
          }
        }
      }

      await CacheService.cacheApiResponse(
        cacheKey,
        result,
        CACHE_TTL.PHOTOS_LIST,
      );

      return result;
    } catch (error) {
      console.error("Error in getLastPhotoDatesByPlantIds:", error);
      return result;
    }
  }

  static async generateThumbnailsForExistingPhotos(): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> {
    try {
      logger.debug("Starting thumbnail generation for existing photos...");

      // Get all photos that don't have thumbnails yet
      const { data: photosWithoutThumbnails, error } = await supabase
        .from(DB_TABLES.PLANT_PHOTOS)
        .select("*")
        .is("thumbnail_path", null);

      if (error) {
        console.error("Error fetching photos without thumbnails:", error);
        throw ErrorMapper.mapDatabaseError(error, "fetch", "photo");
      }

      if (!photosWithoutThumbnails || photosWithoutThumbnails.length === 0) {
        logger.debug("No photos found that need thumbnails generated");
        return { success: 0, failed: 0, skipped: 0 };
      }

      logger.debug(
        `Found ${photosWithoutThumbnails.length} photos that need thumbnails`,
      );

      let success = 0;
      let failed = 0;
      let skipped = 0;

      // Process photos in batches to avoid overwhelming the server
      const batchSize = BATCH_CONFIG.PHOTO_GENERATION_BATCH_SIZE;
      for (let i = 0; i < photosWithoutThumbnails.length; i += batchSize) {
        const batch = photosWithoutThumbnails.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (photo) => {
            try {
              logger.debug(`Processing photo ${photo.id}...`);

              // Skip if photo doesn't have a valid cloud URL
              if (!isCloudUrl(photo.file_path)) {
                logger.debug(`Skipping photo ${photo.id} - not a cloud URL`);
                skipped++;
                return;
              }

              // Create thumbnail from the full-size image URL
              const thumbnailUri = await this.createThumbnail(photo.file_path);

              // Generate filename for thumbnail using centralized utility
              const originalFileName = extractFilenameFromPath(photo.file_path);
              if (!originalFileName) {
                console.error(
                  `Could not extract filename from ${photo.file_path}`,
                );
                failed++;
                return;
              }

              const thumbnailFileName =
                generateThumbnailFilename(originalFileName);

              // Copy thumbnail to local storage temporarily
              await this.ensurePhotosDirectory();
              const localThumbnailFile = new File(
                this.PHOTOS_DIR,
                thumbnailFileName,
              );
              await new File(thumbnailUri).copy(localThumbnailFile);

              // Upload thumbnail to cloud storage
              const cloudThumbnailPath = await this.uploadFileToStorage(
                localThumbnailFile.uri,
                thumbnailFileName,
              );

              // Clean up local files
              try {
                await localThumbnailFile.delete();
                await new File(thumbnailUri).delete();
              } catch (cleanupError) {
                console.warn(
                  "Failed to clean up temporary files:",
                  cleanupError,
                );
              }

              if (!cloudThumbnailPath) {
                console.error(
                  `Failed to upload thumbnail for photo ${photo.id}`,
                );
                failed++;
                return;
              }

              // Update database with thumbnail path
              const { error: updateError } = await supabase
                .from(DB_TABLES.PLANT_PHOTOS)
                .update({ thumbnail_path: cloudThumbnailPath })
                .eq("id", photo.id);

              if (updateError) {
                console.error(
                  `Failed to update photo ${photo.id} with thumbnail path:`,
                  updateError,
                );
                failed++;
                return;
              }

              logger.debug(
                `Successfully generated thumbnail for photo ${photo.id}`,
              );
              success++;
            } catch (error) {
              console.error(
                `Failed to generate thumbnail for photo ${photo.id}:`,
                error,
              );
              failed++;
            }
          }),
        );

        // Small delay between batches to be nice to the server
        if (i + batchSize < photosWithoutThumbnails.length) {
          await new Promise((resolve) =>
            setTimeout(resolve, BATCH_CONFIG.PHOTO_GENERATION_DELAY_MS),
          );
        }
      }

      logger.debug(
        `Thumbnail generation complete: ${success} success, ${failed} failed, ${skipped} skipped`,
      );
      return { success, failed, skipped };
    } catch (error) {
      console.error("Error in generateThumbnailsForExistingPhotos:", error);
      throw error;
    }
  }

  static async downloadPhotoToDevice(
    photoUrl: string,
    filename?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      logger.debug("Starting photo download to device...");

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        return {
          success: false,
          error:
            "Permission to access media library is required to download photos!",
        };
      }

      // Create a temporary filename if not provided
      const tempFilename = filename || `plant_photo_${Date.now()}.jpg`;
      const downloadFile = new File(Paths.document, tempFilename);

      logger.debug("Downloading photo from:", photoUrl);
      logger.debug("Temp download path:", downloadFile.uri);

      // Download the photo to temporary storage
      const downloadedFile = await File.downloadFileAsync(
        photoUrl,
        downloadFile,
      );

      if (!downloadedFile) {
        return {
          success: false,
          error: "Failed to download photo from server",
        };
      }

      logger.debug("Photo downloaded to temp location:", downloadedFile.uri);

      // Save to device's media library
      const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
      logger.debug("Photo saved to media library:", asset);

      // Clean up temporary file
      try {
        await downloadedFile.delete();
      } catch (cleanupError) {
        console.warn(
          "Failed to clean up temporary download file:",
          cleanupError,
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Error downloading photo to device:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
