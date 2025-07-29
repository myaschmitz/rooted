export type Environment = 'development' | 'production' | 'test';

export const getCurrentEnvironment = (): Environment => {
  if (__DEV__) return 'development';
  return (process.env.EXPO_PUBLIC_ENVIRONMENT as Environment) || 'production';
};

export const config = {
  environment: getCurrentEnvironment(),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
} as const;