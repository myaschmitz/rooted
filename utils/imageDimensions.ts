export type ImageResizeAction =
  | { resize: { width: number } }
  | { resize: { height: number } };

export function getMaxEdgeResizeAction(
  width: number,
  height: number,
  maxEdge: number,
): ImageResizeAction | null {
  if (Math.max(width, height) <= maxEdge) {
    return null;
  }

  return width >= height
    ? { resize: { width: maxEdge } }
    : { resize: { height: maxEdge } };
}
