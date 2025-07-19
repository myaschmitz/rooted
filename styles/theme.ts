// Design system constants
export const Colors = {
  // Primary colors
  primary: '#4CAF50',
  primaryLight: '#f8fff8',
  primaryDark: '#2E7D32',
  
  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  errorDark: '#B71C1C',
  info: '#2196F3',
  
  // Health status colors
  healthExcellent: '#2E7D32',
  healthGood: '#4CAF50',
  healthOkay: '#FF9800',
  healthPoor: '#FF5722',
  healthConcerning: '#F44336',
  healthCritical: '#B71C1C',
  
  // Severity colors
  severityLow: '#4CAF50',
  severityMedium: '#FF9800',
  severityHigh: '#F44336',
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale
  gray50: '#f9f9f9',
  gray100: '#f5f5f5',
  gray200: '#eee',
  gray300: '#ddd',
  gray400: '#ccc',
  gray500: '#999',
  gray600: '#666',
  gray700: '#555',
  gray800: '#333',
  gray900: '#111',
  
  // Background colors
  background: '#f5f5f5',
  surface: '#FFFFFF',
  surfaceVariant: '#f8f8f8',
  
  // Text colors
  textPrimary: '#333',
  textSecondary: '#666',
  textTertiary: '#999',
  textInverse: '#FFFFFF',
  
  // Border colors
  border: '#ddd',
  borderLight: '#eee',
  borderFocus: '#4CAF50',
  
  // Special colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: '#000',
} as const;

export const Typography = {
  // Font sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  
  // Font weights
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: 'bold' as const,
  },
} as const;

export const Spacing = {
  // Base spacing unit (4px)
  unit: 4,
  
  // Common spacing values
  xs: 4,
  sm: 8,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const BorderRadius = {
  none: 0,
  sm: 4,
  base: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 16,
  '3xl': 20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  lg: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  xl: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
} as const;

export const Layout = {
  // Common layout values
  headerHeight: 60,
  tabBarHeight: 80,
  fabSize: 56,
  buttonHeight: 48,
  inputHeight: 48,
  
  // Container widths
  containerPadding: Spacing.base,
  sectionMargin: Spacing.lg,
} as const;
