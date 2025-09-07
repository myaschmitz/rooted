import { ReminderService } from '../../services/ReminderService';
import { HouseholdService } from '../../services/HouseholdService';
import { Reminder } from '../../types/Reminder';

jest.mock('../../services/HouseholdService');
jest.mock('../../services/NotificationService');

declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

describe('ReminderService', () => {
  const mockSession = {
    household_id: 'household-123',
    user_id: 'user-123',
  };

  const mockReminder: Reminder = {
    id: 'reminder-123',
    plant_id: 'plant-123',
    title: 'Water reminder',
    description: 'Time to water your plant!',
    date: '2024-02-01',
    time: '09:00',
    recurrence_type: 'daily',
    is_active: true,
    household_id: 'household-123',
    created_at: '2024-01-15T10:00:00.000Z',
    updated_at: '2024-01-15T10:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(mockSession);
    (HouseholdService.logActivity as jest.Mock).mockResolvedValue(undefined);
    
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.insert.mockReturnValue(mockSupabase);
    mockSupabase.update.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.single.mockReturnValue(mockSupabase);
  });

  describe('getRemindersByPlantId', () => {
    it('should fetch reminders for a specific plant', async () => {
      mockSupabase.eq.mockResolvedValue({ data: [mockReminder], error: null });

      const result = await ReminderService.getRemindersByPlantId('plant-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('reminders');
      expect(mockSupabase.eq).toHaveBeenCalledWith('plant_id', 'plant-123');
      expect(mockSupabase.eq).toHaveBeenCalledWith('household_id', 'household-123');
      expect(result).toEqual([mockReminder]);
    });

    it('should throw error when no household session', async () => {
      (HouseholdService.getUserSession as jest.Mock).mockResolvedValue(null);

      await expect(ReminderService.getRemindersByPlantId('plant-123'))
        .rejects.toThrow('No household session found');
    });
  });

  describe('createReminder', () => {
    it('should create a new reminder', async () => {
      const reminderData = {
        plant_id: 'plant-123',
        title: 'Water reminder',
        description: 'Time to water your plant!',
        date: '2024-02-01',
        time: '09:00',
        recurrence_type: 'daily' as const,
        is_active: true,
      };

      mockSupabase.single.mockResolvedValue({ data: mockReminder, error: null });

      const result = await ReminderService.createReminder(reminderData);

      expect(mockSupabase.from).toHaveBeenCalledWith('reminders');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        ...reminderData,
        household_id: 'household-123',
      });
      expect(result).toEqual(mockReminder);
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder', async () => {
      mockSupabase.single.mockResolvedValue({ data: mockReminder, error: null });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const result = await ReminderService.deleteReminder('reminder-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('reminders');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'reminder-123');
      expect(result).toBe(true);
    });
  });
});