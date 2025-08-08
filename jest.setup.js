// Simple setup for service layer testing

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  neq: jest.fn(() => mockSupabaseClient),
  or: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),
  rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
};

jest.mock('./services/SupabaseService', () => ({
  supabase: mockSupabaseClient,
}));

// Mock UUID generator
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9abc'),
}));

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
Date.now = jest.fn(() => mockDate.getTime());

// Global test timeout
jest.setTimeout(10000);

// Export the mock client for use in tests
global.mockSupabaseClient = mockSupabaseClient;