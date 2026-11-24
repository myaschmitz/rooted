import { Plant, Event } from '../../types/Plant';

export const createMockPlant = (overrides: Partial<Plant> = {}): Plant => ({
  id: 'test-plant-123',
  name: 'Test Plant',
  type: 'Test Type',
  location: 'Test Location',
  household_id: 'household-123',
  pinned: false,
  archived: false,
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

export const createMockEvent = (overrides: Partial<Event> = {}): Event => ({
  id: 'test-event-123',
  plant_id: 'test-plant-123',
  event_type: 'water',
  date: '2024-01-15T10:00:00.000Z',
  household_id: 'household-123',
  created_at: '2024-01-15T10:00:00.000Z',
  updated_at: '2024-01-15T10:00:00.000Z',
  ...overrides,
});

export const mockSession = {
  household_id: 'household-123',
  user_id: 'user-123',
};

export const waitForAsync = (): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, 0));
/**
 * jest.mock('../../services/HouseholdService') auto-mocks every method to
 * return undefined. Point requireHouseholdId at the getUserSession mock so
 * tests that stub the session keep driving the household id.
 */
export const mockRequireHouseholdId = (HouseholdService: {
  getUserSession: (...args: any[]) => any;
  requireHouseholdId: (...args: any[]) => any;
}) => {
  (HouseholdService.requireHouseholdId as jest.Mock).mockImplementation(
    async () => {
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }
      return session.household_id;
    },
  );
};
