import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Palette, Sun, Moon, Monitor } from 'lucide-react-native';
import { useTheme, Theme, ThemeMode } from '../../contexts/ThemeContext';

const THEME_OPTIONS = [
  { value: 'light' as const, icon: Sun },
  { value: 'dark' as const, icon: Moon },
  { value: 'system' as const, icon: Monitor },
];

export default function AppearanceSection() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>

      <View style={[styles.settingRow, { borderColor: theme.colors.border }]}>
        <View style={styles.settingInfo}>
          <Palette size={20} color={theme.colors.primary} />
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Theme</Text>
        </View>

        <View style={[styles.themeSelector, { backgroundColor: theme.colors.background }]}>
          {THEME_OPTIONS.map((option) => {
            const IconComponent = option.icon;
            const isSelected = themeMode === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.themeOptionCompact,
                  isSelected && [styles.selectedThemeOptionCompact, { backgroundColor: theme.colors.primary }],
                ]}
                onPress={() => setThemeMode(option.value)}
              >
                <IconComponent
                  size={18}
                  color={isSelected ? theme.colors.textOnPrimary : theme.colors.text}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      margin: 15,
      padding: 20,
      borderRadius: 10,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    themeSelector: {
      flexDirection: 'row',
      borderRadius: 8,
      padding: 2,
      gap: 2,
    },
    themeOptionCompact: {
      width: 36,
      height: 36,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedThemeOptionCompact: {},
  });
