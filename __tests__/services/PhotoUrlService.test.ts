// Shared Supabase mocks from jest.setup.js. Other test files declare narrower
// global types for these, so read them untyped here.
const mocks = globalThis as any;

const BASE = "https://example.supabase.co/storage/v1/object";
const publicUrl = (name: string) => `${BASE}/public/plant-photos/${name}`;
const signedUrl = (name: string, token = "t") =>
  `${BASE}/sign/plant-photos/${name}?token=${token}`;

// The service keeps signed links in module state and AsyncStorage, so each
// test loads a fresh copy of both.
function load() {
  let PhotoUrlService: typeof import("../../services/PhotoUrlService").PhotoUrlService;
  let AsyncStorage: any;
  jest.isolateModules(() => {
    PhotoUrlService = require("../../services/PhotoUrlService").PhotoUrlService;
    AsyncStorage = require("@react-native-async-storage/async-storage");
  });
  return { PhotoUrlService: PhotoUrlService!, AsyncStorage };
}

const sign = (): jest.Mock => mocks.mockSupabaseStorageBucket.createSignedUrls;

describe("PhotoUrlService", () => {
  let now = 1_700_000_000_000;

  beforeEach(() => {
    // jest.config.js resets mock implementations before every test.
    mocks.mockSupabaseClient.storage.from.mockReturnValue(
      mocks.mockSupabaseStorageBucket,
    );
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Date, "now").mockImplementation(() => now);
    sign().mockImplementation((paths: string[]) =>
      Promise.resolve({
        data: paths.map((path) => ({ path, signedUrl: signedUrl(path), error: null })),
        error: null,
      }),
    );
  });

  afterEach(() => {
    now = 1_700_000_000_000;
  });

  describe("objectName", () => {
    it("reads the file name from public and signed storage URLs", () => {
      const { PhotoUrlService } = load();
      expect(PhotoUrlService.objectName(publicUrl("a_1.jpg"))).toBe("a_1.jpg");
      expect(PhotoUrlService.objectName(signedUrl("a_1_thumb.jpg"))).toBe("a_1_thumb.jpg");
      expect(PhotoUrlService.objectName(publicUrl("a%20b.jpg"))).toBe("a b.jpg");
    });

    it("returns null for anything that isn't a storage URL", () => {
      const { PhotoUrlService } = load();
      expect(PhotoUrlService.objectName("file:///local/photo.jpg")).toBeNull();
      expect(PhotoUrlService.objectName(`${BASE}/public/other-bucket/x.jpg`)).toBeNull();
      expect(PhotoUrlService.objectName(undefined)).toBeNull();
    });
  });

  describe("signUrls", () => {
    it("signs every storage URL in one request and leaves others alone", async () => {
      const { PhotoUrlService } = load();
      const result = await PhotoUrlService.signUrls([
        publicUrl("a.jpg"),
        publicUrl("b.jpg"),
        "file:///local.jpg",
        null,
      ]);

      expect(sign()).toHaveBeenCalledTimes(1);
      expect(sign()).toHaveBeenCalledWith(["a.jpg", "b.jpg"], 24 * 60 * 60);
      expect(result.get(publicUrl("a.jpg"))).toBe(signedUrl("a.jpg"));
      expect(result.get("file:///local.jpg")).toBe("file:///local.jpg");
    });

    it("reuses a saved link until it's close to expiring", async () => {
      const { PhotoUrlService } = load();
      await PhotoUrlService.signUrls([publicUrl("a.jpg")]);

      now += 21 * 60 * 60 * 1000; // 3 hours left: still reused
      const reused = await PhotoUrlService.signUrl(publicUrl("a.jpg"));
      expect(sign()).toHaveBeenCalledTimes(1);
      expect(reused).toBe(signedUrl("a.jpg"));

      now += 2 * 60 * 60 * 1000; // 1 hour left: signed again
      sign().mockImplementationOnce((paths: string[]) =>
        Promise.resolve({
          data: paths.map((path) => ({ path, signedUrl: signedUrl(path, "new"), error: null })),
          error: null,
        }),
      );
      expect(await PhotoUrlService.signUrl(publicUrl("a.jpg"))).toBe(signedUrl("a.jpg", "new"));
      expect(sign()).toHaveBeenCalledTimes(2);
    });

    it("keeps links across app launches", async () => {
      const first = load();
      await first.PhotoUrlService.signUrls([publicUrl("a.jpg")]);
      const saved = first.AsyncStorage.setItem.mock.calls.at(-1)[1];

      const second = load();
      second.AsyncStorage.getItem.mockResolvedValue(saved);
      expect(await second.PhotoUrlService.signUrl(publicUrl("a.jpg"))).toBe(signedUrl("a.jpg"));
      expect(sign()).toHaveBeenCalledTimes(1);
    });

    it("signs an already-signed link's file from the saved links", async () => {
      const { PhotoUrlService } = load();
      await PhotoUrlService.signUrls([publicUrl("a.jpg")]);
      expect(await PhotoUrlService.signUrl(signedUrl("a.jpg", "old"))).toBe(signedUrl("a.jpg"));
      expect(sign()).toHaveBeenCalledTimes(1);
    });

    it("falls back to the stored URL when signing fails", async () => {
      const { PhotoUrlService } = load();
      sign().mockResolvedValueOnce({ data: null, error: { message: "offline" } });
      expect(await PhotoUrlService.signUrl(publicUrl("a.jpg"))).toBe(publicUrl("a.jpg"));
    });

    it("falls back for a file storage refuses to sign", async () => {
      const { PhotoUrlService } = load();
      sign().mockResolvedValueOnce({
        data: [{ path: "a.jpg", signedUrl: null, error: "Object not found" }],
        error: null,
      });
      expect(await PhotoUrlService.signUrl(publicUrl("a.jpg"))).toBe(publicUrl("a.jpg"));
    });
  });

  describe("signResult", () => {
    const photo = (name: string, thumb = true) => ({
      id: name,
      file_path: publicUrl(`${name}.jpg`),
      thumbnail_path: thumb ? publicUrl(`${name}_thumb.jpg`) : undefined,
    });

    it("signs a single photo, a list, and a plant-to-photo map", async () => {
      const { PhotoUrlService } = load();

      const one = await PhotoUrlService.signResult(photo("a"));
      expect(one).toEqual({
        id: "a",
        file_path: signedUrl("a.jpg"),
        thumbnail_path: signedUrl("a_thumb.jpg"),
      });

      const list = await PhotoUrlService.signResult([photo("b", false)]);
      expect(list).toEqual([{ id: "b", file_path: signedUrl("b.jpg"), thumbnail_path: undefined }]);

      const map = await PhotoUrlService.signResult({ p1: photo("c"), p2: null });
      expect(map).toEqual({
        p1: { id: "c", file_path: signedUrl("c.jpg"), thumbnail_path: signedUrl("c_thumb.jpg") },
        p2: null,
      });
    });

    it("leaves other results untouched", async () => {
      const { PhotoUrlService } = load();
      expect(await PhotoUrlService.signResult(null)).toBeNull();
      expect(await PhotoUrlService.signResult([])).toEqual([]);
      const dates = { p1: "2026-01-01" };
      expect(await PhotoUrlService.signResult(dates)).toBe(dates);
      expect(sign()).not.toHaveBeenCalled();
    });
  });

  describe("signResultsOf", () => {
    it("wraps methods so they return signed photos, keeping `this`", async () => {
      const { PhotoUrlService } = load();
      class Service {
        static stored = publicUrl("a.jpg");
        static async getPhoto() {
          return { id: "a", file_path: this.stored };
        }
      }
      PhotoUrlService.signResultsOf(Service, ["getPhoto"]);

      expect(await Service.getPhoto()).toEqual({ id: "a", file_path: signedUrl("a.jpg") });
    });

    it("throws for a method name that doesn't exist", () => {
      const { PhotoUrlService } = load();
      expect(() => PhotoUrlService.signResultsOf(class {}, ["missing"])).toThrow(
        "missing is not a method",
      );
    });
  });
});

export {};
