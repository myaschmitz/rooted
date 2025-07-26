import { supabase } from './SupabaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from '../types/Household';

const STORAGE_KEYS = {
  USER_SESSION: 'household_user_session',
  HOUSEHOLD_CACHE: 'household_cache',
};

export class HouseholdService {
  
  static async createHousehold(request: CreateHouseholdRequest): Promise<CreateHouseholdResponse> {
    try {
      const { data, error } = await supabase.rpc('create_household', {
        household_name: request.householdName,
        admin_user_name: request.adminUserName,
        admin_user_id: request.adminUserId || null,
      });

      if (error) {
        console.error('Error creating household:', error);
        throw new Error(error.message || 'Failed to create household');
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from household creation');
      }

      const result = data[0];
      const response: CreateHouseholdResponse = {
        household_code: result.household_code,
        household_id: result.household_id,
      };

      await this.storeUserSession({
        user_id: request.adminUserId,
        user_name: request.adminUserName,
        household_id: result.household_id,
        role: 'admin',
      });

      return response;
    } catch (error) {
      console.error('Error in createHousehold:', error);
      throw error;
    }
  }

  static async joinHousehold(request: JoinHouseholdRequest): Promise<JoinHouseholdResponse> {
    try {
      const { data, error } = await supabase.rpc('join_household', {
        household_code: request.householdCode,
        member_user_name: request.memberUserName,
        member_user_id: request.memberUserId || null,
      });

      if (error) {
        console.error('Error joining household:', error);
        throw new Error(error.message || 'Failed to join household');
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from household join');
      }

      const result = data[0];
      const response: JoinHouseholdResponse = {
        success: result.success,
        household_name: result.household_name,
        error_message: result.error_message,
      };

      if (result.success) {
        await this.storeUserSession({
          user_id: request.memberUserId,
          user_name: request.memberUserName,
          household_id: request.householdCode,
          role: 'member',
        });
      }

      return response;
    } catch (error) {
      console.error('Error in joinHousehold:', error);
      throw error;
    }
  }

