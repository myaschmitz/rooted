import { useEffect, useMemo, useState } from 'react';
import { PlantPhoto } from '../../types/Plant';
import { PhotoPrefetchService } from '../../services/PhotoPrefetchService';

/**
 * Image sources for the native photo viewer. Each photo starts as its small
 * thumbnail so something shows immediately, and switches to the full-size image
 * once that has finished downloading. The photo being viewed is downloaded
 * first, then its neighbors, so swiping to the next photo is instant.
 */
export function useProgressivePhotoSources(
  photos: PlantPhoto[],
  activeIndex: number,
  enabled: boolean,
): { uri: string }[] {
  const [loadedCount, setLoadedCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    PhotoPrefetchService.prefetchAround(
      photos,
      activeIndex,
      () => active,
      () => setLoadedCount((count) => count + 1),
    );

    return () => {
      active = false;
    };
  }, [enabled, activeIndex, photos]);

  // loadedCount changes whenever another full-size image finishes downloading.
  return useMemo(
    () => photos.map((photo) => PhotoPrefetchService.getViewerSource(photo)),
    [photos, loadedCount],
  );
}
