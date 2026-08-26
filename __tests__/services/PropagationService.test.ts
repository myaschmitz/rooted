import { PropagationService } from "../../services/PropagationService";
import { PlantService } from "../../services/PlantService";
import { EventService } from "../../services/EventService";
import { TagService } from "../../services/TagService";
import { HouseholdService } from "../../services/HouseholdService";
import { CacheInvalidationService } from "../../services/CacheInvalidationService";
import type { LineagePlant, Plant } from "../../types/Plant";
import {
  buildPropagationNote,
  isGeneratedPropagationNote,
} from "../../constants/propagation";

jest.mock("../../services/HouseholdService");
jest.mock("../../services/PlantService");
jest.mock("../../services/EventService");
jest.mock("../../services/TagService");

declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

const lineagePlant = (
  id: string,
  parent: string | null,
  overrides: Partial<LineagePlant> = {},
): LineagePlant => ({
  id,
  name: id,
  type: "Monstera Deliciosa",
  archived: false,
  parent_plant_id: parent,
  propagated_at: parent ? "2024-01-01T00:00:00.000Z" : null,
  propagation_method: parent ? "cutting" : null,
  ...overrides,
});

const plantRecord = (id: string, parent: string | null): Plant =>
  ({
    id,
    name: id,
    type: "Monstera Deliciosa",
    parent_plant_id: parent,
  }) as Plant;

//        root
//       /    \
//    kid-a   kid-b
//      |
//   grandkid
const FAMILY: LineagePlant[] = [
  lineagePlant("root", null),
  lineagePlant("kid-a", "root", { propagated_at: "2024-02-01T00:00:00.000Z" }),
  lineagePlant("kid-b", "root", { propagated_at: "2024-03-01T00:00:00.000Z" }),
  lineagePlant("grandkid", "kid-a"),
  lineagePlant("unrelated", null),
];

