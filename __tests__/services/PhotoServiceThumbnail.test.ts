import { PhotoService } from '../../services/PhotoService.web';
import { HouseholdService } from '../../services/HouseholdService';
import { PlantService } from '../../services/PlantService';
import { CacheInvalidationService } from '../../services/CacheInvalidationService';

jest.mock('expo-image-picker', () => ({}));
jest.mock('../../services/PhotoProcessingService', () => ({
  PhotoProcessingService: {},
}));
jest.mock('../../services/HouseholdService');
jest.mock('../../services/PlantService');
jest.mock('../../services/CacheInvalidationService');

declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

describe('PhotoService thumbnail mutations', () => {
  const mockSession = { household_id: 'household-123', user_id: 'user-123' };

  beforeEach(() => {
    jest.clearAllMocks();

    (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(
      mockSession,
    );
    (PlantService.getPlantById as jest.Mock).mockResolvedValue({
      id: 'plant-123',
      household_id: 'household-123',
    });
    (
      CacheInvalidationService.invalidateOnUserAction as jest.Mock
    ).mockResolvedValue(undefined);

    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.single.mockResolvedValue({
      data: { id: 'photo-456', plant_id: 'plant-123' },
      error: null,
    });
    mockSupabase._response = { data: null, error: null };
  });

  it('invalidates thumbnail caches after setting a thumbnail', async () => {
    await PhotoService.setThumbnailPhoto('plant-123', 'photo-456');

    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnail_photo_id: 'photo-456' }),
    );
    expect(
      CacheInvalidationService.invalidateOnUserAction,
    ).toHaveBeenCalledWith('thumbnail_changed', {
      entityId: 'plant-123',
      immediate: true,
    });
  });

  it('invalidates thumbnail caches after clearing a thumbnail', async () => {
    await PhotoService.clearThumbnailPhoto('plant-123');

    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ thumbnail_photo_id: null }),
    );
    expect(
      CacheInvalidationService.invalidateOnUserAction,
    ).toHaveBeenCalledWith('thumbnail_changed', {
      entityId: 'plant-123',
      immediate: true,
    });
  });

  it('does not invalidate when the update fails', async () => {
    mockSupabase._response = { data: null, error: { message: 'boom' } };

    await expect(
      PhotoService.setThumbnailPhoto('plant-123', 'photo-456'),
    ).rejects.toBeDefined();

    expect(mockSupabase.update).toHaveBeenCalled();
    expect(
      CacheInvalidationService.invalidateOnUserAction,
    ).not.toHaveBeenCalled();
  });
});