  static async validateHouseholdCode(code: string): Promise<HouseholdCodeValidationResponse> {
    try {
      const { data, error } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            valid: false,
            error_message: 'Household code not found',
          };
        }
        throw error;
      }

      return {
        valid: true,
        household_name: data.name,
      };
    } catch (error) {
      console.error('Error validating household code:', error);
      return {
        valid: false,
        error_message: 'Failed to validate household code',
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
        .from('households')
        .select('*')
        .eq('id', session.household_id)
        .single();

      if (error) {
        console.error('Error getting current household:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCurrentHousehold:', error);
      return null;
    }
  }

  static async getHouseholdMembers(householdId?: string): Promise<HouseholdMember[]> {
    try {
      const session = await this.getUserSession();
      const targetHouseholdId = householdId || session?.household_id;
      
      if (!targetHouseholdId) {
        return [];
      }

      const { data, error } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', targetHouseholdId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error getting household members:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getHouseholdMembers:', error);
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
        .from('household_members')
        .select('*')
        .eq('household_id', session.household_id)
        .eq('user_name', session.user_name)
        .single();

      if (error) {
        console.error('Error getting current member:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getCurrentMember:', error);
      return null;
    }
  }

  static async leaveHousehold(): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || !session?.user_name) {
        throw new Error('No household session found');
      }

      await this.logActivity('left household', {
        member_name: session.user_name,
      });

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', session.household_id)
        .eq('user_name', session.user_name);

      if (error) {
        console.error('Error leaving household:', error);
        throw new Error('Failed to leave household');
      }

      await this.clearUserSession();
    } catch (error) {
      console.error('Error in leaveHousehold:', error);
      throw error;
    }
  }

  static async removeMember(memberId: string): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const memberToRemove = await supabase
        .from('household_members')
        .select('user_name')
        .eq('id', memberId)
        .eq('household_id', session.household_id)
        .single();

      if (memberToRemove.error) {
        throw new Error('Member not found');
      }

      await this.logActivity('removed member', {
        member_name: memberToRemove.data.user_name,
        removed_by: session.user_name,
      });

      const { error } = await supabase
        .from('household_members')
        .delete()
        .eq('id', memberId)
        .eq('household_id', session.household_id);

      if (error) {
        console.error('Error removing member:', error);
        throw new Error('Failed to remove member');
      }
    } catch (error) {
      console.error('Error in removeMember:', error);
      throw error;
    }
  }

  static async updateMemberRole(memberId: string, newRole: 'admin' | 'member'): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const memberToUpdate = await supabase
        .from('household_members')
        .select('user_name, role')
        .eq('id', memberId)
        .eq('household_id', session.household_id)
        .single();

      if (memberToUpdate.error) {
        throw new Error('Member not found');
      }

      const { error } = await supabase
        .from('household_members')
        .update({ role: newRole })
        .eq('id', memberId)
        .eq('household_id', session.household_id);

      if (error) {
        console.error('Error updating member role:', error);
        throw new Error('Failed to update member role');
      }

      await this.logActivity('updated member role', {
        member_name: memberToUpdate.data.user_name,
        old_role: memberToUpdate.data.role,
        new_role: newRole,
        updated_by: session.user_name,
      });
    } catch (error) {
      console.error('Error in updateMemberRole:', error);
      throw error;
    }
  }

  static async updateHouseholdName(newName: string): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase
        .from('households')
        .update({ name: newName })
        .eq('id', session.household_id);

      if (error) {
        console.error('Error updating household name:', error);
        throw new Error('Failed to update household name');
      }

      await this.logActivity('updated household name', {
        new_name: newName,
        updated_by: session.user_name,
      });
    } catch (error) {
      console.error('Error in updateHouseholdName:', error);
      throw error;
    }
  }

  static async regenerateHouseholdCode(): Promise<string> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data, error } = await supabase.rpc('generate_household_code');

      if (error || !data) {
        throw new Error('Failed to generate new household code');
      }

      const newCode = data;

      const { error: updateError } = await supabase
        .from('households')
        .update({ id: newCode })
        .eq('id', session.household_id);

      if (updateError) {
        throw new Error('Failed to update household with new code');
      }

      session.household_id = newCode;
      await this.storeUserSession(session);

      await this.logActivity('regenerated household code', {
        regenerated_by: session.user_name,
      });

      return newCode;
    } catch (error) {
      console.error('Error in regenerateHouseholdCode:', error);
      throw error;
    }
  }

  static async deleteHousehold(): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || session.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase
        .from('households')
        .delete()
        .eq('id', session.household_id);

      if (error) {
        console.error('Error deleting household:', error);
        throw new Error('Failed to delete household');
      }

      await this.clearUserSession();
    } catch (error) {
      console.error('Error in deleteHousehold:', error);
      throw error;
    }
  }

  static async logActivity(
    action: ActivityAction,
    details?: ActivityLogDetails,
    plantName?: string
  ): Promise<void> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id || !session?.user_name) {
        console.warn('Cannot log activity: no household session');
        return;
      }

      const { error } = await supabase
        .from('activity_log')
        .insert([{
          household_id: session.household_id,
          user_name: session.user_name,
          action,
          plant_name: plantName || null,
          details: details || null,
        }]);

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (error) {
      console.error('Error in logActivity:', error);
    }
  }

  static async getActivityLog(limit: number = 50): Promise<ActivityLogEntry[]> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('household_id', session.household_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting activity log:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getActivityLog:', error);
      return [];
    }
  }

  static async storeUserSession(session: UserSession): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    } catch (error) {
      console.error('Error storing user session:', error);
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
      console.error('Error getting user session:', error);
      return null;
    }
  }

  static async clearUserSession(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([STORAGE_KEYS.USER_SESSION, STORAGE_KEYS.HOUSEHOLD_CACHE]);
    } catch (error) {
      console.error('Error clearing user session:', error);
      throw error;
    }
  }

  static async isUserInHousehold(): Promise<boolean> {
    try {
      const session = await this.getUserSession();
      if (!session?.household_id) {
        return false;
      }

      const household = await this.getCurrentHousehold();
      return household !== null;
    } catch (error) {
      console.error('Error checking household status:', error);
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
        isAdmin: currentMember?.role === 'admin',
      };
    } catch (error) {
      console.error('Error getting household context:', error);
      return {
        household: null,
        currentMember: null,
        members: [],
        isAdmin: false,
      };
    }
  }
}