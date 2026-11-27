declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

// HouseholdService remembers its sign-in across calls, so each test loads a
// fresh copy of the module (and of the AsyncStorage mock it uses).
function load() {
  let HouseholdService: typeof import("../../services/HouseholdService").HouseholdService;
  let AsyncStorage: any;
  jest.isolateModules(() => {
    HouseholdService = require("../../services/HouseholdService").HouseholdService;
    AsyncStorage = require("@react-native-async-storage/async-storage");
  });
  return { HouseholdService: HouseholdService!, AsyncStorage };
}

const storedSession = {
  user_name: "Ann",
  household_id: "HAAAAAAA",
  role: "member" as const,
};

describe("HouseholdService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.signInAnonymously.mockResolvedValue({ data: { session: {} }, error: null });
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe("ensureSignedIn", () => {
    it("signs in anonymously once when there is no session", async () => {
      const { HouseholdService } = load();

      await Promise.all([
        HouseholdService.ensureSignedIn(),
        HouseholdService.ensureSignedIn(),
      ]);
      await HouseholdService.ensureSignedIn();

      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalledTimes(1);
    });

    it("keeps an existing session", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: "t" } },
        error: null,
      });
      const { HouseholdService } = load();

      await HouseholdService.ensureSignedIn();

      expect(mockSupabase.auth.signInAnonymously).not.toHaveBeenCalled();
    });

    it("tries again after a failed sign-in", async () => {
      mockSupabase.auth.signInAnonymously
        .mockResolvedValueOnce({ data: null, error: { message: "offline" } })
        .mockResolvedValueOnce({ data: { session: {} }, error: null });
      const { HouseholdService } = load();

      await expect(HouseholdService.ensureSignedIn()).rejects.toThrow("offline");
      await HouseholdService.ensureSignedIn();

      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalledTimes(2);
    });
  });

  describe("restoreSession", () => {
    it("returns false without a stored session and makes no requests", async () => {
      const { HouseholdService, AsyncStorage } = load();
      AsyncStorage.getItem.mockResolvedValue(null);

      await expect(HouseholdService.restoreSession()).resolves.toBe(false);
      expect(mockSupabase.auth.signInAnonymously).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("claims the stored member and refreshes its role", async () => {
      const { HouseholdService, AsyncStorage } = load();
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSession));
      mockSupabase.rpc.mockResolvedValue({
        data: [{ user_name: "Ann", role: "admin" }],
        error: null,
      });

      await expect(HouseholdService.restoreSession()).resolves.toBe(true);

      expect(mockSupabase.rpc).toHaveBeenCalledWith("claim_household_membership", {
        p_household_id: "HAAAAAAA",
        p_user_name: "Ann",
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ ...storedSession, role: "admin" }),
      );
    });

    it("clears the session when the member no longer exists", async () => {
      const { HouseholdService, AsyncStorage } = load();
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSession));
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await expect(HouseholdService.restoreSession()).resolves.toBe(false);
      expect(AsyncStorage.multiRemove).toHaveBeenCalled();
    });

    it("keeps the session when the server can't be reached", async () => {
      const { HouseholdService, AsyncStorage } = load();
      AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedSession));
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: "Network request failed" },
      });

      await expect(HouseholdService.restoreSession()).resolves.toBe(true);
      expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
    });
  });

  describe("joinHousehold", () => {
    it("stores the household id, member name and role the database returns", async () => {
      const { HouseholdService, AsyncStorage } = load();
      // The code was regenerated, so it no longer matches the household id.
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            success: true,
            household_name: "Alpha",
            error_message: null,
            user_name: "Ann",
            role: "admin",
            household_id: "HAAAAAAA",
          },
        ],
        error: null,
      });

      const result = await HouseholdService.joinHousehold({
        householdCode: " hnewcode ",
        memberUserName: "ann",
      });

      expect(result).toEqual({ success: true, household_name: "Alpha", error_message: null });
      expect(mockSupabase.auth.signInAnonymously).toHaveBeenCalled();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ user_name: "Ann", household_id: "HAAAAAAA", role: "admin" }),
      );
    });

    it("doesn't store a session when the code is wrong", async () => {
      const { HouseholdService, AsyncStorage } = load();
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            success: false,
            household_name: null,
            error_message: "Household code not found",
            user_name: null,
            role: null,
          },
        ],
        error: null,
      });

      const result = await HouseholdService.joinHousehold({
        householdCode: "HZZZZZZZ",
        memberUserName: "Ann",
      });

      expect(result.success).toBe(false);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("regenerateHouseholdCode", () => {
    it("returns the new code and keeps the stored household id", async () => {
      const { HouseholdService, AsyncStorage } = load();
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ ...storedSession, role: "admin" }),
      );
      mockSupabase.rpc.mockResolvedValue({ data: "HNEWCODE", error: null });
      mockSupabase._response = { data: null, error: null };

      await expect(HouseholdService.regenerateHouseholdCode()).resolves.toBe("HNEWCODE");

      expect(mockSupabase.rpc).toHaveBeenCalledWith("regenerate_household_code", {
        p_household_id: "HAAAAAAA",
      });
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("validateHouseholdCode", () => {
    it("returns the household name for a known code", async () => {
      const { HouseholdService } = load();
      mockSupabase.rpc.mockResolvedValue({
        data: [{ valid: true, household_name: "Alpha" }],
        error: null,
      });

      await expect(HouseholdService.validateHouseholdCode("HAAAAAAA")).resolves.toEqual({
        valid: true,
        household_name: "Alpha",
      });
      expect(mockSupabase.rpc).toHaveBeenCalledWith("validate_household_code", {
        p_code: "HAAAAAAA",
      });
    });

    it("reports an unknown code", async () => {
      const { HouseholdService } = load();
      mockSupabase.rpc.mockResolvedValue({
        data: [{ valid: false, household_name: null }],
        error: null,
      });

      const result = await HouseholdService.validateHouseholdCode("HZZZZZZZ");
      expect(result.valid).toBe(false);
    });
  });
});

export {};
