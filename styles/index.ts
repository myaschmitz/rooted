// Main exports for the design system
export * from './theme';
export * from './GlobalStyles';
export * from './CareStyles';

// Theme system exports
export { useTheme, ThemeProvider, type Theme, type ThemeMode } from '../contexts/ThemeContext';

// Theme-aware utilities
import { useTheme } from '../contexts/ThemeContext';
import { getThemeColors, BaseColors, Typography, Spacing, BorderRadius, Shadows, Layout } from './theme';

/**
 * Hook to get theme-aware colors
 * This provides backwards compatibility with the existing Colors import
 */
export const useColors = () => {
  const { isDark } = useTheme();
  return getThemeColors(isDark);
};

/**
 * Backwards compatibility export that acts like the old Colors object
 * but is theme-independent for status and health colors
 */
export const Colors = {
  // Health status colors (theme-independent)
  healthExcellent: BaseColors.healthExcellent,
  healthGood: BaseColors.healthGood,
  healthOkay: BaseColors.healthOkay,
  healthPoor: BaseColors.healthPoor,
  healthConcerning: BaseColors.healthConcerning,
  healthCritical: BaseColors.healthCritical,
  
  // Severity colors (theme-independent)
  severityLow: BaseColors.severityLow,
  severityMedium: BaseColors.severityMedium,
  severityHigh: BaseColors.severityHigh,
  
  // Primary colors
  primary: BaseColors.primary,
  primaryLight: BaseColors.primaryLight,
  primaryDark: BaseColors.primaryDark,
  
  // Status colors
  success: BaseColors.success,
  warning: BaseColors.warning,
  error: BaseColors.error,
  errorDark: BaseColors.errorDark,
  info: BaseColors.info,
  
  // Basic colors
  white: BaseColors.white,
  black: BaseColors.black,
  
  // Legacy exports for backwards compatibility
  // Components should use useColors() hook for theme-aware colors
  background: '#f5f5f5',
  surface: '#FFFFFF',
  textPrimary: '#333',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#ddd',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// Re-export theme constants
export { 
  Typography, 
  Spacing, 
  BorderRadius, 
  Shadows, 
  Layout,
  BaseColors,
  getThemeColors
} from './theme';

export { 
  GlobalStyles, 
  ButtonStyles, 
  InputStyles, 
  TextStyles, 
  CommonStyles,
  useGlobalStyles
} from './GlobalStyles';

export { CareStyles } from './CareStyles';
