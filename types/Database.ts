import type { CareEventType } from "../constants/careTypes";

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          updated_at?: string;
        };
      };
      household_members: {
        Row: {
          id: string;
          household_id: string;
          user_id?: string;
          user_name: string;
          role: "admin" | "member";
          joined_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_id?: string;
          user_name: string;
          role?: "admin" | "member";
          joined_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_id?: string;
          user_name?: string;
          role?: "admin" | "member";
        };
      };
      activity_log: {
        Row: {
          id: string;
          household_id: string;
          user_name: string;
          action: string;
          plant_name?: string;
          details?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          user_name: string;
          action: string;
          plant_name?: string;
          details?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          user_name?: string;
          action?: string;
          plant_name?: string;
          details?: any;
        };
      };
      plants: {
        Row: {
          id: string;
          name?: string;
          type: string;
          location?: string;
          notes?: string;
          thumbnail_photo_id?: string;
          pinned: boolean;
          household_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          type: string;
          location?: string;
          notes?: string;
          thumbnail_photo_id?: string;
          pinned?: boolean;
          household_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string;
          location?: string;
          notes?: string;
          thumbnail_photo_id?: string;
          pinned?: boolean;
          household_id?: string;
          updated_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          plant_id: string;
          event_type: CareEventType;
          date: string;
          notes?: string;
          fertilizer_concentration?: "1/4" | "1/2" | "1x" | "1.5x" | "2x";
          pest_severity?: number;
          household_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          event_type: CareEventType;
          date: string;
          notes?: string;
          fertilizer_concentration?: "1/4" | "1/2" | "1x" | "1.5x" | "2x";
          pest_severity?: number;
          household_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          event_type?: CareEventType;
          date?: string;
          notes?: string;
          fertilizer_concentration?: "1/4" | "1/2" | "1x" | "1.5x" | "2x";
          pest_severity?: number;
          household_id?: string;
          updated_at?: string;
        };
      };
      plant_photos: {
        Row: {
          id: string;
          plant_id: string;
          file_path: string;
          thumbnail_path?: string;
          caption?: string;
          taken_at: string;
          event_id?: string;
          household_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          file_path: string;
          thumbnail_path?: string;
          caption?: string;
          taken_at: string;
          event_id?: string;
          household_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          file_path?: string;
          thumbnail_path?: string;
          caption?: string;
          taken_at?: string;
          event_id?: string;
          household_id?: string;
          updated_at?: string;
        };
      };
      plant_notes: {
        Row: {
          id: string;
          plant_id: string;
          content: string;
          household_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          content: string;
          household_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          content?: string;
          household_id?: string;
          updated_at?: string;
        };
      };
      tags: {
        Row: {
          id: string;
          name: string;
          color: string;
          household_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          household_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          household_id?: string;
          updated_at?: string;
        };
      };
      plant_tags: {
        Row: {
          id: string;
          plant_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          plant_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          plant_id?: string;
          tag_id?: string;
        };
      };
    };
  };
};
