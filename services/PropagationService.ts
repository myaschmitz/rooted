import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { CacheService } from "./CacheService";
import { CacheInvalidationService } from "./CacheInvalidationService";
import { CacheKeyBuilder } from "./CacheKeyBuilder";
import { PlantService } from "./PlantService";
import { EventService } from "./EventService";
import { CACHE_TTL, DB_TABLES, DB_COLUMNS } from "../constants/domain";
import { MAX_LINEAGE_DEPTH } from "../constants/propagation";
import type { PropagationMethod } from "../constants/propagation";
import { ErrorMapper } from "../errors/ErrorMapper";
import { PlantNotFoundError, ValidationError } from "../errors/AppErrors";
import type {
  LineageNode,
  LineagePlant,
  Plant,
  PlantLineage,
} from "../types/Plant";

/** Columns needed to assemble a propagation tree — deliberately not `*`. */
const LINEAGE_COLUMNS =
  "id, name, type, archived, thumbnail_photo_id, parent_plant_id, propagated_at, propagation_method";

export interface PropagateInput {
  parentPlantId: string;
  name?: string;
  type?: string;
  location?: string;
  notes?: string;
  method: PropagationMethod;
  /** ISO date the cutting was taken. Defaults to now. */
  propagatedAt?: string;
}

