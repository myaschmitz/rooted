import { EventService } from '../../services/EventService';
import { PlantService } from '../../services/PlantService';
import { HouseholdService } from '../../services/HouseholdService';
import { Event, Plant } from '../../types/Plant';

// Mock the dependencies
jest.mock('../../services/PlantService');
jest.mock('../../services/HouseholdService');

// Get the global mock client from jest.setup.js
declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

describe('EventService', () => {
  const mockSession = {
    household_id: 'household-123',
    user_id: 'user-123',
  };

  const mockPlant: Plant = {
    id: 'plant-123',
    name: 'My Monstera',
    type: 'Monstera Deliciosa',
    location: 'Living Room',
    household_id: 'household-123',
    pinned: false,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  const mockEvent: Event = {
    id: 'event-123',
    plant_id: 'plant-123',
    event_type: 'water',
    date: '2024-01-15T10:00:00.000Z',
    notes: 'Good watering',
    household_id: 'household-123',
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock HouseholdService to return a valid session
    (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(mockSession);
    
    // Mock PlantService.getPlantById to return a valid plant
    (PlantService.getPlantById as jest.Mock).mockResolvedValue(mockPlant);
    
    
    // Mock HouseholdService.logActivity
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

  describe('getEventsByPlantId', () => {
    it('should fetch events for a plant', async () => {
      const mockEvents = [mockEvent, { ...mockEvent, id: 'event-456', event_type: 'fertilize' as const }];
      mockSupabase.single.mockResolvedValue({ data: mockEvents, error: null });

      const result = await EventService.getEventsByPlantId('plant-123');

      expect(HouseholdService.getUserSession).toHaveBeenCalled();
      expect(PlantService.getPlantById).toHaveBeenCalledWith('plant-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('plant_id', 'plant-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(result).toEqual(mockEvents);
    });

    it('should throw error when no household session found', async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      await expect(EventService.getEventsByPlantId('plant-123')).rejects.toThrow('No household session found');
    });

    it('should throw error when plant not found', async () => {
      (PlantService.getPlantById as jest.Mock).mockResolvedValue(null);

      await expect(EventService.getEventsByPlantId('plant-123')).rejects.toThrow('Plant not found or not accessible');
    });

    it('should throw error when Supabase returns an error', async () => {
      const mockError = { message: 'Database error' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(EventService.getEventsByPlantId('plant-123')).rejects.toThrow('Failed to fetch events: Database error');
    });
  });

  describe('createEvent', () => {
    const newEventData = {
      plant_id: 'plant-123',
      event_type: 'water' as const,
      date: '2024-01-15T10:00:00.000Z',
      notes: 'Regular watering',
    };

    it('should create a new event successfully', async () => {
      const createdEvent = { ...mockEvent, ...newEventData };
      mockSupabase.single.mockResolvedValue({ data: createdEvent, error: null });

      const result = await EventService.createEvent(newEventData);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...newEventData,
        household_id: 'household-123',
      });
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
      
      expect(PlantService.getPlantById).toHaveBeenCalledWith(createdEvent.plant_id);
      
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'watered',
        expect.objectContaining({
          plant_id: createdEvent.plant_id,
          event_type: createdEvent.event_type,
          notes: createdEvent.notes,
        }),
        mockPlant.name
      );
      
      
      expect(result).toEqual(createdEvent);
    });

    it('should map different event types to correct activity names', async () => {
      const testCases = [
        { event_type: 'fertilize' as const, expected: 'fertilized' },
        { event_type: 'fertigate' as const, expected: 'fertigated' },
        { event_type: 'repot' as const, expected: 'repotted' },
        { event_type: 'prune' as const, expected: 'pruned' },
        { event_type: 'pest_spotted' as const, expected: 'pest spotted' },
        { event_type: 'insecticide_spray' as const, expected: 'insecticide spray' },
        { event_type: 'other' as const, expected: 'other care' },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();
        (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(mockSession);
        (PlantService.getPlantById as jest.Mock).mockResolvedValue(mockPlant);
        
        const eventData = { ...newEventData, event_type: testCase.event_type };
        const createdEvent = { ...mockEvent, ...eventData };
        mockSupabase.single.mockResolvedValue({ data: createdEvent, error: null });

        await EventService.createEvent(eventData);

        expect(HouseholdService.logActivity).toHaveBeenCalledWith(
          testCase.expected,
          expect.anything(),
          expect.anything()
        );
      }
    });

    it('should use plant type when plant name is not available', async () => {
      const plantWithoutName = { ...mockPlant, name: undefined };
      (PlantService.getPlantById as jest.Mock).mockResolvedValue(plantWithoutName);
      
      const createdEvent = { ...mockEvent, ...newEventData };
      mockSupabase.single.mockResolvedValue({ data: createdEvent, error: null });

      await EventService.createEvent(newEventData);

      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'watered',
        expect.anything(),
        plantWithoutName.type
      );
    });

    it('should throw error when creation fails', async () => {
      const mockError = { message: 'Insert failed' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(EventService.createEvent(newEventData)).rejects.toThrow('Failed to create event: Insert failed');
    });

    it('should throw error when no household session', async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      await expect(EventService.createEvent(newEventData)).rejects.toThrow('No household session found');
    });
  });

  describe('updateEvent', () => {
    const updateData = { notes: 'Updated notes', event_type: 'fertilize' as const };

    it('should update an event successfully', async () => {
      const updatedEvent = { ...mockEvent, ...updateData };
      mockSupabase.single.mockResolvedValue({ data: updatedEvent, error: null });

      const result = await EventService.updateEvent('event-123', updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateData,
          updated_at: expect.any(String),
        })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      
      
      expect(result).toEqual(updatedEvent);
    });

    it('should return null when event not found', async () => {
      const mockError = { code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await EventService.updateEvent('nonexistent-event', updateData);
      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      const mockError = { message: 'Update failed', code: 'OTHER' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(EventService.updateEvent('event-123', updateData)).rejects.toThrow('Failed to update event: Update failed');
    });
  });

  describe('getEventById', () => {
    it('should fetch an event by ID', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockEvent, error: null });

      const result = await EventService.getEventById('event-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(result).toEqual(mockEvent);
    });

    it('should return null when event not found', async () => {
      const mockError = { code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await EventService.getEventById('nonexistent-event');
      expect(result).toBeNull();
    });
  });

  describe('deleteEvent', () => {
    it('should delete an event successfully', async () => {
      jest.spyOn(EventService, 'getEventById').mockResolvedValue(mockEvent);
      mockSupabase.delete.mockResolvedValue({ error: null });

      const result = await EventService.deleteEvent('event-123');

      expect(EventService.getEventById).toHaveBeenCalledWith('event-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      
      
      expect(result).toBe(true);
    });

    it('should return false when event not found', async () => {
      jest.spyOn(EventService, 'getEventById').mockResolvedValue(null);

      const result = await EventService.deleteEvent('nonexistent-event');
      expect(result).toBe(false);
    });

    it('should throw error when deletion fails', async () => {
      jest.spyOn(EventService, 'getEventById').mockResolvedValue(mockEvent);
      const mockError = { message: 'Delete failed' };
      mockSupabase.delete.mockResolvedValue({ error: mockError });

      await expect(EventService.deleteEvent('event-123')).rejects.toThrow('Failed to delete event: Delete failed');
    });
  });

  describe('getRecentEvents', () => {
    it('should fetch recent events with default limit', async () => {
      const recentEvents = [mockEvent];
      mockSupabase.single.mockResolvedValue({ data: recentEvents, error: null });

      const result = await EventService.getRecentEvents();

      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual(recentEvents);
    });

    it('should fetch recent events with custom limit', async () => {
      const recentEvents = [mockEvent];
      mockSupabase.single.mockResolvedValue({ data: recentEvents, error: null });

      await EventService.getRecentEvents(5);

      expect(mockSupabase.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getLastEventByType', () => {
    it('should fetch the last event of a specific type', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockEvent, error: null });

      const result = await EventService.getLastEventByType('plant-123', 'water');

      expect(PlantService.getPlantById).toHaveBeenCalledWith('plant-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('plant_id', 'plant-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('event_type', 'water');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('date', { ascending: false });
      expect(mockSupabase.limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockEvent);
    });

    it('should return null when no events found', async () => {
      const mockError = { code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await EventService.getLastEventByType('plant-123', 'water');
      expect(result).toBeNull();
    });
  });

  describe('getEventStats', () => {
    it('should calculate event statistics for a plant', async () => {
      // Mock count query
      const mockCountResponse = { count: 5, error: null };
      mockSupabase.select.mockReturnValueOnce({
        ...mockSupabase,
        single: jest.fn().mockResolvedValue(mockCountResponse)
      });

      // Mock individual event queries
      const lastWatered = { ...mockEvent, event_type: 'water' as const, date: '2024-01-10T10:00:00.000Z' };
      const lastFertilized = { ...mockEvent, event_type: 'fertilize' as const, date: '2024-01-05T10:00:00.000Z' };
      const lastRepotted = null;

      jest.spyOn(EventService, 'getLastEventByType')
        .mockResolvedValueOnce(lastWatered)
        .mockResolvedValueOnce(lastFertilized)
        .mockResolvedValueOnce(lastRepotted);

      const result = await EventService.getEventStats('plant-123');

      expect(PlantService.getPlantById).toHaveBeenCalledWith('plant-123');
      expect(EventService.getLastEventByType).toHaveBeenCalledWith('plant-123', 'water');
      expect(EventService.getLastEventByType).toHaveBeenCalledWith('plant-123', 'fertilize');
      expect(EventService.getLastEventByType).toHaveBeenCalledWith('plant-123', 'repot');
      
      expect(result).toEqual({
        totalEvents: 5,
        lastWatered: lastWatered.date,
        lastFertilized: lastFertilized.date,
        lastRepotted: undefined,
      });
    });

    it('should throw error when plant not found', async () => {
      (PlantService.getPlantById as jest.Mock).mockResolvedValue(null);

      await expect(EventService.getEventStats('nonexistent-plant')).rejects.toThrow('Plant not found or not accessible');
    });
  });
});