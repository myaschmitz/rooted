import { PlantService } from '../../services/PlantService';
import { EventService } from '../../services/EventService';
import { HouseholdService } from '../../services/HouseholdService';
import { Plant, Event } from '../../types/Plant';

// Mock the dependencies but allow services to interact with each other
jest.mock('../../services/HouseholdService');
jest.mock('../../services/CacheInvalidationService');

// Get the global mock client from jest.setup.js
declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

describe('Plant and Event Integration Tests', () => {
  const mockSession = {
    household_id: 'household-123',
    user_id: 'user-123',
  };

  const mockPlant: Plant = {
    id: 'plant-123',
    name: 'Integration Test Plant',
    type: 'Monstera Deliciosa',
    location: 'Test Room',
    household_id: 'household-123',
    pinned: false,
    archived: false,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock HouseholdService
    (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(mockSession);
    (HouseholdService.logActivity as jest.Mock).mockResolvedValue(undefined);
    
    // Reset Supabase mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
  });

  describe('Complete Plant Care Workflow', () => {
    it('should create a plant and log multiple care events', async () => {
      // Step 1: Create a plant
      mockSupabase.single.mockResolvedValueOnce({
        data: mockPlant,
        error: null,
      });

      const createdPlant = await PlantService.createPlant({
        name: mockPlant.name,
        type: mockPlant.type,
        location: mockPlant.location,
      });

      expect(createdPlant).toMatchObject({
        name: 'Integration Test Plant',
        type: 'Monstera Deliciosa',
        location: 'Test Room',
      });
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'added plant',
        expect.any(Object),
        mockPlant.name
      );

      // Step 2: Log watering event
      const waterEvent: Event = {
        id: 'event-water-123',
        plant_id: mockPlant.id,
        event_type: 'water',
        date: '2024-01-15T10:30:00.000Z',
        notes: 'First watering after creation',
        household_id: 'household-123',
        created_at: '2024-01-15T10:30:00.000Z',
        updated_at: '2024-01-15T10:30:00.000Z',
      };

      // Mock PlantService.getPlantById for EventService
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(mockPlant);
      
      mockSupabase.single.mockResolvedValueOnce({
        data: waterEvent,
        error: null,
      });

      const createdWaterEvent = await EventService.createEvent({
        plant_id: mockPlant.id,
        event_type: 'water',
        date: waterEvent.date,
        notes: waterEvent.notes,
      });

      expect(createdWaterEvent.plant_id).toBe(mockPlant.id);
      expect(createdWaterEvent.event_type).toBe('water');
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'watered',
        expect.objectContaining({
          plant_id: mockPlant.id,
          event_type: 'water',
        }),
        mockPlant.name
      );

      // Step 3: Log fertilizing event
      const fertilizeEvent: Event = {
        id: 'event-fertilize-123',
        plant_id: mockPlant.id,
        event_type: 'fertilize',
        date: '2024-01-16T10:00:00.000Z',
        notes: 'Monthly fertilizing',
        fertilizer_concentration: '1/2',
        household_id: 'household-123',
        created_at: '2024-01-16T10:00:00.000Z',
        updated_at: '2024-01-16T10:00:00.000Z',
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: fertilizeEvent,
        error: null,
      });

      const createdFertilizeEvent = await EventService.createEvent({
        plant_id: mockPlant.id,
        event_type: 'fertilize',
        date: fertilizeEvent.date,
        notes: fertilizeEvent.notes,
        fertilizer_concentration: '1/2',
      });

      expect(createdFertilizeEvent.plant_id).toBe(mockPlant.id);
      expect(createdFertilizeEvent.event_type).toBe('fertilize');
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'fertilized',
        expect.objectContaining({
          plant_id: mockPlant.id,
          event_type: 'fertilize',
        }),
        mockPlant.name
      );

      // Step 4: Verify events can be retrieved for the plant
      const mockEvents = [fertilizeEvent, waterEvent]; // Ordered by date desc
      mockSupabase.single.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
      });

      const plantEvents = await EventService.getEventsByPlantId(mockPlant.id);

      expect(plantEvents).toHaveLength(2);
      expect(plantEvents[0].event_type).toBe('fertilize');
      expect(plantEvents[1].event_type).toBe('water');
    });

    it('should handle plant updates and maintain event relationships', async () => {
      // Create initial plant
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(mockPlant);

      // Update plant location
      const updatedPlant = { ...mockPlant, location: 'New Room' };
      mockSupabase.single.mockResolvedValueOnce({
        data: updatedPlant,
        error: null,
      });

      const result = await PlantService.updatePlant(mockPlant.id, {
        location: 'New Room',
      });

      expect(result?.location).toBe('New Room');
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'updated plant',
        expect.objectContaining({
          plant_id: mockPlant.id,
          updated_fields: ['location'],
        }),
        mockPlant.name
      );

      // Verify events still work with updated plant
      const mockEvent: Event = {
        id: 'event-after-update',
        plant_id: mockPlant.id,
        event_type: 'water',
        date: '2024-01-17T10:00:00.000Z',
        household_id: 'household-123',
        created_at: '2024-01-17T10:00:00.000Z',
        updated_at: '2024-01-17T10:00:00.000Z',
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockEvent,
        error: null,
      });

      const eventAfterUpdate = await EventService.createEvent({
        plant_id: mockPlant.id,
        event_type: 'water',
        date: mockEvent.date,
      });

      expect(eventAfterUpdate.plant_id).toBe(mockPlant.id);
      expect(PlantService.getPlantById).toHaveBeenCalledWith(mockPlant.id);
    });

    it('should calculate correct event statistics', async () => {
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(mockPlant);

      // Mock count response
      mockSupabase.select.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue({ count: 3, error: null })
      });

      // Mock individual event queries
      const lastWatered: Event = {
        id: 'water-event',
        plant_id: mockPlant.id,
        event_type: 'water',
        date: '2024-01-17T10:00:00.000Z',
        household_id: 'household-123',
        created_at: '2024-01-17T10:00:00.000Z',
        updated_at: '2024-01-17T10:00:00.000Z',
      };

      const lastFertilized: Event = {
        id: 'fertilize-event',
        plant_id: mockPlant.id,
        event_type: 'fertilize',
        date: '2024-01-10T10:00:00.000Z',
        household_id: 'household-123',
        created_at: '2024-01-10T10:00:00.000Z',
        updated_at: '2024-01-10T10:00:00.000Z',
      };

      jest.spyOn(EventService, 'getLastEventByType')
        .mockResolvedValueOnce(lastWatered)
        .mockResolvedValueOnce(lastFertilized)
        .mockResolvedValueOnce(null);

      const stats = await EventService.getEventStats(mockPlant.id);

      expect(stats).toEqual({
        totalEvents: 3,
        lastWatered: lastWatered.date,
        lastFertilized: lastFertilized.date,
        lastRepotted: undefined,
      });

      expect(PlantService.getPlantById).toHaveBeenCalledWith(mockPlant.id);
      expect(EventService.getLastEventByType).toHaveBeenCalledWith(mockPlant.id, 'water');
      expect(EventService.getLastEventByType).toHaveBeenCalledWith(mockPlant.id, 'fertilize');
      expect(EventService.getLastEventByType).toHaveBeenCalledWith(mockPlant.id, 'repot');
    });

    it('should handle plant deletion and cascade effects', async () => {
      // Mock getting plant before deletion
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(mockPlant);
      
      // Mock successful deletion
      mockSupabase.delete.mockResolvedValue({ error: null });

      const result = await PlantService.deletePlant(mockPlant.id);

      expect(result).toBe(true);
      expect(PlantService.getPlantById).toHaveBeenCalledWith(mockPlant.id);
      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', mockPlant.id);
      
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'deleted plant',
        expect.objectContaining({
          plant_id: mockPlant.id,
          plant_type: mockPlant.type,
          location: mockPlant.location,
        }),
        mockPlant.name
      );
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle household session errors consistently across services', async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      // Test PlantService
      await expect(PlantService.getAllPlants()).rejects.toThrow('No household session found');
      await expect(PlantService.createPlant({ type: 'Test', location: 'Test' })).rejects.toThrow('No household session found');

      // Test EventService  
      await expect(EventService.getEventsByPlantId('plant-123')).rejects.toThrow('No household session found');
      await expect(EventService.createEvent({
        plant_id: 'plant-123',
        event_type: 'water',
        date: '2024-01-15T10:00:00.000Z',
      })).rejects.toThrow('No household session found');
    });

    it('should handle database errors consistently', async () => {
      const mockError = { message: 'Database connection failed' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(PlantService.getAllPlants()).rejects.toThrow('Failed to fetch plants: Database connection failed');
      await expect(EventService.getEventsByPlantId('plant-123')).rejects.toThrow('Failed to fetch events: Database connection failed');
    });
  });
});