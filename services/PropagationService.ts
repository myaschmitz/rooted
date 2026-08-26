import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { CacheService } from "./CacheService";
import { CacheInvalidationService } from "./CacheInvalidationService";
import { CacheKeyBuilder } from "./CacheKeyBuilder";
import { PlantService } from "./PlantService";
import { EventService } from "./EventService";
import { TagService } from "./TagService";
import { CACHE_TTL, DB_TABLES, DB_COLUMNS } from "../constants/domain";
import {
  MAX_LINEAGE_DEPTH,
  buildPropagationNote,
  isGeneratedPropagationNote,
} from "../constants/propagation";
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
  /** Tags to apply to the cutting, usually inherited from the parent. */
  tagIds?: string[];
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

    // Tags are inherited traits ("variegated", "rare"), so a failure here
    // shouldn't undo a plant that already exists.
    if (input.tagIds?.length) {
      try {
        await TagService.addMultipleTagsToPlant(child.id, input.tagIds);
      } catch (error) {
        console.error("Failed to copy tags to the propagation:", error);
      }
    }

    // The child exists either way, so a failed event shouldn't fail the
    // propagation — the lineage link is the durable part.
    await this.writePropagationEvents(parent, child, propagatedAt);

    await CacheInvalidationService.invalidateOnUserAction("plant_propagated", {
      entityId: parent.id,
      additionalData: { relatedPlantId: child.id },
    });

    return child;
  }

  /**
   * Log the pair of `propagate` events that describe one parent/child link.
   *
   * Both sides are attempted independently so one failing doesn't lose the
   * other, and neither failing undoes the lineage link itself.
   */
  private static async writePropagationEvents(
    parent: Plant,
    child: Plant,
    propagatedAt: string,
  ): Promise<void> {
    const parentLabel = parent.name || parent.type;
    const childLabel = child.name || child.type;

    const results = await Promise.allSettled([
      EventService.createEvent({
        plant_id: parent.id,
        event_type: "propagate",
        date: propagatedAt,
        notes: buildPropagationNote("parent", childLabel),
        child_plant_id: child.id,
      }),
      EventService.createEvent({
        plant_id: child.id,
        event_type: "propagate",
        date: propagatedAt,
        notes: buildPropagationNote("child", parentLabel),
        parent_plant_id: parent.id,
      }),
    ]);

    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("Failed to log propagate event:", result.reason);
      }
    });
  }

  /**
   * Remove the auto-generated `propagate` events joining two plants.
   *
   * Events the user has since edited are left alone: the lineage link is
   * current state, but an edited note is history worth keeping.
   */
  private static async removeGeneratedPropagationEvents(
    plantId: string,
    parentPlantId: string,
  ): Promise<void> {
    try {
      const [childEvents, parentEvents] = await Promise.all([
        EventService.getEventsByPlantId(plantId),
        EventService.getEventsByPlantId(parentPlantId),
      ]);

      const stale = [
        ...childEvents.filter(
          (event) => event.parent_plant_id === parentPlantId,
        ),
        ...parentEvents.filter((event) => event.child_plant_id === plantId),
      ].filter(
        (event) =>
          event.event_type === "propagate" &&
          isGeneratedPropagationNote(event.notes),
      );

      await Promise.all(stale.map((event) => EventService.deleteEvent(event.id)));
    } catch (error) {
      // Losing the link matters more than tidying its paperwork.
      console.error("Failed to clean up propagate events:", error);
    }
  }

  /**
   * Point an existing plant at a parent, or detach it with `null`.
   *
   * Used to record a propagation after the fact, so the events it writes are
   * dated from `propagatedAt` rather than now. Re-pointing at a different
   * parent tidies up the previous link's paperwork first.
   *
   * The database enforces the cycle rule too; checking here turns a raw
   * constraint violation into a message worth showing a user.
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

    // Validate the shape of the request before touching any records, so a
    // cycle reads as a cycle rather than whichever lookup happened to run first.
    if (parentPlantId) {
      const rows = await this.getLineageGraph();
      if (this.isDescendant(rows, parentPlantId, plantId)) {
        throw new ValidationError(
          "parent_plant_id",
          "That plant was propagated from this one, so it cannot also be its parent.",
        );
      }
    }

    const existing = await PlantService.getPlantById(plantId);
    if (!existing) {
      throw new PlantNotFoundError(plantId);
    }

    let parent: Plant | null = null;
    if (parentPlantId) {
      parent = await PlantService.getPlantById(parentPlantId);
      if (!parent) {
        throw new PlantNotFoundError(parentPlantId);
      }
    }

    const propagatedAt = options.propagatedAt ?? new Date().toISOString();

    const updated = await PlantService.updatePlant(plantId, {
      parent_plant_id: parentPlantId,
      propagated_at: parentPlantId ? propagatedAt : null,
      propagation_method: parentPlantId ? (options.method ?? "other") : null,
    });

    const previousParentId = existing.parent_plant_id;
    if (previousParentId && previousParentId !== parentPlantId) {
      await this.removeGeneratedPropagationEvents(plantId, previousParentId);
    }

    if (parent && previousParentId !== parentPlantId) {
      await this.writePropagationEvents(parent, updated ?? existing, propagatedAt);
    }

    await CacheInvalidationService.invalidateOnUserAction("plant_propagated", {
      entityId: plantId,
      additionalData: { relatedPlantId: parentPlantId ?? undefined },
    });

    // A re-point touches three plants; the old parent needs its caches cleared too.
    if (previousParentId && previousParentId !== parentPlantId) {
      await CacheInvalidationService.invalidateOnUserAction("plant_propagated", {
        entityId: plantId,
        additionalData: { relatedPlantId: previousParentId },
      });
    }

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
