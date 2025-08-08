import { DatabaseService } from '../../services/DatabaseService';

// Get the global mock client from jest.setup.js
declare global {
  var mockSupabaseClient: any;
}

const mockSupabase = global.mockSupabaseClient;

describe('DatabaseService', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset Supabase mock chain
    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.delete.mockReturnValue(mockSupabase);
    mockSupabase.neq.mockReturnValue(mockSupabase);
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  describe('testConnection', () => {
    it('should return true when connection is successful', async () => {
      mockSupabase.select.mockResolvedValue({ error: null });

      const result = await DatabaseService.testConnection();

      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.select).toHaveBeenCalledWith('count', { count: 'exact', head: true });
      expect(result).toBe(true);
    });

    it('should return false when connection fails', async () => {
      const mockError = { message: 'Connection failed' };
      mockSupabase.select.mockResolvedValue({ error: mockError });

      const result = await DatabaseService.testConnection();

      expect(result).toBe(false);
    });

    it('should return false when an exception occurs', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Network error'));

      const result = await DatabaseService.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status with counts when successful', async () => {
      const mockResponses = [
        { count: 5, error: null },
        { count: 12, error: null },
        { count: 8, error: null },
        { count: 3, error: null },
      ];

      // Mock Promise.all behavior
      mockSupabase.select
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3]);

      const result = await DatabaseService.getHealthStatus();

      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.from).toHaveBeenCalledWith('plant_photos');
      expect(mockSupabase.from).toHaveBeenCalledWith('plant_notes');
      
      expect(result).toEqual({
        connected: true,
        plantsCount: 5,
        eventsCount: 12,
        photosCount: 8,
        notesCount: 3,
      });
    });

    it('should return zero counts when database calls return null counts', async () => {
      const mockResponses = [
        { count: null, error: null },
        { count: null, error: null },
        { count: null, error: null },
        { count: null, error: null },
      ];

      mockSupabase.select
        .mockResolvedValueOnce(mockResponses[0])
        .mockResolvedValueOnce(mockResponses[1])
        .mockResolvedValueOnce(mockResponses[2])
        .mockResolvedValueOnce(mockResponses[3]);

      const result = await DatabaseService.getHealthStatus();

      expect(result).toEqual({
        connected: true,
        plantsCount: 0,
        eventsCount: 0,
        photosCount: 0,
        notesCount: 0,
      });
    });

    it('should return disconnected status when an error occurs', async () => {
      mockSupabase.select.mockRejectedValue(new Error('Database error'));

      const result = await DatabaseService.getHealthStatus();

      expect(result).toEqual({
        connected: false,
        plantsCount: 0,
        eventsCount: 0,
        photosCount: 0,
        notesCount: 0,
      });
    });
  });

  describe('resetDatabase', () => {
    it('should delete data from all tables in correct order', async () => {
      // Mock successful deletion for all tables
      mockSupabase.delete.mockResolvedValue({ error: null });

      await DatabaseService.resetDatabase();

      // Verify tables are deleted in correct order (respecting foreign key constraints)
      expect(mockSupabase.from).toHaveBeenCalledWith('plant_notes');
      expect(mockSupabase.from).toHaveBeenCalledWith('plant_photos');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockSupabase.from).toHaveBeenCalledWith('plants');
      
      // Verify delete operations
      expect(mockSupabase.delete).toHaveBeenCalledTimes(4);
      expect(mockSupabase.neq).toHaveBeenCalledWith('id', '');
    });

    it('should throw error when reset fails', async () => {
      const mockError = { message: 'Delete failed' };
      mockSupabase.delete.mockResolvedValue({ error: mockError });

      await expect(DatabaseService.resetDatabase()).rejects.toThrow('Failed to reset database:');
    });
  });

  describe('executeRawQuery', () => {
    it('should execute raw SQL query successfully', async () => {
      const mockData = { result: 'success' };
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      const result = await DatabaseService.executeRawQuery('SELECT * FROM plants', ['param1']);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('execute_sql', {
        sql_query: 'SELECT * FROM plants',
        query_params: ['param1']
      });
      expect(result).toEqual(mockData);
    });

    it('should execute raw SQL query without parameters', async () => {
      const mockData = { result: 'success' };
      mockSupabase.rpc.mockResolvedValue({ data: mockData, error: null });

      await DatabaseService.executeRawQuery('SELECT COUNT(*) FROM plants');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('execute_sql', {
        sql_query: 'SELECT COUNT(*) FROM plants',
        query_params: []
      });
    });

    it('should throw error when query execution fails', async () => {
      const mockError = { message: 'SQL error' };
      mockSupabase.rpc.mockResolvedValue({ data: null, error: mockError });

      await expect(DatabaseService.executeRawQuery('INVALID SQL')).rejects.toThrow('Query execution failed: SQL error');
    });

    it('should throw error when RPC call throws exception', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'));

      await expect(DatabaseService.executeRawQuery('SELECT * FROM plants')).rejects.toThrow('Network error');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authentication is successful', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null });

      const result = await DatabaseService.getCurrentUser();

      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should return null when authentication fails', async () => {
      const mockError = { message: 'Unauthorized' };
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: mockError });

      const result = await DatabaseService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when an exception occurs', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'));

      const result = await DatabaseService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user has active session', async () => {
      const mockSession = { user: { id: 'user-123' }, access_token: 'token' };
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const result = await DatabaseService.isAuthenticated();

      expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return false when no active session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

      const result = await DatabaseService.isAuthenticated();

      expect(result).toBe(false);
    });

    it('should return false when an error occurs', async () => {
      mockSupabase.auth.getSession.mockRejectedValue(new Error('Auth error'));

      const result = await DatabaseService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('onAuthStateChange', () => {
    it('should register auth state change listener', () => {
      const mockCallback = jest.fn();
      const mockUnsubscribe = jest.fn();
      
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      });

      const result = DatabaseService.onAuthStateChange(mockCallback);

      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalledWith(mockCallback);
      expect(result).toEqual({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      });
    });
  });

  describe('getSupabaseClient', () => {
    it('should return the Supabase client', () => {
      const client = DatabaseService.getSupabaseClient();

      expect(client).toBe(mockSupabase);
    });
  });
});