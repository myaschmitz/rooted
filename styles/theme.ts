// Design system constants - theme-independent colors
export const BaseColors = {
  // Primary colors
  primary: '#4CAF50',
  primaryLight: '#66BB6A',
  primaryDark: '#2E7D32',
  
  // Status colors
  success: '#4CAF50',
  successDark: '#66BB6A',
  warning: '#FF9800',
  warningDark: '#FFB74D',
  error: '#F44336',
  errorDark: '#EF5350',
  errorCritical: '#B71C1C',
  info: '#2196F3',
  
  // Health status colors (consistent across themes)
  healthExcellent: '#2E7D32',
  healthGood: '#4CAF50',
  healthOkay: '#FF9800',
  healthPoor: '#FF5722',
  healthConcerning: '#F44336',
  healthCritical: '#B71C1C',
  
  // Severity colors (consistent across themes)
  severityLow: '#4CAF50',
  severityMedium: '#FF9800',
  severityHigh: '#F44336',
  
  // Absolute colors
  white: '#FFFFFF',
  black: '#000000',
  
  // Gray scale for light theme
  lightGray: {
    50: '#f9f9f9',
    100: '#f5f5f5',
    200: '#eee',
    300: '#ddd',
    400: '#ccc',
    500: '#999',
    600: '#666',
    700: '#555',
    800: '#333',
    900: '#111',
  },
  
  // Gray scale for dark theme
  darkGray: {
    50: '#2a2a2a',
    100: '#333333',
    200: '#404040',
    300: '#525252',
    400: '#666666',
    500: '#888888',
    600: '#b3b3b3',
    700: '#cccccc',
    800: '#e5e5e5',
    900: '#f5f5f5',
  },
} as const;

// Theme-aware color functions
export const getThemeColors = (isDark: boolean) => ({
  // Primary colors
  primary: isDark ? BaseColors.primaryLight : BaseColors.primary,
  primaryDark: BaseColors.primaryDark,
  
  // Status colors
  success: isDark ? BaseColors.successDark : BaseColors.success,
  warning: isDark ? BaseColors.warningDark : BaseColors.warning,
  error: isDark ? BaseColors.errorDark : BaseColors.error,
  info: BaseColors.info,
  
  // Background colors
  background: isDark ? '#121212' : '#f5f5f5',
  surface: isDark ? '#1e1e1e' : '#FFFFFF',
  surfaceSecondary: isDark ? '#2a2a2a' : '#f8f8f8',
  surfaceVariant: isDark ? '#333333' : '#f0f0f0',
  
  // Text colors
  text: isDark ? '#ffffff' : '#333333',
  textSecondary: isDark ? '#b3b3b3' : '#666666',
  textTertiary: isDark ? '#888888' : '#999999',
  textInverse: isDark ? '#000000' : '#ffffff',
  
  // Border colors
  border: isDark ? '#333333' : '#dddddd',
  borderLight: isDark ? '#2a2a2a' : '#eeeeee',
  borderFocus: isDark ? BaseColors.primaryLight : BaseColors.primary,
  
  // Special colors
  overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
  modalBackground: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)',
  shadow: isDark ? '#000000' : '#000000',
});

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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
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
