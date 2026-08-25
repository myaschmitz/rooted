import { PropagationService } from "../../services/PropagationService";
import { PlantService } from "../../services/PlantService";
import { EventService } from "../../services/EventService";
import { HouseholdService } from "../../services/HouseholdService";
import { CacheInvalidationService } from "../../services/CacheInvalidationService";
import type { LineagePlant, Plant } from "../../types/Plant";

jest.mock("../../services/HouseholdService");
jest.mock("../../services/PlantService");
jest.mock("../../services/EventService");

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

    it("logs a propagate event on the parent pointing at the new plant", async () => {
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

    it("still returns the child when the parent event fails to log", async () => {
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
      (PlantService.updatePlant as jest.Mock).mockResolvedValue(null);
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
  });
});