describe("PropagationService", () => {
  describe("buildLineage", () => {
    it("returns null for a plant that is not in the graph", () => {
      expect(PropagationService.buildLineage(FAMILY, "missing")).toBeNull();
    });

    it("treats a plant with no parent as its own root", () => {
      const lineage = PropagationService.buildLineage(FAMILY, "unrelated")!;

      expect(lineage.parent).toBeNull();
      expect(lineage.ancestors).toEqual([]);
      expect(lineage.children).toEqual([]);
      expect(lineage.root.plant.id).toBe("unrelated");
      expect(lineage.size).toBe(1);
    });

    it("resolves the root, ancestors, parent and children of a nested plant", () => {
      const lineage = PropagationService.buildLineage(FAMILY, "grandkid")!;

      expect(lineage.plant.id).toBe("grandkid");
      expect(lineage.root.plant.id).toBe("root");
      expect(lineage.ancestors.map((p) => p.id)).toEqual(["root", "kid-a"]);
      expect(lineage.parent?.id).toBe("kid-a");
      expect(lineage.children).toEqual([]);
      // root + kid-a + kid-b + grandkid, excluding the unrelated plant
      expect(lineage.size).toBe(4);
    });

    it("nests descendants at increasing depth", () => {
      const lineage = PropagationService.buildLineage(FAMILY, "root")!;

      expect(lineage.root.depth).toBe(0);
      expect(lineage.root.children.map((c) => c.plant.id)).toEqual([
        "kid-a",
        "kid-b",
      ]);
      expect(lineage.root.children[0].depth).toBe(1);
      expect(lineage.root.children[0].children[0].plant.id).toBe("grandkid");
      expect(lineage.root.children[0].children[0].depth).toBe(2);
      expect(lineage.children.map((c) => c.id)).toEqual(["kid-a", "kid-b"]);
    });

    it("orders siblings by when they were propagated", () => {
      const reversed = [
        lineagePlant("parent", null),
        lineagePlant("late", "parent", {
          propagated_at: "2024-06-01T00:00:00.000Z",
        }),
        lineagePlant("early", "parent", {
          propagated_at: "2024-01-01T00:00:00.000Z",
        }),
      ];

      const lineage = PropagationService.buildLineage(reversed, "parent")!;

      expect(lineage.children.map((c) => c.id)).toEqual(["early", "late"]);
    });

    it("includes archived plants so archiving a parent keeps the lineage", () => {
      const rows = [
        lineagePlant("parent", null, { archived: true }),
        lineagePlant("child", "parent"),
      ];

      const lineage = PropagationService.buildLineage(rows, "child")!;

      expect(lineage.parent?.id).toBe("parent");
      expect(lineage.parent?.archived).toBe(true);
    });

    it("terminates on a cycle that slipped past the database guard", () => {
      const cyclic = [
        lineagePlant("a", "b"),
        lineagePlant("b", "a"),
      ];

      const lineage = PropagationService.buildLineage(cyclic, "a")!;

      expect(lineage).not.toBeNull();
      expect(lineage.size).toBeLessThanOrEqual(2);
    });
  });

  describe("isDescendant", () => {
    it("detects a plant further down the tree", () => {
      expect(
        PropagationService.isDescendant(FAMILY, "grandkid", "root"),
      ).toBe(true);
    });

    it("rejects a plant that is not below the target", () => {
      expect(PropagationService.isDescendant(FAMILY, "root", "grandkid")).toBe(
        false,
      );
      expect(
        PropagationService.isDescendant(FAMILY, "unrelated", "root"),
      ).toBe(false);
    });
  });

  describe("getLineageGraph", () => {
    const mockSession = { household_id: "household-123", user_id: "user-123" };

    beforeEach(() => {
      jest.clearAllMocks();
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(
        mockSession,
      );
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase._response = { data: FAMILY, error: null };
    });

    it("scopes the query to the current household", async () => {
      const result = await PropagationService.getLineageGraph();

      expect(mockSupabase.from).toHaveBeenCalledWith("plants");
      expect(mockSupabase.eq).toHaveBeenCalledWith(
        "household_id",
        "household-123",
      );
      expect(result).toEqual(FAMILY);
    });

    it("throws when there is no household session", async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      await expect(PropagationService.getLineageGraph()).rejects.toThrow(
        "No household session found",
      );
    });
  });

  describe("propagateFrom", () => {
    const parent: Plant = {
      id: "parent-1",
      name: "Big Monstera",
      type: "Monstera Deliciosa",
      location: "Living Room",
      household_id: "household-123",
      pinned: false,
      archived: false,
      created_at: "2024-01-15T10:00:00.000Z",
      updated_at: "2024-01-15T10:00:00.000Z",
    };

    const child: Plant = { ...parent, id: "child-1", name: "Cutting" };

    beforeEach(() => {
      jest.clearAllMocks();
      (PlantService.getPlantById as jest.Mock).mockResolvedValue(parent);
      (PlantService.createPlant as jest.Mock).mockResolvedValue(child);
      (EventService.createEvent as jest.Mock).mockResolvedValue({});
      (TagService.addMultipleTagsToPlant as jest.Mock).mockResolvedValue([]);
    });

    it("creates the child with the parent link and inherited details", async () => {
      const result = await PropagationService.propagateFrom({
        parentPlantId: parent.id,
        name: "Cutting",
        method: "cutting",
        propagatedAt: "2024-04-01T00:00:00.000Z",
      });

      expect(PlantService.createPlant).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Cutting",
          type: parent.type,
          location: parent.location,
          parent_plant_id: parent.id,
          propagated_at: "2024-04-01T00:00:00.000Z",
          propagation_method: "cutting",
        }),
      );
      expect(result).toEqual(child);
    });

    it("logs a propagate event on both sides of the new link", async () => {
      await PropagationService.propagateFrom({
        parentPlantId: parent.id,
        method: "division",
        propagatedAt: "2024-04-01T00:00:00.000Z",
      });

      expect(EventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          plant_id: parent.id,
          event_type: "propagate",
          child_plant_id: child.id,
          date: "2024-04-01T00:00:00.000Z",
        }),
      );
      // The cutting's own history should say where it came from.
      expect(EventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          plant_id: child.id,
          event_type: "propagate",
          parent_plant_id: parent.id,
          date: "2024-04-01T00:00:00.000Z",
        }),
      );
      expect(EventService.createEvent).toHaveBeenCalledTimes(2);
      expect(
        CacheInvalidationService.invalidateOnUserAction,
      ).toHaveBeenCalledWith(
        "plant_propagated",
        expect.objectContaining({
          entityId: parent.id,
          additionalData: { relatedPlantId: child.id },
        }),
      );
    });

    it("still logs the child event when the parent event fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      (EventService.createEvent as jest.Mock)
        .mockRejectedValueOnce(new Error("event insert failed"))
        .mockResolvedValueOnce({});

      await expect(
        PropagationService.propagateFrom({
          parentPlantId: parent.id,
          method: "cutting",
        }),
      ).resolves.toEqual(child);

      expect(EventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ plant_id: child.id }),
      );
    });

    it("still returns the child when both events fail to log", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      (EventService.createEvent as jest.Mock).mockRejectedValue(
        new Error("event insert failed"),
      );

      await expect(
        PropagationService.propagateFrom({
          parentPlantId: parent.id,
          method: "cutting",
        }),
      ).resolves.toEqual(child);
    });

    it("copies the selected tags onto the cutting", async () => {
      await PropagationService.propagateFrom({
        parentPlantId: parent.id,
        method: "cutting",
        tagIds: ["tag-1", "tag-2"],
      });

      expect(TagService.addMultipleTagsToPlant).toHaveBeenCalledWith(
        child.id,
        ["tag-1", "tag-2"],
      );
    });

    it("skips the tag write when none are selected", async () => {
      await PropagationService.propagateFrom({
        parentPlantId: parent.id,
        method: "cutting",
        tagIds: [],
      });

      expect(TagService.addMultipleTagsToPlant).not.toHaveBeenCalled();
    });

    it("still returns the child when copying tags fails", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      (TagService.addMultipleTagsToPlant as jest.Mock).mockRejectedValue(
        new Error("tag insert failed"),
      );

      await expect(
        PropagationService.propagateFrom({
          parentPlantId: parent.id,
          method: "cutting",
          tagIds: ["tag-1"],
        }),
      ).resolves.toEqual(child);
    });

    it("throws when the parent does not exist in this household", async () => {
      (PlantService.getPlantById as jest.Mock).mockResolvedValue(null);

      await expect(
        PropagationService.propagateFrom({
          parentPlantId: "nope",
          method: "cutting",
        }),
      ).rejects.toThrow("not found");
    });
  });

  describe("setParent", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue({
        household_id: "household-123",
      });
      (PlantService.getPlantById as jest.Mock).mockImplementation(
        async (id: string) => plantRecord(id, id === "kid-a" ? "root" : null),
      );
      (PlantService.updatePlant as jest.Mock).mockImplementation(
        async (id: string) => plantRecord(id, null),
      );
      (EventService.getEventsByPlantId as jest.Mock).mockResolvedValue([]);
      (EventService.createEvent as jest.Mock).mockResolvedValue({ id: "event-1" });
      (EventService.deleteEvent as jest.Mock).mockResolvedValue(true);
      mockSupabase.from.mockReturnValue(mockSupabase);
      mockSupabase.select.mockReturnValue(mockSupabase);
      mockSupabase.eq.mockReturnValue(mockSupabase);
      mockSupabase._response = { data: FAMILY, error: null };
    });

    it("refuses to make a plant its own parent", async () => {
      await expect(
        PropagationService.setParent("root", "root"),
      ).rejects.toThrow("cannot be propagated from itself");
      expect(PlantService.updatePlant).not.toHaveBeenCalled();
    });

    it("refuses a parent that is already a descendant", async () => {
      await expect(
        PropagationService.setParent("root", "grandkid"),
      ).rejects.toThrow("cannot also be its parent");
      expect(PlantService.updatePlant).not.toHaveBeenCalled();
    });

    it("clears propagation details when detaching a plant", async () => {
      await PropagationService.setParent("kid-a", null);

      expect(PlantService.updatePlant).toHaveBeenCalledWith("kid-a", {
        parent_plant_id: null,
        propagated_at: null,
        propagation_method: null,
      });
    });

    it("records the link on both plants, dated retroactively", async () => {
      (PlantService.getPlantById as jest.Mock).mockImplementation(
        async (id: string) => plantRecord(id, null),
      );

      await PropagationService.setParent("kid-a", "root", {
        method: "division",
        propagatedAt: "2023-05-01T00:00:00.000Z",
      });

      expect(PlantService.updatePlant).toHaveBeenCalledWith("kid-a", {
        parent_plant_id: "root",
        propagated_at: "2023-05-01T00:00:00.000Z",
        propagation_method: "division",
      });

      const events = (EventService.createEvent as jest.Mock).mock.calls.map(
        (call) => call[0],
      );
      expect(events).toHaveLength(2);
      expect(events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            plant_id: "root",
            event_type: "propagate",
            date: "2023-05-01T00:00:00.000Z",
            child_plant_id: "kid-a",
          }),
          expect.objectContaining({
            plant_id: "kid-a",
            event_type: "propagate",
            date: "2023-05-01T00:00:00.000Z",
            parent_plant_id: "root",
          }),
        ]),
      );
    });

    it("deletes the generated events when unlinking, keeping edited ones", async () => {
      (EventService.getEventsByPlantId as jest.Mock).mockImplementation(
        async (id: string) =>
          id === "kid-a"
            ? [
                {
                  id: "generated",
                  event_type: "propagate",
                  parent_plant_id: "root",
                  notes: buildPropagationNote("child", "root"),
                },
                {
                  id: "edited",
                  event_type: "propagate",
                  parent_plant_id: "root",
                  notes: "Took this one the week I moved",
                },
              ]
            : [
                {
                  id: "generated-parent",
                  event_type: "propagate",
                  child_plant_id: "kid-a",
                  notes: buildPropagationNote("parent", "kid-a"),
                },
              ],
      );

      await PropagationService.setParent("kid-a", null);

      const deleted = (EventService.deleteEvent as jest.Mock).mock.calls.map(
        (call) => call[0],
      );
      expect(deleted).toEqual(
        expect.arrayContaining(["generated", "generated-parent"]),
      );
      expect(deleted).not.toContain("edited");
    });

    it("cleans up the old link before recording a new one", async () => {
      await PropagationService.setParent("kid-a", "kid-b");

      expect(EventService.getEventsByPlantId).toHaveBeenCalledWith("root");
      expect(EventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({ plant_id: "kid-b", child_plant_id: "kid-a" }),
      );
    });

    it("leaves events alone when the link is unchanged", async () => {
      await PropagationService.setParent("kid-a", "root");

      expect(EventService.createEvent).not.toHaveBeenCalled();
      expect(EventService.deleteEvent).not.toHaveBeenCalled();
    });
  });
});

describe("propagation note helpers", () => {
  it("builds the note for each side of the relationship", () => {
    expect(buildPropagationNote("parent", "Monstera Cutting")).toBe(
      "Propagated Monstera Cutting",
    );
    expect(buildPropagationNote("child", "Big Monstera")).toBe(
      "Propagated from Big Monstera",
    );
  });

  it("recognises its own generated notes", () => {
    expect(isGeneratedPropagationNote(buildPropagationNote("parent", "A"))).toBe(true);
    expect(isGeneratedPropagationNote(buildPropagationNote("child", "A"))).toBe(true);
  });

  it("still matches after the other plant is renamed", () => {
    expect(isGeneratedPropagationNote("Propagated from Some New Name")).toBe(true);
  });

  it("leaves user-written notes alone", () => {
    expect(isGeneratedPropagationNote("Looking healthy")).toBe(false);
    expect(isGeneratedPropagationNote("")).toBe(false);
    expect(isGeneratedPropagationNote(null)).toBe(false);
    expect(isGeneratedPropagationNote(undefined)).toBe(false);
  });
});
