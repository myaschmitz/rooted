import {
  DataExportArchiveService,
  type DataExportSummary,
} from "./DataExportArchiveService";

export class DataExportService {
  static async exportData(): Promise<DataExportSummary> {
    const chunks: Uint8Array[] = [];
    const summary = await DataExportArchiveService.createArchive((chunk) => {
      chunks.push(chunk);
    });
    const blob = new Blob(chunks, { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = summary.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);

    return summary;
  }
}
