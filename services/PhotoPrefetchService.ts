import { Image } from "react-native";
import { PlantPhoto } from "../types/Plant";
import { getPrefetchOrder } from "../utils/photoPrefetch";

/**
 * Downloads full-size photos into React Native's image cache ahead of time,
 * used by the native photo viewer so it can show the thumbnail first and swap
 * to the full image once it is ready.
 */
export class PhotoPrefetchService {
  // Full-size URLs already downloaded during this app session. Kept for the
  // whole session so reopening the viewer shows them right away.
  private static loaded = new Set<string>();
  private static pending = new Map<string, Promise<boolean>>();

  static isLoaded(url: string): boolean {
    return this.loaded.has(url);
  }

  static prefetch(url: string): Promise<boolean> {
    if (this.loaded.has(url)) {
      return Promise.resolve(true);
    }

    let request = this.pending.get(url);
    if (!request) {
      request = Promise.resolve()
        .then(() => Image.prefetch(url))
        .then((ok) => {
          if (ok) this.loaded.add(url);
          return ok;
        })
        .catch(() => false)
        .finally(() => this.pending.delete(url));
      this.pending.set(url, request);
    }
    return request;
  }

  /**
   * Downloads the photo being viewed first, then the next and previous ones.
   * Neighbors are skipped if `isActive` turns false (the user moved on) before
   * the current photo finishes.
   */
  static async prefetchAround(
    photos: PlantPhoto[],
    activeIndex: number,
    isActive: () => boolean,
    onLoaded: () => void,
  ): Promise<void> {
    const [current, ...neighbors] = getPrefetchOrder(
      activeIndex,
      photos.length,
    ).map((index) => photos[index].file_path);
    if (!current) return;

    const report = (ok: boolean) => {
      if (ok && isActive()) onLoaded();
    };

    report(await this.prefetch(current));
    if (!isActive()) return;

    await Promise.all(
      neighbors.map((url) => this.prefetch(url).then(report)),
    );
  }

  /** The thumbnail until the full-size image has downloaded, then the full image. */
  static getViewerSource(photo: PlantPhoto): { uri: string } {
    return {
      uri:
        !photo.thumbnail_path || this.loaded.has(photo.file_path)
          ? photo.file_path
          : photo.thumbnail_path,
    };
  }

  /** For tests. */
  static reset(): void {
    this.loaded.clear();
    this.pending.clear();
  }
}
