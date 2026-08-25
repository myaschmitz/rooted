/**
 * SINGLE SOURCE OF TRUTH for how a plant was propagated from its parent.
 *
 * This list must stay in sync with:
 *   - the `plants_propagation_method_check` CHECK constraint in
 *     supabase/migrations/20260824000000_add_plant_propagation.sql
 *   - `Plant.propagation_method` in types/Plant.ts
 *   - `Database.public.Tables.plants` rows in types/Database.ts
 *
 * Kept free of UI imports so the service layer can depend on it.
 */
export const PROPAGATION_METHODS = [
  "cutting",
  "division",
  "offset",
  "leaf",
  "seed",
  "air_layer",
  "other",
] as const;

export type PropagationMethod = (typeof PROPAGATION_METHODS)[number];

export const PROPAGATION_METHOD_LABELS: Record<PropagationMethod, string> = {
  cutting: "Cutting",
  division: "Division",
  offset: "Offset / Pup",
  leaf: "Leaf",
  seed: "Seed",
  air_layer: "Air Layer",
  other: "Other",
};

export const isPropagationMethod = (
  value: string | undefined | null,
): value is PropagationMethod =>
  !!value && PROPAGATION_METHODS.includes(value as PropagationMethod);

export const getPropagationMethodLabel = (
  method: PropagationMethod | string | undefined | null,
): string | undefined =>
  isPropagationMethod(method) ? PROPAGATION_METHOD_LABELS[method] : undefined;

/** Depth cap mirroring the recursive guard in the propagation migration. */
export const MAX_LINEAGE_DEPTH = 100;

/** Auto-generated note stored on the two events a propagation creates. */
export const buildPropagationNote = (
  direction: "parent" | "child",
  otherPlantLabel: string,
): string =>
  direction === "parent"
    ? `Propagated ${otherPlantLabel}`
    : `Propagated from ${otherPlantLabel}`;

/**
 * True when a note is one we generated, so the UI can hide it in favour of the
 * tappable lineage link. Matches on shape rather than an exact string so a
 * later plant rename doesn't resurrect a stale note.
 */
export const isGeneratedPropagationNote = (
  notes: string | null | undefined,
): boolean => !!notes && /^Propagated (from )?\S.*$/.test(notes.trim());
