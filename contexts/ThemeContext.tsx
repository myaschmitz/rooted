import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  colors: {
    // Background colors
    background: string;
    surface: string;
    surfaceSecondary: string;
    
    // Text colors
    text: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    textOnPrimary: string; // Text color to use on primary backgrounds
    
    // UI colors
    primary: string;
    primaryDark: string;
    success: string;
    warning: string;
    error: string;

    // Health status colors
    healthExcellent: string;
    healthGood: string;
    healthOkay: string;
    healthPoor: string;
    healthConcerning: string;
    healthCritical: string;
    
    // Border and divider colors
    border: string;
    divider: string;
    
    // Modal and overlay colors
    modalBackground: string;
    modalOverlay: string;
    
    // Shadow color
    shadow: string;
    
    // Status bar
    statusBar: 'light-content' | 'dark-content';
  };
}

const lightTheme: Theme = {
  colors: {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceSecondary: '#f8f9fa',
    
    text: '#333333',
    textPrimary: '#333333',
    textSecondary: '#666666',
    textTertiary: '#888888',
    textOnPrimary: '#ffffff',
    
    primary: '#4CAF50',
    primaryDark: '#2E7D32',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',

    healthExcellent: '#2E7D32',
    healthGood: '#4CAF50',
    healthOkay: '#FF9800',
    healthPoor: '#FF5722',
    healthConcerning: '#F44336',
    healthCritical: '#B71C1C',
    
    border: '#e0e0e0',
    divider: '#eeeeee',
    
    modalBackground: 'rgba(0, 0, 0, 0.9)',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    shadow: '#000000',
    
    statusBar: 'dark-content',
  },
};

const darkTheme: Theme = {
  colors: {
    background: '#121212',
    surface: '#1e1e1e',
    surfaceSecondary: '#2a2a2a',
    
    text: '#ffffff',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textTertiary: '#888888',
    textOnPrimary: '#ffffff',
    
    primary: '#66BB6A',
    primaryDark: '#4CAF50',
    success: '#66BB6A',
    warning: '#FFB74D',
    error: '#EF5350',

    healthExcellent: '#66BB6A',
    healthGood: '#81C784',
    healthOkay: '#FFB74D',
    healthPoor: '#FF8A65',
    healthConcerning: '#EF5350',
    healthCritical: '#E57373',
    
    border: '#333333',
    divider: '#2a2a2a',
    
    modalBackground: 'rgba(0, 0, 0, 0.95)',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    shadow: '#000000',
    
    statusBar: 'light-content',
  },
};

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@rooted_theme_mode';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine the actual theme to use
  const getActualTheme = (mode: ThemeMode): 'light' | 'dark' => {
    if (mode === 'system') {
      const resolvedTheme = systemColorScheme === 'dark' ? 'dark' : 'light';
      return resolvedTheme;
    }
    return mode;
  };

  const actualTheme = getActualTheme(themeMode);
  const theme = actualTheme === 'dark' ? darkTheme : lightTheme;
  const isDark = actualTheme === 'dark';

  // Load saved theme mode on app start
  useEffect(() => {
    const loadThemeMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemeMode();
  }, []);

  // Listen for system color scheme changes when in system mode
  useEffect(() => {
    // Force re-render when system color scheme changes and we're in system mode
    if (themeMode === 'system') {
      // The component will automatically re-render due to systemColorScheme change
    }
  }, [systemColorScheme, themeMode]);

  // Save theme mode when it changes
  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
      setThemeModeState(mode); // Still update the state even if save fails
    }
  };

  // Use light theme as default while loading to prevent errors
  const currentTheme = isLoaded ? theme : lightTheme;
  const currentThemeMode = isLoaded ? themeMode : 'light';
  const currentIsDark = isLoaded ? isDark : false;

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    theme: currentTheme,
    themeMode: currentThemeMode,
    setThemeMode,
    isDark: currentIsDark,
  }), [currentTheme, currentThemeMode, setThemeMode, currentIsDark]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
