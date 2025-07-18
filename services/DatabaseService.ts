import * as SQLite from 'expo-sqlite';

export class DatabaseService {
  private static instance: SQLite.SQLiteDatabase | null = null;

  static async getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (!this.instance) {
      this.instance = await SQLite.openDatabaseAsync('rooted.db');
      await this.initializeTables();
    }
    return this.instance;
  }

  private static async initializeTables(): Promise<void> {
    const db = this.instance!;

    // Plants table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS plants (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT NOT NULL,
        location TEXT,
        health_status TEXT DEFAULT 'good',
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // Care events table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS care_events (
        id TEXT PRIMARY KEY,
        plant_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        date TEXT NOT NULL,
        notes TEXT,
        fertilizer_concentration TEXT,
        fertilizer_amount TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
      );
    `);

    // Plant photos table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS plant_photos (
        id TEXT PRIMARY KEY,
        plant_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        caption TEXT,
        taken_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
      );
    `);

    // Plant notes table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS plant_notes (
        id TEXT PRIMARY KEY,
        plant_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0,
        FOREIGN KEY (plant_id) REFERENCES plants (id) ON DELETE CASCADE
      );
    `);

    // Create indexes for better performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_care_events_plant_id ON care_events (plant_id);
      CREATE INDEX IF NOT EXISTS idx_care_events_date ON care_events (date);
      CREATE INDEX IF NOT EXISTS idx_plant_photos_plant_id ON plant_photos (plant_id);
      CREATE INDEX IF NOT EXISTS idx_plant_notes_plant_id ON plant_notes (plant_id);
    `);
  }

  static async resetDatabase(): Promise<void> {
    const db = await this.getDatabase();
    await db.execAsync(`
      DROP TABLE IF EXISTS plant_notes;
      DROP TABLE IF EXISTS plant_photos;
      DROP TABLE IF EXISTS care_events;
      DROP TABLE IF EXISTS plants;
    `);
    await this.initializeTables();
  }
}
