import { PhotoStorageService } from "../../services/PhotoStorageService";

declare global {
  var mockSupabaseClient: any;
  var mockSupabaseStorageBucket: {
    remove: jest.Mock;
  };
}

describe("PhotoStorageService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.mockSupabaseClient.storage.from.mockReturnValue(
      global.mockSupabaseStorageBucket,
    );
    global.mockSupabaseStorageBucket.remove.mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it("collects both original and thumbnail file names", () => {
    const fileNames = PhotoStorageService.getFileNames([
      {
        file_path:
          "https://example.supabase.co/storage/v1/object/public/plant-photos/photo.jpg",
        thumbnail_path:
          "https://example.supabase.co/storage/v1/object/public/plant-photos/photo_thumb.jpg",
      },
      {
        file_path: "file:///local/photo.jpg",
      },
    ]);

    expect(fileNames).toEqual(["photo.jpg", "photo_thumb.jpg"]);
  });

  it("removes all provided files from the photo bucket", async () => {
    await PhotoStorageService.removeFiles(["photo.jpg", "photo_thumb.jpg"]);

    expect(global.mockSupabaseStorageBucket.remove).toHaveBeenCalledWith([
      "photo.jpg",
      "photo_thumb.jpg",
    ]);
  });

  it("rolls back successful uploads when a later operation fails", async () => {
    const originalError = new Error("Database insert failed");

    await expect(
      PhotoStorageService.rollbackUploads(
        ["photo.jpg", "photo_thumb.jpg"],
        originalError,
      ),
    ).rejects.toBe(originalError);

    expect(global.mockSupabaseStorageBucket.remove).toHaveBeenCalledWith([
      "photo.jpg",
      "photo_thumb.jpg",
    ]);
  });
});
