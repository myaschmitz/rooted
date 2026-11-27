import { supabase } from "./SupabaseService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DB_TABLES, STORAGE_KEYS } from "../constants/domain";
import { CacheInvalidationService } from "./CacheInvalidationService";
import {
  Household,
  HouseholdMember,
  ActivityLogEntry,
  CreateHouseholdRequest,
  CreateHouseholdResponse,
  JoinHouseholdRequest,
  JoinHouseholdResponse,
  HouseholdCodeValidationResponse,
  UserSession,
  ActivityAction,
  ActivityLogDetails,
} from "../types/Household";

// Each app install signs in to Supabase anonymously, and the database links
// that auth user to a household member (see
// supabase/migrations/20261124000000_household_rls_lockdown.sql). Row-level
// security only returns rows for households the signed-in device is linked
// to, so every request has to carry that session.
let signInPromise: Promise<void> | null = null;

export class HouseholdService {
  // Makes sure the Supabase client has an auth session, creating an anonymous
  // user on first launch. supabase-js persists and refreshes it afterwards.
  static ensureSignedIn(): Promise<void> {
    if (!signInPromise) {
      signInPromise = (async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) return;

        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          throw new Error(error.message || "Failed to sign in");
        }
      })().catch((error) => {
        // Let the next call try again (e.g. once the device is back online).
        signInPromise = null;
        throw error;
      });
    }
    return signInPromise;
  }

  // Run at launch. Signs in, links this device to the member stored in the
  // local household session (installs from before device linking need this
  // once), and refreshes the stored role and name from the server.
  //
  // Returns false when there's no local session, or the household or member
  // no longer exists (the local session is cleared then). If the server can't
  // be reached it keeps the local session, so an offline launch doesn't drop
  // the user back to the welcome screen.
  static async restoreSession(): Promise<boolean> {
    const session = await this.getUserSession();
    if (!session?.household_id || !session.user_name) {
      return false;
    }

    try {
      await this.ensureSignedIn();

      const { data, error } = await supabase.rpc(
        "claim_household_membership",
        {
          p_household_id: session.household_id,
          p_user_name: session.user_name,
        },
      );
      if (error) throw error;

      const member = (data as { user_name: string; role: "admin" | "member" }[] | null)?.[0];
      if (!member) {
        await this.clearUserSession();
        return false;
      }

      if (member.role !== session.role || member.user_name !== session.user_name) {
        await this.storeUserSession({
          ...session,
          user_name: member.user_name,
          role: member.role,
        });
      }
      return true;
    } catch (error) {
      console.error("Error restoring household session:", error);
      return true;
    }
  }

  static async createHousehold(
    request: CreateHouseholdRequest,
  ): Promise<CreateHouseholdResponse> {
    try {
      const adminUserName = request.adminUserName;

      await this.ensureSignedIn();

      const { data, error } = await supabase.rpc("create_household", {
        household_name: request.householdName,
        admin_user_name: adminUserName,
      });

      if (error) {
        console.error("Error creating household:", error);
        throw new Error(error.message || "Failed to create household");
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from household creation");
      }

      const createResult = data[0];

      const response: CreateHouseholdResponse = {
        household_code: createResult.household_code,
        household_id: createResult.household_id,
      };

      await this.storeUserSession({
        user_id: request.adminUserId,
        user_name: adminUserName,
        household_id: createResult.household_id,
        role: "admin",
      });

      return response;
    } catch (error) {
      console.error("Error in createHousehold:", error);
      throw error;
    }
  }

  static async joinHousehold(
    request: JoinHouseholdRequest,
  ): Promise<JoinHouseholdResponse> {
    try {
      await this.ensureSignedIn();

      // The function signs this device in as the member with this name if one
      // exists (case-insensitive), keeping their role; otherwise it adds a
      // new member.
      const { data, error } = await supabase.rpc("join_household", {
        household_code: request.householdCode,
        member_user_name: request.memberUserName,
      });

      if (error) {
        console.error("Error joining household:", error);
        throw new Error(error.message || "Failed to join household");
      }

      if (!data || data.length === 0) {
        throw new Error("No data returned from household join");
      }

      const joinResult = data[0];

      const response: JoinHouseholdResponse = {
        success: joinResult.success,
        household_name: joinResult.household_name,
        error_message: joinResult.error_message,
      };

      if (joinResult.success) {
        // Store the household's id, not the code that was typed: the two
        // differ once the code has been regenerated.
        await this.storeUserSession({
          user_name: joinResult.user_name,
          household_id: joinResult.household_id,
          role: joinResult.role,
        });
      }

      return response;
    } catch (error) {
      console.error("Error in joinHousehold:", error);
      throw error;
    }
  }

  static async validateHouseholdCode(
    code: string,
  ): Promise<HouseholdCodeValidationResponse> {
    try {
      await this.ensureSignedIn();

      // Only members can read households, so this goes through a function.
      const { data, error } = await supabase.rpc("validate_household_code", {
        p_code: code,
      });

      if (error) throw error;

      const result = (data as { valid: boolean; household_name: string | null }[] | null)?.[0];
      if (!result?.valid) {
        return {
          valid: false,
          error_message: "Household code not found",
        };
      }

      return {
        valid: true,
        household_name: result.household_name ?? undefined,
      };
    } catch (error) {
      console.error("Error validating household code:", error);
      return {
        valid: false,
        error_message: "Failed to validate household code",
      };
    }
  }

  static async getCurrentHousehold(): Promise<Household | null> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id) {
        return null;
      }

      const { data, error } = await supabase
        .from(DB_TABLES.HOUSEHOLDS)
        .select("*")
        .eq("id", session.household_id)
        .single();

      if (error) {
        console.error("Error getting current household:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getCurrentHousehold:", error);
      return null;
    }
  }

  static async getHouseholdMembers(
    householdId?: string,
  ): Promise<HouseholdMember[]> {
    try {
      const session = await this.getUserSession();
      const targetHouseholdId = householdId || session?.household_id;

      if (!targetHouseholdId) {
        return [];
      }

      const { data, error } = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .select("*")
        .eq("household_id", targetHouseholdId)
        .order("joined_at", { ascending: true });

      if (error) {
        console.error("Error getting household members:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getHouseholdMembers:", error);
      return [];
    }
  }

  static async getCurrentMember(): Promise<HouseholdMember | null> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || !session?.user_name) {
        return null;
      }

      const { data, error } = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .select("*")
        .eq("household_id", session.household_id)
        .eq("user_name", session.user_name)
        .single();

      if (error) {
        console.error("Error getting current member:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in getCurrentMember:", error);
      return null;
    }
  }

  static async leaveHousehold(): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || !session?.user_name) {
        throw new Error("No household session found");
      }

      await this.logActivity("left household", {
        member_name: session.user_name,
      });

      const { error } = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .delete()
        .eq("household_id", session.household_id)
        .eq("user_name", session.user_name);

      if (error) {
        console.error("Error leaving household:", error);
        throw new Error("Failed to leave household");
      }

      await this.clearUserSession();
    } catch (error) {
      console.error("Error in leaveHousehold:", error);
      throw error;
    }
  }

  static async removeMember(memberId: string): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const memberToRemove = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .select("user_name")
        .eq("id", memberId)
        .eq("household_id", session.household_id)
        .single();

      if (memberToRemove.error) {
        throw new Error("Member not found");
      }

      await this.logActivity("removed member", {
        member_name: memberToRemove.data.user_name,
        removed_by: session.user_name,
      });

      const { error } = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .delete()
        .eq("id", memberId)
        .eq("household_id", session.household_id);

      if (error) {
        console.error("Error removing member:", error);
        throw new Error("Failed to remove member");
      }
    } catch (error) {
      console.error("Error in removeMember:", error);
      throw error;
    }
  }

  static async updateMemberRole(
    memberId: string,
    newRole: "admin" | "member",
  ): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const memberToUpdate = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .select("user_name, role")
        .eq("id", memberId)
        .eq("household_id", session.household_id)
        .single();

      if (memberToUpdate.error) {
        throw new Error("Member not found");
      }

      const { error } = await supabase
        .from(DB_TABLES.HOUSEHOLD_MEMBERS)
        .update({ role: newRole })
        .eq("id", memberId)
        .eq("household_id", session.household_id);

      if (error) {
        console.error("Error updating member role:", error);
        throw new Error("Failed to update member role");
      }

      await this.logActivity("updated member role", {
        member_name: memberToUpdate.data.user_name,
        old_role: memberToUpdate.data.role,
        new_role: newRole,
        updated_by: session.user_name,
      });
    } catch (error) {
      console.error("Error in updateMemberRole:", error);
      throw error;
    }
  }

  static async updateHouseholdName(newName: string): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { error } = await supabase
        .from(DB_TABLES.HOUSEHOLDS)
        .update({ name: newName })
        .eq("id", session.household_id);

      if (error) {
        console.error("Error updating household name:", error);
        throw new Error("Failed to update household name");
      }

      await this.logActivity("updated household name", {
        new_name: newName,
        updated_by: session.user_name,
      });
    } catch (error) {
      console.error("Error in updateHouseholdName:", error);
      throw error;
    }
  }

  static async regenerateHouseholdCode(): Promise<string> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      // Replaces the household's join code. The household id, and so this
      // session, stays the same. The database checks that this device is an
      // admin.
      const { data, error } = await supabase.rpc("regenerate_household_code", {
        p_household_id: session.household_id,
      });

      if (error || !data) {
        throw new Error("Failed to generate new household code");
      }

      const newCode = data as string;

      await this.logActivity("regenerated household code", {
        regenerated_by: session.user_name,
      });

      return newCode;
    } catch (error) {
      console.error("Error in regenerateHouseholdCode:", error);
      throw error;
    }
  }

  static async deleteHousehold(): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== "admin") {
        throw new Error("Unauthorized: Admin access required");
      }

      const { error } = await supabase
        .from(DB_TABLES.HOUSEHOLDS)
        .delete()
        .eq("id", session.household_id);

      if (error) {
        console.error("Error deleting household:", error);
        throw new Error("Failed to delete household");
      }

      await this.clearUserSession();
    } catch (error) {
      console.error("Error in deleteHousehold:", error);
      throw error;
    }
  }

  static async logActivity(
    action: ActivityAction,
    details?: ActivityLogDetails,
    plantName?: string,
  ): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || !session?.user_name) {
        console.warn("Cannot log activity: no household session");
        return;
      }

      const { error } = await supabase.from(DB_TABLES.ACTIVITY_LOG).insert([
        {
          household_id: session.household_id,
          user_name: session.user_name,
          action,
          plant_name: plantName || null,
          details: details || null,
        },
      ]);

      if (error) {
        console.error("Error logging activity:", error);
      }
    } catch (error) {
      console.error("Error in logActivity:", error);
    }
  }

  static async getActivityLog(limit: number = 50): Promise<ActivityLogEntry[]> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id) {
        return [];
      }

      const { data, error } = await supabase
        .from(DB_TABLES.ACTIVITY_LOG)
        .select("*")
        .eq("household_id", session.household_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error getting activity log:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getActivityLog:", error);
      return [];
    }
  }

  static async storeUserSession(session: UserSession): Promise<void> {
    try {
      const previous = await this.getUserSession();
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_SESSION,
        JSON.stringify(session),
      );
      if (previous?.household_id !== session.household_id) {
        CacheInvalidationService.invalidate("household_changed");
      }
    } catch (error) {
      console.error("Error storing user session:", error);
      throw error;
    }
  }

  static async getUserSession(): Promise<UserSession | null> {
    try {
      const sessionData = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
      if (!sessionData) {
        return null;
      }
      return JSON.parse(sessionData);
    } catch (error) {
      console.error("Error getting user session:", error);
      return null;
    }
  }

  // Throws if no active household session. Use for service methods that
  // need a household_id and nothing else from the session.
  static async requireHouseholdId(): Promise<string> {
    const session = await this.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }
    return session.household_id;
  }

  // Throws if no active household session. Use when caller also needs
  // user_id / user_name (e.g. activity logging, audit columns).
  static async requireSession(): Promise<UserSession> {
    const session = await this.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }
    return session;
  }

  static async clearUserSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_SESSION,
        STORAGE_KEYS.HOUSEHOLD_CACHE,
      ]);
      CacheInvalidationService.invalidate("household_changed");
    } catch (error) {
      console.error("Error clearing user session:", error);
      throw error;
    }
  }

  static async isUserInHousehold(): Promise<boolean> {
    try {
      return await this.restoreSession();
    } catch (error) {
      console.error("Error checking household status:", error);
      return false;
    }
  }

  static async getUserHouseholdContext() {
    try {
      const [household, currentMember, members] = await Promise.all([
        this.getCurrentHousehold(),
        this.getCurrentMember(),
        this.getHouseholdMembers(),
      ]);

      return {
        household,
        currentMember,
        members,
        isAdmin: currentMember?.role === "admin",
      };
    } catch (error) {
      console.error("Error getting household context:", error);
      return {
        household: null,
        currentMember: null,
        members: [],
        isAdmin: false,
      };
    }
  }
}
