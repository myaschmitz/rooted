import { unzipSync } from "fflate";
import { DataExportArchiveService } from "../../services/DataExportArchiveService";
import { DataExportDataService } from "../../services/DataExportDataService";

jest.mock("../../services/DataExportDataService");

describe("DataExportArchiveService", () => {
  const photoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

  beforeEach(() => {
    jest.clearAllMocks();
    (DataExportDataService.getExportData as jest.Mock).mockResolvedValue({
      household: { id: "household-1", name: "Home" },
      household_members: [],
      activity_log: [],
      plants: [{ id: "plant-1", name: "Fern" }],
      events: [],
      photos: [
        {
          id: "photo-1",
          plant_id: "plant-1",
          file_path: "https://example.com/photo.jpg",
          export_path: "photos/plant-1/photo-1.jpg",
        },
      ],
      notes: [],
      tags: [],
      plant_tags: [],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => photoBytes.buffer,
    });
  });

  it("exports JSON data and preserves photo bytes", async () => {
    const chunks: Uint8Array[] = [];

    const summary = await DataExportArchiveService.createArchive((chunk) => {
      chunks.push(chunk);
    });
    const archive = unzipSync(concatChunks(chunks));
    const manifest = JSON.parse(new TextDecoder().decode(archive["manifest.json"]));

    expect(archive["photos/plant-1/photo-1.jpg"]).toEqual(photoBytes);
    expect(JSON.parse(new TextDecoder().decode(archive["data/plants.json"]))).toEqual([
      { id: "plant-1", name: "Fern" },
    ]);
    expect(manifest.photo_encoding).toBe("stored-original");
    expect(summary.photoCount).toBe(1);
    expect(summary.photoBytes).toBe(photoBytes.length);
  });

  it("fails the export when a photo cannot be downloaded", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(
      DataExportArchiveService.createArchive(() => undefined),
    ).rejects.toThrow("Failed to download photo photo-1: HTTP 404");
  });
});

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
