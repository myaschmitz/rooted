import { Image } from "react-native";
import { PhotoPrefetchService } from "../../services/PhotoPrefetchService";
import { getPrefetchOrder } from "../../utils/photoPrefetch";
import { PlantPhoto } from "../../types/Plant";

jest.mock("react-native", () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

const makePhoto = (id: string): PlantPhoto =>
  ({
    id,
    file_path: `https://cdn.test/${id}.jpg`,
    thumbnail_path: `https://cdn.test/${id}_thumb.jpg`,
  }) as PlantPhoto;

describe("getPrefetchOrder", () => {
  it("loads the current photo first, then next, then previous", () => {
    expect(getPrefetchOrder(2, 5)).toEqual([2, 3, 1]);
  });

  it("skips neighbors that are out of range", () => {
    expect(getPrefetchOrder(0, 3)).toEqual([0, 1]);
    expect(getPrefetchOrder(2, 3)).toEqual([2, 1]);
    expect(getPrefetchOrder(0, 1)).toEqual([0]);
  });

  it("returns nothing for an invalid index", () => {
    expect(getPrefetchOrder(-1, 3)).toEqual([]);
    expect(getPrefetchOrder(3, 3)).toEqual([]);
  });
});

describe("PhotoPrefetchService", () => {
  const prefetchMock = Image.prefetch as jest.Mock;

  beforeEach(() => {
    PhotoPrefetchService.reset();
    prefetchMock.mockResolvedValue(true);
  });

  it("shows the thumbnail until the full-size image has downloaded", async () => {
    const photo = makePhoto("a");
    expect(PhotoPrefetchService.getViewerSource(photo).uri).toBe(
      photo.thumbnail_path,
    );

    await PhotoPrefetchService.prefetch(photo.file_path);

    expect(PhotoPrefetchService.getViewerSource(photo).uri).toBe(
      photo.file_path,
    );
  });

  it("uses the full-size image when a photo has no thumbnail", () => {
    const photo = { ...makePhoto("b"), thumbnail_path: undefined };
    expect(PhotoPrefetchService.getViewerSource(photo).uri).toBe(
      photo.file_path,
    );
  });

  it("keeps the thumbnail when the download fails", async () => {
    prefetchMock.mockRejectedValue(new Error("network"));
    const photo = makePhoto("c");

    await expect(PhotoPrefetchService.prefetch(photo.file_path)).resolves.toBe(
      false,
    );
    expect(PhotoPrefetchService.getViewerSource(photo).uri).toBe(
      photo.thumbnail_path,
    );
  });

  it("downloads each photo only once", async () => {
    const url = makePhoto("d").file_path;
    await Promise.all([
      PhotoPrefetchService.prefetch(url),
      PhotoPrefetchService.prefetch(url),
    ]);
    await PhotoPrefetchService.prefetch(url);

    expect(prefetchMock).toHaveBeenCalledTimes(1);
  });

  it("downloads the viewed photo first, then the next and previous ones", async () => {
    const photos = ["p0", "p1", "p2", "p3"].map(makePhoto);
    const onLoaded = jest.fn();

    await PhotoPrefetchService.prefetchAround(photos, 1, () => true, onLoaded);

    expect(prefetchMock.mock.calls.map((call) => call[0])).toEqual([
      photos[1].file_path,
      photos[2].file_path,
      photos[0].file_path,
    ]);
    expect(onLoaded).toHaveBeenCalledTimes(3);
    expect(PhotoPrefetchService.getViewerSource(photos[3]).uri).toBe(
      photos[3].thumbnail_path,
    );
  });

  it("skips the neighbors if the user moved to another photo", async () => {
    const photos = ["p0", "p1", "p2"].map(makePhoto);
    let active = true;
    prefetchMock.mockImplementation(async () => {
      active = false;
      return true;
    });

    await PhotoPrefetchService.prefetchAround(photos, 1, () => active, jest.fn());

    expect(prefetchMock).toHaveBeenCalledTimes(1);
  });
});
