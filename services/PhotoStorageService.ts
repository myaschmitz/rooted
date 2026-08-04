import type { PlantPhoto } from "../types/Plant";
import {
  BATCH_CONFIG,
  STORAGE_CONFIG,
  extractFilenameFromPath,
  isCloudUrl,
} from "../constants/domain";
import { supabase } from "./SupabaseService";

type PhotoStoragePaths = Pick<PlantPhoto, "file_path" | "thumbnail_path">;

export class PhotoStorageService {
  static getFileNames(photos: PhotoStoragePaths[]): string[] {
    const fileNames = new Set<string>();

    for (const photo of photos) {
      for (const filePath of [photo.file_path, photo.thumbnail_path]) {
        if (!filePath || !isCloudUrl(filePath)) {
          continue;
        }

        const fileName = extractFilenameFromPath(filePath);
        if (fileName) {
          fileNames.add(fileName);
        }
      }
    }

    return [...fileNames];
  }

  static async removeFiles(fileNames: string[]): Promise<void> {
    const uniqueFileNames = [...new Set(fileNames)];

    for (
      let offset = 0;
      offset < uniqueFileNames.length;
      offset += BATCH_CONFIG.STORAGE_DELETE_BATCH_SIZE
    ) {
      const batch = uniqueFileNames.slice(
        offset,
        offset + BATCH_CONFIG.STORAGE_DELETE_BATCH_SIZE,
      );
      await this.removeBatchWithRetry(batch);
    }
  }

  static async rollbackUploads(
    fileNames: string[],
    originalError: unknown,
  ): Promise<never> {
    try {
      await this.removeFiles(fileNames);
    } catch (rollbackError) {
      const originalMessage =
        originalError instanceof Error
          ? originalError.message
          : String(originalError);
      const rollbackMessage =
        rollbackError instanceof Error
          ? rollbackError.message
          : String(rollbackError);
      throw new Error(
        `${originalMessage}. Storage rollback also failed: ${rollbackMessage}`,
      );
    }

    throw originalError;
  }

  private static async removeBatchWithRetry(fileNames: string[]): Promise<void> {
    for (
      let attempt = 0;
      attempt <= BATCH_CONFIG.STORAGE_DELETE_MAX_RETRIES;
      attempt++
    ) {
      const { error } = await supabase.storage
        .from(STORAGE_CONFIG.BUCKET_NAME)
        .remove(fileNames);

      if (!error) {
        return;
      }

      if (attempt === BATCH_CONFIG.STORAGE_DELETE_MAX_RETRIES) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          BATCH_CONFIG.STORAGE_DELETE_RETRY_DELAY_MS * (attempt + 1),
        ),
      );
    }
  }
}
