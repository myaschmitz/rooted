import React from 'react';
import { Palette, Sun, Moon, Monitor } from 'lucide-react-native';
import { useTheme, ThemeMode } from '../../contexts/ThemeContext';
import { SettingsGroup, SettingsRow, SegmentedControl } from './SettingsList';

const THEME_OPTIONS = [
  { value: 'light' as ThemeMode, icon: Sun, accessibilityLabel: 'Light theme' },
  { value: 'dark' as ThemeMode, icon: Moon, accessibilityLabel: 'Dark theme' },
  { value: 'system' as ThemeMode, icon: Monitor, accessibilityLabel: 'Match system theme' },
];

export default function AppearanceSection() {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <SettingsGroup title="Appearance">
      <SettingsRow
        icon={Palette}
        label="Theme"
        accessory={
          <SegmentedControl options={THEME_OPTIONS} value={themeMode} onChange={setThemeMode} />
        }
      />
    </SettingsGroup>
  );
}