export class PropagationService {
  /**
   * Every plant in the household reduced to its lineage columns.
   *
   * Trees are assembled from this in memory rather than with a recursive SQL
   * query: households hold at most a few hundred plants, the payload is a
   * fraction of a full plant list, and it keeps arbitrary-depth traversal in
   * one testable place. Archived plants are included so archiving a parent
   * doesn't sever its children's history.
   */
  static async getLineageGraph(): Promise<LineagePlant[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantLineageGraph(session.household_id);

    const cached =
      await CacheService.getCachedResponse<LineagePlant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .select(LINEAGE_COLUMNS)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "fetch", "plant");
    }

    const rows = (data || []) as unknown as LineagePlant[];

    await CacheService.cacheApiResponse(
      cacheKey,
      rows,
      CACHE_TTL.PLANT_LINEAGE,
    );

    return rows;
  }

  /**
   * Assemble the propagation family that `plantId` belongs to.
   *
   * Pure and synchronous so tree shape is testable without a database. Returns
   * null when the plant isn't in the supplied rows. Depth is capped so
   * unexpected data can never produce an unbounded walk.
   */
  static buildLineage(
    rows: LineagePlant[],
    plantId: string,
  ): PlantLineage | null {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const target = byId.get(plantId);
    if (!target) return null;

    const childrenByParent = new Map<string, LineagePlant[]>();
    for (const row of rows) {
      if (!row.parent_plant_id) continue;
      const siblings = childrenByParent.get(row.parent_plant_id);
      if (siblings) {
        siblings.push(row);
      } else {
        childrenByParent.set(row.parent_plant_id, [row]);
      }
    }

    // Walk up to the family root, collecting ancestors nearest-first. `seen`
    // stops a cycle that slipped past the database guard from hanging the app.
    const ancestors: LineagePlant[] = [];
    const seen = new Set<string>([target.id]);
    let cursor = target;
    while (cursor.parent_plant_id && ancestors.length < MAX_LINEAGE_DEPTH) {
      const parent = byId.get(cursor.parent_plant_id);
      if (!parent || seen.has(parent.id)) break;
      seen.add(parent.id);
      ancestors.push(parent);
      cursor = parent;
    }

    const rootPlant =
      ancestors.length > 0 ? ancestors[ancestors.length - 1] : target;

    const visited = new Set<string>();
    let size = 0;

    const buildNode = (plant: LineagePlant, depth: number): LineageNode => {
      visited.add(plant.id);
      size += 1;

      const children =
        depth >= MAX_LINEAGE_DEPTH
          ? []
          : sortLineagePlants(childrenByParent.get(plant.id) || [])
              .filter((child) => !visited.has(child.id))
              .map((child) => buildNode(child, depth + 1));

      return { plant, depth, children };
    };

    const root = buildNode(rootPlant, 0);

    return {
      plant: target,
      root,
      ancestors: [...ancestors].reverse(),
      parent: ancestors[0] ?? null,
      children: sortLineagePlants(childrenByParent.get(target.id) || []),
      size,
    };
  }

  static async getLineage(plantId: string): Promise<PlantLineage | null> {
    if (!plantId) return null;
    const rows = await this.getLineageGraph();
    return this.buildLineage(rows, plantId);
  }

  /**
   * Create a new plant recorded as propagated from `parentPlantId`, and log a
   * `propagate` event on the parent so its history shows what it produced.
   */
  static async propagateFrom(input: PropagateInput): Promise<Plant> {
    const parent = await PlantService.getPlantById(input.parentPlantId);
    if (!parent) {
      throw new PlantNotFoundError(input.parentPlantId);
    }

    const propagatedAt = input.propagatedAt ?? new Date().toISOString();

    const child = await PlantService.createPlant({
      name: input.name?.trim() || undefined,
      // A cutting is the same species as its parent unless told otherwise.
      type: input.type?.trim() || parent.type,
      location: input.location?.trim() || parent.location,
      notes: input.notes?.trim() || undefined,
      parent_plant_id: parent.id,
      propagated_at: propagatedAt,
      propagation_method: input.method,
    });

    // The child exists either way, so a failed event shouldn't fail the
    // propagation — the lineage link is the durable part.
    try {
      await EventService.createEvent({
        plant_id: parent.id,
        event_type: "propagate",
        date: propagatedAt,
        notes: input.name?.trim()
          ? `Propagated ${input.name.trim()}`
          : "Propagated a new plant",
        child_plant_id: child.id,
      });
    } catch (error) {
      console.error("Failed to log propagate event on parent:", error);
    }

    await CacheInvalidationService.invalidateOnUserAction("plant_propagated", {
      entityId: parent.id,
      additionalData: { relatedPlantId: child.id },
    });

    return child;
  }

  /**
   * Point an existing plant at a parent, or detach it with `null`.
   *
   * The database enforces this too; checking here turns a raw constraint
   * violation into a message worth showing a user.
   */
  static async setParent(
    plantId: string,
    parentPlantId: string | null,
    options: {
      method?: PropagationMethod;
      propagatedAt?: string;
    } = {},
  ): Promise<Plant | null> {
    if (parentPlantId === plantId) {
      throw new ValidationError(
        "parent_plant_id",
        "A plant cannot be propagated from itself.",
      );
    }

    if (parentPlantId) {
      const rows = await this.getLineageGraph();
      if (this.isDescendant(rows, parentPlantId, plantId)) {
        throw new ValidationError(
          "parent_plant_id",
          "That plant was propagated from this one, so it cannot also be its parent.",
        );
      }
    }

    const updated = await PlantService.updatePlant(plantId, {
      parent_plant_id: parentPlantId,
      propagated_at: parentPlantId
        ? (options.propagatedAt ?? new Date().toISOString())
        : null,
      propagation_method: parentPlantId ? (options.method ?? "other") : null,
    });

    await CacheInvalidationService.invalidateOnUserAction("plant_propagated", {
      entityId: plantId,
      additionalData: { relatedPlantId: parentPlantId ?? undefined },
    });

    return updated;
  }

  /** True when `candidateId` sits somewhere below `plantId` in the tree. */
  static isDescendant(
    rows: LineagePlant[],
    candidateId: string,
    plantId: string,
  ): boolean {
    const byId = new Map(rows.map((row) => [row.id, row]));
    let cursor = byId.get(candidateId);
    let depth = 0;

    while (cursor?.parent_plant_id && depth < MAX_LINEAGE_DEPTH) {
      if (cursor.parent_plant_id === plantId) return true;
      cursor = byId.get(cursor.parent_plant_id);
      depth += 1;
    }

    return false;
  }
}

/** Oldest propagation first, then by display name, so ordering is stable. */
function sortLineagePlants(plants: LineagePlant[]): LineagePlant[] {
  return [...plants].sort((a, b) => {
    if (
      a.propagated_at &&
      b.propagated_at &&
      a.propagated_at !== b.propagated_at
    ) {
      return a.propagated_at < b.propagated_at ? -1 : 1;
    }
    if (a.propagated_at && !b.propagated_at) return -1;
    if (!a.propagated_at && b.propagated_at) return 1;
    return (a.name || a.type).localeCompare(b.name || b.type);
  });
}
