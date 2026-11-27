import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_CONFIG, STORAGE_KEYS } from "../constants/domain";
import { supabase } from "./SupabaseService";

// plant_photos stores each file's public-style URL
// (".../storage/v1/object/public/plant-photos/<file>"). The bucket is private,
// so those URLs don't load; this service swaps them for signed links, which
// storage only issues to members of the household that owns the file (see
// supabase/migrations/20261130000000_private_photo_storage.sql).
//
// Signed links are saved on the device and reused until shortly before they
// expire. A new link has a new token, and expo-image and the native photo
// cache key on URL, so reusing links is what keeps photos from being
// downloaded again on every refresh or launch.

type SignedUrl = { url: string; expiresAt: number };
type PhotoPaths = { file_path: string; thumbnail_path?: string | null };

const OBJECT_URL = new RegExp(
  `/storage/v1/object/(?:public|sign|authenticated)/${STORAGE_CONFIG.BUCKET_NAME}/([^?#]+)`,
);

let cache: Map<string, SignedUrl> | null = null;
let cacheLoad: Promise<Map<string, SignedUrl>> | null = null;

function isPhoto(value: unknown): value is PhotoPaths {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PhotoPaths).file_path === "string"
  );
}

async function loadCache(): Promise<Map<string, SignedUrl>> {
  if (cache) return cache;
  if (!cacheLoad) {
    cacheLoad = (async () => {
      const loaded = new Map<string, SignedUrl>();
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.SIGNED_PHOTO_URLS);
        if (raw) {
          for (const [name, entry] of Object.entries(
            JSON.parse(raw) as Record<string, SignedUrl>,
          )) {
            loaded.set(name, entry);
          }
        }
      } catch (error) {
        console.error("Error loading signed photo links:", error);
      }
      cache = loaded;
      return loaded;
    })();
  }
  return cacheLoad;
}

async function saveCache(entries: Map<string, SignedUrl>): Promise<void> {
  const now = Date.now();
  const live: Record<string, SignedUrl> = {};
  for (const [name, entry] of entries) {
    if (entry.expiresAt > now) live[name] = entry;
  }
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SIGNED_PHOTO_URLS,
      JSON.stringify(live),
    );
  } catch (error) {
    console.error("Error saving signed photo links:", error);
  }
}

export class PhotoUrlService {
  // The file's name inside the bucket, from a public or signed storage URL.
  // Null for anything else, such as a local file path.
  static objectName(url: string | null | undefined): string | null {
    if (!url) return null;
    const match = OBJECT_URL.exec(url);
    return match ? decodeURIComponent(match[1]) : null;
  }

  // Maps each storage URL to a signed link, signing only the files that don't
  // have a fresh one yet, in a single request. URLs that aren't storage URLs,
  // or that can't be signed, map to themselves.
  static async signUrls(
    urls: (string | null | undefined)[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    const entries = await loadCache();
    const freshUntil = Date.now() + STORAGE_CONFIG.SIGNED_URL_REFRESH_MARGIN_MS;
    const toSign = new Set<string>();

    for (const url of urls) {
      if (!url) continue;
      const name = this.objectName(url);
      if (!name) {
        result.set(url, url);
        continue;
      }
      const cached = entries.get(name);
      if (cached && cached.expiresAt > freshUntil) {
        result.set(url, cached.url);
      } else {
        toSign.add(name);
      }
    }

    if (toSign.size > 0) {
      const names = [...toSign];
      const expiresAt = Date.now() + STORAGE_CONFIG.SIGNED_URL_TTL_SECONDS * 1000;
      try {
        const { data, error } = await supabase.storage
          .from(STORAGE_CONFIG.BUCKET_NAME)
          .createSignedUrls(names, STORAGE_CONFIG.SIGNED_URL_TTL_SECONDS);
        if (error) throw error;
        for (const item of data ?? []) {
          if (item.path && item.signedUrl && !item.error) {
            entries.set(item.path, { url: item.signedUrl, expiresAt });
          }
        }
        await saveCache(entries);
      } catch (error) {
        // Offline or not allowed: fall back to the stored URL. The image
        // won't load, but the rest of the screen still works.
        console.error("Error signing photo links:", error);
      }
    }

    for (const url of urls) {
      if (!url || result.has(url)) continue;
      const name = this.objectName(url);
      result.set(url, (name && entries.get(name)?.url) || url);
    }
    return result;
  }

  static async signUrl(url: string): Promise<string> {
    return (await this.signUrls([url])).get(url) ?? url;
  }

  // Copies of the photos with file_path and thumbnail_path replaced by signed
  // links.
  static async signPhotos<T extends PhotoPaths>(photos: T[]): Promise<T[]> {
    if (photos.length === 0) return photos;
    const signed = await this.signUrls(
      photos.flatMap((photo) => [photo.file_path, photo.thumbnail_path]),
    );
    return photos.map((photo) => ({
      ...photo,
      file_path: signed.get(photo.file_path) ?? photo.file_path,
      thumbnail_path: photo.thumbnail_path
        ? (signed.get(photo.thumbnail_path) ?? photo.thumbnail_path)
        : photo.thumbnail_path,
    }));
  }

  // Signs whatever a photo method returns: one photo, a list, a map of plant
  // id to photo, or null.
  static async signResult<R>(result: R): Promise<R> {
    if (isPhoto(result)) {
      return (await this.signPhotos([result]))[0] as R;
    }
    if (Array.isArray(result)) {
      if (!result.every(isPhoto)) return result;
      return (await this.signPhotos(result)) as R;
    }
    if (typeof result === "object" && result !== null) {
      const values = Object.values(result);
      if (values.length === 0 || !values.every((v) => v === null || isPhoto(v))) {
        return result;
      }
      const photos = values.filter(isPhoto);
      const signed = await this.signPhotos(photos);
      const byOriginal = new Map(photos.map((photo, i) => [photo, signed[i]]));
      return Object.fromEntries(
        Object.entries(result).map(([key, value]) => [
          key,
          value === null ? null : byOriginal.get(value as PhotoPaths),
        ]),
      ) as R;
    }
    return result;
  }

  // Wraps the named static methods of a photo service so every photo they
  // return carries signed links. Used once per platform's PhotoService, so no
  // read path can hand a caller an unsigned URL.
  static signResultsOf(service: object, methodNames: string[]): void {
    const target = service as Record<string, unknown>;
    for (const name of methodNames) {
      const original = target[name];
      if (typeof original !== "function") {
        throw new Error(`PhotoUrlService: ${name} is not a method`);
      }
      target[name] = async (...args: unknown[]) =>
        PhotoUrlService.signResult(
          await (original as (...a: unknown[]) => Promise<unknown>).apply(
            service,
            args,
          ),
        );
    }
  }

  // Forgets saved links, e.g. after leaving a household.
  static async clear(): Promise<void> {
    cache = new Map();
    cacheLoad = Promise.resolve(cache);
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SIGNED_PHOTO_URLS);
    } catch (error) {
      console.error("Error clearing signed photo links:", error);
    }
  }
}
