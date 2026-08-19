import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import dayjs from "dayjs";
import {
  DataExportArchiveService,
  type DataExportSummary,
} from "./DataExportArchiveService";

export class DataExportService {
  static async exportData(): Promise<DataExportSummary> {
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (!sharingAvailable) {
      throw new Error("File sharing is not available on this device");
    }

    const archiveFile = new File(
      Paths.cache,
      `rooted-export-${dayjs().valueOf()}.zip`,
    );
    archiveFile.create({ intermediates: true, overwrite: true });
    const fileHandle = archiveFile.open();
    let fileHandleOpen = true;

    try {
      const summary = await DataExportArchiveService.createArchive((chunk) => {
        fileHandle.writeBytes(chunk);
      });
      fileHandle.close();
      fileHandleOpen = false;

      await Sharing.shareAsync(archiveFile.uri, {
        dialogTitle: "Export Rooted data",
        mimeType: "application/zip",
        UTI: "public.zip-archive",
      });
      return summary;
    } finally {
      if (fileHandleOpen) {
        fileHandle.close();
      }
      if (archiveFile.exists) {
        archiveFile.delete();
      }
    }
  }
}
