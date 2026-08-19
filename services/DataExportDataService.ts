import { BATCH_CONFIG, DB_COLUMNS, DB_TABLES } from "../constants/domain";
import type { Database } from "../types/Database";
import type { PlantPhoto, PlantTag } from "../types/Plant";
import { HouseholdService } from "./HouseholdService";
import { supabase } from "./SupabaseService";

type Tables = Database["public"]["Tables"];
type HouseholdRow = Tables["households"]["Row"];
type HouseholdMemberRow = Tables["household_members"]["Row"];
type ActivityLogRow = Tables["activity_log"]["Row"];
type PlantRow = Tables["plants"]["Row"];
type EventRow = Tables["events"]["Row"];
type PlantNoteRow = Tables["plant_notes"]["Row"];
type TagRow = Tables["tags"]["Row"];

interface PlantTagWithHousehold extends PlantTag {
  plants: { household_id: string };
}

export interface ExportPhoto extends PlantPhoto {
  export_path: string;
}

export interface DataExportDataset {
  household: HouseholdRow;
  household_members: HouseholdMemberRow[];
  activity_log: ActivityLogRow[];
  plants: PlantRow[];
  events: EventRow[];
  photos: ExportPhoto[];
  notes: PlantNoteRow[];
  tags: TagRow[];
  plant_tags: PlantTag[];
}

interface QueryResponse {
  data: unknown;
  error: { message: string } | null;
}

const PHOTO_EXTENSION_PATTERN = /\.[a-z0-9]{1,8}$/i;

export class DataExportDataService {
  static getPhotoArchivePath(photo: PlantPhoto): string {
    const pathWithoutQuery = photo.file_path.split(/[?#]/, 1)[0];
    const sourceName = pathWithoutQuery.split("/").pop() ?? "";
    const extension = sourceName.match(PHOTO_EXTENSION_PATTERN)?.[0] ?? ".jpg";
    return `photos/${photo.plant_id}/${photo.id}${extension.toLowerCase()}`;
  }

  static async getExportData(): Promise<DataExportDataset> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const householdId = session.household_id;
    const [
      householdResponse,
      householdMembers,
      activityLog,
      plants,
      events,
      photos,
      notes,
      tags,
    ] = await Promise.all([
      supabase
        .from(DB_TABLES.HOUSEHOLDS)
        .select("*")
        .eq("id", householdId)
        .single(),
      this.fetchHouseholdRows<HouseholdMemberRow>(
        DB_TABLES.HOUSEHOLD_MEMBERS,
        householdId,
      ),
      this.fetchHouseholdRows<ActivityLogRow>(
        DB_TABLES.ACTIVITY_LOG,
        householdId,
      ),
      this.fetchHouseholdRows<PlantRow>(DB_TABLES.PLANTS, householdId),
      this.fetchHouseholdRows<EventRow>(DB_TABLES.EVENTS, householdId),
      this.fetchHouseholdRows<PlantPhoto>(
        DB_TABLES.PLANT_PHOTOS,
        householdId,
      ),
      this.fetchHouseholdRows<PlantNoteRow>(DB_TABLES.NOTES, householdId),
      this.fetchHouseholdRows<TagRow>(DB_TABLES.TAGS, householdId),
    ]);

    const household = this.requireSingleRow<HouseholdRow>(
      householdResponse,
      "household",
    );
    const plantTags = await this.fetchPlantTags(householdId);

    return {
      household,
      household_members: householdMembers,
      activity_log: activityLog,
      plants,
      events,
      photos: photos.map((photo) => ({
        ...photo,
        export_path: this.getPhotoArchivePath(photo),
      })),
      notes,
      tags,
      plant_tags: plantTags,
    };
  }

  private static async fetchHouseholdRows<T>(
    table: string,
    householdId: string,
  ): Promise<T[]> {
    return this.fetchAllPages<T>(async (from, to) =>
      supabase
        .from(table)
        .select("*")
        .eq(DB_COLUMNS.HOUSEHOLD_ID, householdId)
        .range(from, to),
    );
  }

  private static async fetchPlantTags(
    householdId: string,
  ): Promise<PlantTag[]> {
    const rows = await this.fetchAllPages<PlantTagWithHousehold>(
      async (from, to) =>
        supabase
          .from(DB_TABLES.PLANT_TAGS)
          .select("id, plant_id, tag_id, created_at, plants!inner(household_id)")
          .eq(`plants.${DB_COLUMNS.HOUSEHOLD_ID}`, householdId)
          .range(from, to),
    );

    return rows.map(({ plants: _plants, ...plantTag }) => plantTag);
  }

  private static async fetchAllPages<T>(
    fetchPage: (from: number, to: number) => PromiseLike<QueryResponse>,
  ): Promise<T[]> {
    const rows: T[] = [];

    while (true) {
      const from = rows.length;
      const response = await fetchPage(
        from,
        from + BATCH_CONFIG.DATA_EXPORT_PAGE_SIZE - 1,
      );
      const page = this.requireRows<T>(response);
      rows.push(...page);

      if (page.length < BATCH_CONFIG.DATA_EXPORT_PAGE_SIZE) {
        return rows;
      }
    }
  }

  private static requireRows<T>(response: QueryResponse): T[] {
    if (response.error) {
      throw new Error(`Failed to export data: ${response.error.message}`);
    }
    return (response.data ?? []) as T[];
  }

  private static requireSingleRow<T>(
    response: QueryResponse,
    label: string,
  ): T {
    if (response.error) {
      throw new Error(`Failed to export ${label}: ${response.error.message}`);
    }
    if (!response.data) {
      throw new Error(`Failed to export ${label}: no data returned`);
    }
    return response.data as T;
  }
}
