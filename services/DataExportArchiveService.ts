import dayjs from "dayjs";
import { strToU8, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import {
  DataExportDataService,
  type DataExportDataset,
  type ExportPhoto,
} from "./DataExportDataService";

export interface DataExportSummary {
  fileName: string;
  photoCount: number;
  photoBytes: number;
}

type ArchiveChunkHandler = (chunk: Uint8Array) => void;

interface ExportManifest {
  format_version: 1;
  exported_at: string;
  photo_count: number;
  photo_bytes: number;
  photo_encoding: "stored-original";
  included_files: string[];
}

const JSON_FILES: Array<{
  path: string;
  key: keyof DataExportDataset;
}> = [
  { path: "data/household.json", key: "household" },
  { path: "data/household_members.json", key: "household_members" },
  { path: "data/activity_log.json", key: "activity_log" },
  { path: "data/plants.json", key: "plants" },
  { path: "data/events.json", key: "events" },
  { path: "data/photos.json", key: "photos" },
  { path: "data/notes.json", key: "notes" },
  { path: "data/tags.json", key: "tags" },
  { path: "data/plant_tags.json", key: "plant_tags" },
];

export class DataExportArchiveService {
  static async createArchive(
    onChunk: ArchiveChunkHandler,
  ): Promise<DataExportSummary> {
    const dataset = await DataExportDataService.getExportData();
    const fileName = `rooted-export-${dayjs().format("YYYY-MM-DD_HH-mm-ss")}.zip`;
    let archive: Zip | undefined;
    let rejectArchive: ((reason?: unknown) => void) | undefined;

    const archiveComplete = new Promise<void>((resolve, reject) => {
      rejectArchive = reject;
      archive = new Zip((error, chunk, final) => {
        if (error) {
          reject(error);
          return;
        }

        try {
          onChunk(chunk);
          if (final) {
            resolve();
          }
        } catch (writeError) {
          archive?.terminate();
          reject(writeError);
        }
      });
    });

    if (!archive) {
      throw new Error("Failed to initialize data export");
    }

    try {
      for (const jsonFile of JSON_FILES) {
        this.addJsonFile(archive, jsonFile.path, dataset[jsonFile.key]);
      }

      let photoBytes = 0;
      for (const photo of dataset.photos) {
        const bytes = await this.downloadPhoto(photo);
        photoBytes += bytes.length;
        this.addStoredFile(archive, photo.export_path, bytes);
      }

      const manifest: ExportManifest = {
        format_version: 1,
        exported_at: dayjs().toISOString(),
        photo_count: dataset.photos.length,
        photo_bytes: photoBytes,
        photo_encoding: "stored-original",
        included_files: [
          "manifest.json",
          ...JSON_FILES.map((file) => file.path),
          ...dataset.photos.map((photo) => photo.export_path),
        ],
      };
      this.addJsonFile(archive, "manifest.json", manifest);
      archive.end();
      await archiveComplete;

      return {
        fileName,
        photoCount: dataset.photos.length,
        photoBytes,
      };
    } catch (error) {
      archive.terminate();
      rejectArchive?.(error);
      await archiveComplete.catch(() => undefined);
      throw error;
    }
  }

  private static addJsonFile(
    archive: Zip,
    path: string,
    value: unknown,
  ): void {
    const entry = new ZipDeflate(path, { level: 6 });
    archive.add(entry);
    entry.push(strToU8(`${JSON.stringify(value, null, 2)}\n`), true);
  }

  private static addStoredFile(
    archive: Zip,
    path: string,
    bytes: Uint8Array,
  ): void {
    const entry = new ZipPassThrough(path);
    archive.add(entry);
    entry.push(bytes, true);
  }

  private static async downloadPhoto(photo: ExportPhoto): Promise<Uint8Array> {
    const response = await fetch(photo.file_path);
    if (!response.ok) {
      throw new Error(
        `Failed to download photo ${photo.id}: HTTP ${response.status}`,
      );
    }
    return new Uint8Array(await response.arrayBuffer());
  }
}
