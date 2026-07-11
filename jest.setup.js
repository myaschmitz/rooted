// Simple setup for service layer testing

// Define React Native's __DEV__ global for the node test environment
global.__DEV__ = false;

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

// Create chainable mock for delete operations that supports multiple eq/neq calls
const createChainableMock = () => {
  const finalMock = {
    eq: jest.fn(() => Promise.resolve({ error: null })),
    neq: jest.fn(() => Promise.resolve({ error: null })),
  };
  
  const chainable = {
    neq: jest.fn(() => Promise.resolve({ error: null })),
    eq: jest.fn(() => finalMock), // Return final mock for the last call in chain
  };
  return chainable;
};

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
  delete: jest.fn(() => createChainableMock()), // Return chainable object with neq method
  eq: jest.fn(() => mockSupabaseClient),
  neq: jest.fn(() => mockSupabaseClient),
  or: jest.fn(() => mockSupabaseClient),
  order: jest.fn(() => mockSupabaseClient),
  limit: jest.fn(() => mockSupabaseClient),
  single: jest.fn(() => Promise.resolve({ data: null, error: null })),
  rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
};

// Make the query builder awaitable so a chain terminating on any builder
// method (e.g. .order() / .eq() / .limit()) resolves to _response. Tests set
// mockSupabaseClient._response to control list/delete query results.
mockSupabaseClient._response = { data: null, error: null };
mockSupabaseClient.then = (onFulfilled, onRejected) =>
  Promise.resolve(mockSupabaseClient._response).then(onFulfilled, onRejected);

jest.mock('./services/SupabaseService', () => ({
  supabase: mockSupabaseClient,
}));

// Mock UUID generator
jest.mock('react-native-uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-9abc'),
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    contains: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    getAllKeys: jest.fn(() => []),
  })),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  File: {
    size: jest.fn(() => Promise.resolve(1000)),
    exists: jest.fn(() => Promise.resolve(true)),
    copy: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  },
  Directory: {
    create: jest.fn(() => Promise.resolve()),
    exists: jest.fn(() => Promise.resolve(true)),
    delete: jest.fn(() => Promise.resolve()),
  },
  Paths: {
    cache: '/mock/cache/path',
    document: '/mock/document/path',
  },
}));

// Mock expo-image
jest.mock('expo-image', () => ({
  Image: jest.fn().mockImplementation(({ source, style, ...props }) => null),
}));

// Mock CacheService
jest.mock('./services/CacheService', () => ({
  CacheService: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidateCachePattern: jest.fn(),
    getMemoryStats: jest.fn(() => ({ used: 0, total: 1000 })),
    getCachedResponse: jest.fn(() => Promise.resolve(null)), // Add missing method
    setCachedResponse: jest.fn(() => Promise.resolve()),
    cacheApiResponse: jest.fn(() => Promise.resolve()),
    invalidateCache: jest.fn(() => Promise.resolve()),
  }
}));

// Mock CacheInvalidationService  
jest.mock('./services/CacheInvalidationService', () => ({
  CacheInvalidationService: {
    invalidate: jest.fn(),
    batchInvalidate: jest.fn(),
    invalidateOnUserAction: jest.fn(() => Promise.resolve()),
  }
}));

// Mock Date for consistent testing
const mockDate = new Date('2024-01-15T10:00:00.000Z');
jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
Date.now = jest.fn(() => mockDate.getTime());

// Global test timeout
jest.setTimeout(10000);

// Export the mock client for use in tests
global.mockSupabaseClient = mockSupabaseClient;