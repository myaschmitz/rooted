import uuid from 'react-native-uuid';
import { Plant } from '../types/Plant';
import { DatabaseService } from './DatabaseService';

export class PlantService {
  static async getAllPlants(): Promise<Plant[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync('SELECT * FROM plants ORDER BY name ASC');
    return result.map(row => ({
      ...row,
      synced: Boolean(row.synced)
    })) as Plant[];
  }

  static async getPlantById(id: string): Promise<Plant | null> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getFirstAsync('SELECT * FROM plants WHERE id = ?', [id]);
    if (!result) return null;
    return {
      ...result,
      synced: Boolean(result.synced)
    } as Plant;
  }

  static async createPlant(plantData: Omit<Plant, 'id' | 'created_at' | 'updated_at' | 'synced'>): Promise<Plant> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();
    const plant: Plant = {
      id: uuid.v4() as string,
      ...plantData,
      created_at: now,
      updated_at: now,
      synced: false
    };

    await db.runAsync(
      `INSERT INTO plants (id, name, type, location, health_status, notes, created_at, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [plant.id, plant.name || null, plant.type, plant.location || null, plant.health_status || 'good', 
       plant.notes || null, plant.created_at, plant.updated_at, plant.synced ? 1 : 0]
    );

    return plant;
  }

  static async updatePlant(id: string, updates: Partial<Omit<Plant, 'id' | 'created_at'>>): Promise<Plant | null> {
    const db = await DatabaseService.getDatabase();
    const now = new Date().toISOString();
    
    const currentPlant = await this.getPlantById(id);
    if (!currentPlant) return null;

    const updatedPlant = {
      ...currentPlant,
      ...updates,
      updated_at: now,
      synced: false
    };

    await db.runAsync(
      `UPDATE plants SET name = ?, type = ?, location = ?, health_status = ?, notes = ?, updated_at = ?, synced = ?
       WHERE id = ?`,
      [updatedPlant.name || null, updatedPlant.type, updatedPlant.location || null, 
       updatedPlant.health_status || 'good', updatedPlant.notes || null, 
       updatedPlant.updated_at, updatedPlant.synced ? 1 : 0, id]
    );

    return updatedPlant;
  }

  static async deletePlant(id: string): Promise<boolean> {
    const db = await DatabaseService.getDatabase();
    const result = await db.runAsync('DELETE FROM plants WHERE id = ?', [id]);
    return result.changes > 0;
  }

  static async searchPlants(query: string): Promise<Plant[]> {
    const db = await DatabaseService.getDatabase();
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await db.getAllAsync(
      'SELECT * FROM plants WHERE LOWER(name) LIKE ? OR LOWER(type) LIKE ? OR LOWER(location) LIKE ? ORDER BY name ASC',
      [searchTerm, searchTerm, searchTerm]
    );
    return result.map(row => ({
      ...row,
      synced: Boolean(row.synced)
    })) as Plant[];
  }

  static async getPlantsByLocation(location: string): Promise<Plant[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM plants WHERE location = ? ORDER BY name ASC',
      [location]
    );
    return result.map(row => ({
      ...row,
      synced: Boolean(row.synced)
    })) as Plant[];
  }

  static async getPlantsByHealthStatus(status: string): Promise<Plant[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(
      'SELECT * FROM plants WHERE health_status = ? ORDER BY name ASC',
      [status]
    );
    return result.map(row => ({
      ...row,
      synced: Boolean(row.synced)
    })) as Plant[];
  }
}
