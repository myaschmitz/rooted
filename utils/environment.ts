export type Environment = 'development' | 'production' | 'test';

export const getCurrentEnvironment = (): Environment => {
  if (__DEV__) return 'development';
  return (process.env.EXPO_PUBLIC_ENVIRONMENT as Environment) || 'production';
};

export const isDevelopment = getCurrentEnvironment() === 'development';
export const isProduction = getCurrentEnvironment() === 'production';

export const config = {
  environment: getCurrentEnvironment(),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
} as const;

// Type guard for environment
export const assertEnvironment = (env: Environment): boolean => {
  return getCurrentEnvironment() === env;
};