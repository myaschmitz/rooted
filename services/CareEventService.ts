import uuid from 'react-native-uuid';
import { CareEvent } from '../types/Plant';
import { DatabaseService } from './DatabaseService';

export class CareEventService {
  static async getCareEventsByPlantId(plantId: string): Promise<CareEvent[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM care_events WHERE plant_id = ? ORDER BY date DESC',
      [plantId]
    );
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as CareEvent[];
  }

  static async createCareEvent(eventData: Omit<CareEvent, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<CareEvent> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();
    const careEvent: CareEvent = {
      id: uuid.v4() as string,
      ...eventData,
      created_at: now,
      updated_at: now,
      synced: false
    };

    await db.runAsync(
      `INSERT INTO care_events (id, plant_id, event_type, date, notes, fertilizer_concentration, fertilizer_amount, pest_severity, health_status, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [careEvent.id, careEvent.plant_id, careEvent.event_type, careEvent.date,
       careEvent.notes || null, careEvent.fertilizer_concentration || null,
       careEvent.fertilizer_amount || null, careEvent.pest_severity || null,
       careEvent.health_status || null, careEvent.created_at, careEvent.updated_at, careEvent.synced ? 1 : 0]
    );

    return careEvent;
  }

  static async updateCareEvent(id: string, updates: Partial<Omit<CareEvent, 'id' | 'created_at'>>): Promise<CareEvent | null> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();
    
    const currentEvent = await this.getCareEventById(id);
    if (!currentEvent) return null;

    const updatedEvent = {
      ...currentEvent,
      ...updates,
      updated_at: now,
      synced: false
    };

    await db.runAsync(
      `UPDATE care_events SET plant_id = ?, event_type = ?, date = ?, notes = ?, 
       fertilizer_concentration = ?, fertilizer_amount = ?, pest_severity = ?, health_status = ?, updated_at = ?, synced = ?
       WHERE id = ?`,
      [updatedEvent.plant_id, updatedEvent.event_type, updatedEvent.date,
       updatedEvent.notes || null, updatedEvent.fertilizer_concentration || null,
       updatedEvent.fertilizer_amount || null, updatedEvent.pest_severity || null,
       updatedEvent.health_status || null, updatedEvent.updated_at, updatedEvent.synced ? 1 : 0, id]
    );

    return updatedEvent;
  }

  static async getCareEventById(id: string): Promise<CareEvent | null> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getFirstAsync('SELECT * FROM care_events WHERE id = ?', [id]);
    if (!result) return null;
    return {
      ...(result as any),
      synced: Boolean((result as any).synced)
    } as CareEvent;
  }

  static async deleteCareEvent(id: string): Promise<boolean> {
    const db = await DatabaseService.getDatabase();
    const result = await db.runAsync('DELETE FROM care_events WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async getRecentCareEvents(limit: number = 10): Promise<CareEvent[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM care_events ORDER BY date DESC LIMIT ?',
      [limit]
    );
    return result.map(row => ({
      ...(row as any),
      synced: Boolean((row as any).synced)
    })) as CareEvent[];
  }

  static async getLastCareEventByType(plantId: string, eventType: string): Promise<CareEvent | null> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getFirstAsync(
      'SELECT * FROM care_events WHERE plant_id = ? AND event_type = ? ORDER BY date DESC LIMIT 1',
      [plantId, eventType]
    );
    if (!result) return null;
    return {
      ...(result as any),
      synced: Boolean((result as any).synced)
    } as CareEvent;
  }

  static async getCareEventStats(plantId: string): Promise<{
    totalEvents: number;
    lastWatered?: string;
    lastFertilized?: string;
    lastRepotted?: string;
  }> {
    const db = await DatabaseService.getDatabase();
    
    // Get total events count
    const totalResult = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM care_events WHERE plant_id = ?',
      [plantId]
    );
    const totalEvents = (totalResult as any)?.count || 0;

    // Get last events by type
    const lastWatered = await this.getLastCareEventByType(plantId, 'water');
    const lastFertilized = await this.getLastCareEventByType(plantId, 'fertilize');
    const lastRepotted = await this.getLastCareEventByType(plantId, 'repot');

    return {
      totalEvents,
      lastWatered: lastWatered?.date,
      lastFertilized: lastFertilized?.date,
      lastRepotted: lastRepotted?.date,
    };
  }

  static async deleteAllCareEvents(): Promise<void> {
    const db = await DatabaseService.getDatabase();
    await db.runAsync('DELETE FROM care_events');
  }
}
