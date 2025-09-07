export interface Household {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id?: string;
  user_name: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface ActivityLogEntry {
  id: string;
  household_id: string;
  user_name: string;
  action: string;
  plant_name?: string;
  details?: any;
  created_at: string;
}

export interface HouseholdContext {
  household: Household | null;
  currentMember: HouseholdMember | null;
  members: HouseholdMember[];
  isAdmin: boolean;
}

export interface CreateHouseholdRequest {
  householdName: string;
  adminUserName: string;
  adminUserId?: string;
}

export interface CreateHouseholdResponse {
  household_code: string;
  household_id: string;
}

export interface JoinHouseholdRequest {
  householdCode: string;
  memberUserName: string;
  memberUserId?: string;
}

export interface JoinHouseholdResponse {
  success: boolean;
  household_name: string | null;
  error_message: string | null;
}

export interface HouseholdCodeValidationResponse {
  valid: boolean;
  household_name?: string;
  error_message?: string;
}

export interface UserSession {
  user_id?: string;
  user_name: string;
  household_id: string;
  role: 'admin' | 'member';
}

export interface WelcomeFlowState {
  step: 'name' | 'choice' | 'create_household' | 'join_household' | 'complete';
  userName?: string;
  householdName?: string;
  householdCode?: string;
  isCreating?: boolean;
  error?: string;
}

export type ActivityAction = 
  | 'created household'
  | 'joined household' 
  | 'left household'
  | 'removed member'
  | 'updated member role'
  | 'updated household name'
  | 'regenerated household code'
  | 'added plant'
  | 'updated plant'
  | 'deleted plant'
  | 'watered'
  | 'fertilized'
  | 'repotted'
  | 'pruned'
  | 'pest spotted'
  | 'insecticide spray'
  | 'added photo'
  | 'added note'
  | 'updated note'
  | 'deleted note'
  | 'other care'
  | 'created reminder'
  | 'updated reminder'
  | 'deleted reminder';

export interface ActivityLogDetails {
  plant_id?: string;
  plant_type?: string;
  location?: string;
  event_type?: string;
  notes?: string;
  household_name?: string;
  member_name?: string;
  photo_count?: number;
  [key: string]: any;
}