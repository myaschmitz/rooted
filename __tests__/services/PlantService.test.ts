import { PlantService } from '../../services/PlantService';
import { HouseholdService } from '../../services/HouseholdService';
import { CacheInvalidationService } from '../../services/CacheInvalidationService';
import { Plant } from '../../types/Plant';

// Mock the dependencies
jest.mock('../../services/HouseholdService');
jest.mock('../../services/CacheInvalidationService');

// Get the global mock client from jest.setup.js
declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

describe('PlantService', () => {
  const mockSession = {
    household_id: 'household-123',
    user_id: 'user-123',
  };

  const mockPlant: Plant = {
    id: 'plant-123',
    name: 'My Monstera',
    type: 'Monstera Deliciosa',
    location: 'Living Room',
    notes: 'Growing well',
    household_id: 'household-123',
    pinned: false,
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock HouseholdService to return a valid session
    (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(mockSession);
    
    // Mock CacheInvalidationService
    (CacheInvalidationService.invalidateOnUserAction as jest.Mock).mockResolvedValue(undefined);
    
    // Mock HouseholdService.logActivity
    (HouseholdService.logActivity as jest.Mock).mockResolvedValue(undefined);
    
    // Reset Supabase mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.neq.mockReturnValue(mockSupabase);
    mockSupabase.or.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.limit.mockReturnValue(mockSupabase);
  });

  describe('getAllPlants', () => {
    it('should fetch all plants for the current household', async () => {
      const mockPlants = [mockPlant, { ...mockPlant, id: 'plant-456', name: 'Snake Plant' }];
      
      mockSupabase.single.mockResolvedValue({ data: mockPlants, error: null });

      const result = await PlantService.getAllPlants();

      expect(HouseholdService.getUserSession).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(mockSupabase.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(mockPlants);
    });

    it('should throw error when no household session found', async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      await expect(PlantService.getAllPlants()).rejects.toThrow('No household session found');
    });

    it('should throw error when Supabase returns an error', async () => {
      const mockError = { message: 'Database error' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(PlantService.getAllPlants()).rejects.toThrow('Failed to fetch plants: Database error');
    });

    it('should return empty array when no plants found', async () => {
      mockSupabase.single.mockResolvedValue({ data: [], error: null });

      const result = await PlantService.getAllPlants();
      expect(result).toEqual([]);
    });
  });

  describe('getPlantById', () => {
    it('should fetch a plant by ID for the current household', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockPlant, error: null });

      const result = await PlantService.getPlantById('plant-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'plant-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(mockSupabase.single).toHaveBeenCalled();
      expect(result).toEqual(mockPlant);
    });

    it('should return null when plant not found', async () => {
      const mockError = { code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await PlantService.getPlantById('nonexistent-plant');
      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      const mockError = { message: 'Database error', code: 'OTHER' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(PlantService.getPlantById('plant-123')).rejects.toThrow('Failed to fetch plant: Database error');
    });
  });

  describe('createPlant', () => {
    const newPlantData = {
      name: 'New Plant',
      type: 'Fiddle Leaf Fig',
      location: 'Bedroom',
      notes: 'Just purchased',
    };

    it('should create a new plant successfully', async () => {
      const createdPlant = { ...mockPlant, ...newPlantData };
      mockSupabase.single.mockResolvedValue({ data: createdPlant, error: null });

      const result = await PlantService.createPlant(newPlantData);

      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...newPlantData,
        household_id: 'household-123',
      });
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
      
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'added plant',
        expect.objectContaining({
          plant_id: createdPlant.id,
          plant_type: createdPlant.type,
          location: createdPlant.location,
        }),
        createdPlant.name
      );
      
      expect(CacheInvalidationService.invalidateOnUserAction).toHaveBeenCalledWith(
        'plant_added',
        expect.objectContaining({
          entityId: createdPlant.id,
          additionalData: { location: createdPlant.location }
        })
      );
      
      expect(result).toEqual(createdPlant);
    });

    it('should create plant without name', async () => {
      const plantWithoutName = { type: 'Spider Plant', location: 'Kitchen' };
      const createdPlant = { ...mockPlant, ...plantWithoutName, name: undefined };
      mockSupabase.single.mockResolvedValue({ data: createdPlant, error: null });

      const result = await PlantService.createPlant(plantWithoutName);

      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'added plant',
        expect.anything(),
        createdPlant.type // Should use type as fallback when name is undefined
      );
      expect(result).toEqual(createdPlant);
    });

    it('should throw error when creation fails', async () => {
      const mockError = { message: 'Insert failed' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(PlantService.createPlant(newPlantData)).rejects.toThrow('Failed to create plant: Insert failed');
    });

    it('should throw error when no household session', async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      await expect(PlantService.createPlant(newPlantData)).rejects.toThrow('No household session found');
    });
  });

  describe('updatePlant', () => {
    const updateData = { name: 'Updated Plant Name', location: 'New Location' };

    it('should update a plant successfully', async () => {
      const updatedPlant = { ...mockPlant, ...updateData };
      mockSupabase.single.mockResolvedValue({ data: updatedPlant, error: null });

      const result = await PlantService.updatePlant('plant-123', updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          ...updateData,
          updated_at: expect.any(String),
        })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'plant-123');
      
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'updated plant',
        expect.objectContaining({
          plant_id: updatedPlant.id,
          updated_fields: Object.keys(updateData),
        }),
        updatedPlant.name
      );
      
      expect(result).toEqual(updatedPlant);
    });

    it('should not log activity for pin/unpin operations only', async () => {
      const pinData = { pinned: true };
      const updatedPlant = { ...mockPlant, ...pinData };
      mockSupabase.single.mockResolvedValue({ data: updatedPlant, error: null });

      await PlantService.updatePlant('plant-123', pinData);

      expect(HouseholdService.logActivity).not.toHaveBeenCalled();
    });

    it('should return null when plant not found', async () => {
      const mockError = { code: 'PGRST116' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      const result = await PlantService.updatePlant('nonexistent-plant', updateData);
      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      const mockError = { message: 'Update failed', code: 'OTHER' };
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError });

      await expect(PlantService.updatePlant('plant-123', updateData)).rejects.toThrow('Failed to update plant: Update failed');
    });
  });

  describe('deletePlant', () => {
    it('should delete a plant successfully', async () => {
      // Mock getPlantById to return the plant
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(mockPlant);
      mockSupabase.delete.mockResolvedValue({ error: null });

      const result = await PlantService.deletePlant('plant-123');

      expect(PlantService.getPlantById).toHaveBeenCalledWith('plant-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'plant-123');
      
      expect(HouseholdService.logActivity).toHaveBeenCalledWith(
        'deleted plant',
        expect.objectContaining({
          plant_id: mockPlant.id,
          plant_type: mockPlant.type,
          location: mockPlant.location,
        }),
        mockPlant.name
      );
      
      expect(result).toBe(true);
    });

    it('should throw error when deletion fails', async () => {
      const mockError = { message: 'Delete failed' };
      mockSupabase.delete.mockResolvedValue({ error: mockError });

      await expect(PlantService.deletePlant('plant-123')).rejects.toThrow('Failed to delete plant: Delete failed');
    });
  });

  describe('searchPlants', () => {
    it('should search plants by query', async () => {
      const searchResults = [mockPlant];
      mockSupabase.single.mockResolvedValue({ data: searchResults, error: null });

      const result = await PlantService.searchPlants('monstera');

      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(mockSupabase.or).toHaveBeenCalledWith('name.ilike.%monstera%,type.ilike.%monstera%,location.ilike.%monstera%');
      expect(result).toEqual(searchResults);
    });

    it('should handle case-insensitive search', async () => {
      const searchResults = [mockPlant];
      mockSupabase.single.mockResolvedValue({ data: searchResults, error: null });

      await PlantService.searchPlants('MONSTERA');

      expect(mockSupabase.or).toHaveBeenCalledWith('name.ilike.%monstera%,type.ilike.%monstera%,location.ilike.%monstera%');
    });
  });

  describe('pin/unpin operations', () => {
    it('should pin a plant', async () => {
      const pinnedPlant = { ...mockPlant, pinned: true };
      jest.spyOn(PlantService, 'updatePlant').mockResolvedValue(pinnedPlant);

      const result = await PlantService.pinPlant('plant-123');

      expect(PlantService.updatePlant).toHaveBeenCalledWith('plant-123', { pinned: true });
      expect(result).toEqual(pinnedPlant);
    });

    it('should unpin a plant', async () => {
      const unpinnedPlant = { ...mockPlant, pinned: false };
      jest.spyOn(PlantService, 'updatePlant').mockResolvedValue(unpinnedPlant);

      const result = await PlantService.unpinPlant('plant-123');

      expect(PlantService.updatePlant).toHaveBeenCalledWith('plant-123', { pinned: false });
      expect(result).toEqual(unpinnedPlant);
    });

    it('should toggle pin status', async () => {
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(mockPlant);
      const toggledPlant = { ...mockPlant, pinned: true };
      jest.spyOn(PlantService, 'updatePlant').mockResolvedValue(toggledPlant);

      const result = await PlantService.togglePinPlant('plant-123');

      expect(PlantService.getPlantById).toHaveBeenCalledWith('plant-123');
      expect(PlantService.updatePlant).toHaveBeenCalledWith('plant-123', { pinned: true });
      expect(result).toEqual(toggledPlant);
    });

    it('should return null when toggling pin for nonexistent plant', async () => {
      jest.spyOn(PlantService, 'getPlantById').mockResolvedValue(null);

      const result = await PlantService.togglePinPlant('nonexistent-plant');

      expect(result).toBeNull();
    });
  });
});