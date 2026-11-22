/**
 * Order in which full-size photos should be loaded while the viewer is open:
 * the photo being viewed first, then the next one, then the previous one.
 */
export function getPrefetchOrder(activeIndex: number, count: number): number[] {
  if (activeIndex < 0 || activeIndex >= count) {
    return [];
  }

  return [activeIndex, activeIndex + 1, activeIndex - 1].filter(
    (index) => index >= 0 && index < count,
  );
}
