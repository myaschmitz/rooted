import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import { CalendarDays, Clock, Check } from 'lucide-react-native';
import dayjs from 'dayjs';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { DATE_FORMATS, DateFormatValue, TimeFormatValue } from '../../hooks/useSettings';
import { Spacing, Typography, BorderRadius } from '../../styles/theme';
import { SettingsGroup, SettingsRow, SegmentedControl } from './SettingsList';

interface DateTimeSectionProps {
  dateFormat: DateFormatValue;
  timeFormat: TimeFormatValue;
  onDateFormatChange: (format: DateFormatValue) => void;
  onTimeFormatChange: (format: TimeFormatValue) => void;
}

const TIME_OPTIONS = [
  { value: '12' as TimeFormatValue, label: '12h', accessibilityLabel: '12-hour (AM/PM)' },
  { value: '24' as TimeFormatValue, label: '24h', accessibilityLabel: '24-hour' },
];

export default function DateTimeSection({
  dateFormat,
  timeFormat,
  onDateFormatChange,
  onTimeFormatChange,
}: DateTimeSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [pickerVisible, setPickerVisible] = useState(false);
  const today = dayjs();

  const choose = (format: DateFormatValue) => {
    onDateFormatChange(format);
    setPickerVisible(false);
  };

  return (
    <>
      <SettingsGroup title="Date & time">
        <SettingsRow
          icon={CalendarDays}
          label="Date format"
          value={today.format(dateFormat)}
          onPress={() => setPickerVisible(true)}
        />
        <SettingsRow
          icon={Clock}
          label="Time format"
          accessory={
            <SegmentedControl
              options={TIME_OPTIONS}
              value={timeFormat}
              onChange={onTimeFormatChange}
            />
          }
        />
      </SettingsGroup>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          {/* Inner Pressable swallows taps so they don't close the sheet. */}
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Date format</Text>
            {DATE_FORMATS.map((format, i) => {
              const selected = format.value === dateFormat;
              return (
                <Pressable
                  key={format.value}
                  onPress={() => choose(format.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed, hovered }: any) => [
                    styles.option,
                    i > 0 && styles.optionDivider,
                    (pressed || hovered) && styles.optionActive,
                  ]}
                >
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {today.format(format.value)}
                    </Text>
                    <Text style={styles.optionHint}>{format.label}</Text>
                  </View>
                  {selected ? <Check size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.lg,
    },
    sheet: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.colors.surface,
      borderRadius: BorderRadius['2xl'],
      paddingVertical: Spacing.sm,
      overflow: 'hidden',
      ...(Platform.OS === 'web' ? { cursor: 'default' as any } : {}),
    },
    sheetTitle: {
      fontSize: Typography.xs + 1,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      paddingHorizontal: Spacing.lg,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm + 4,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    optionDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    optionActive: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    optionLabel: {
      fontSize: Typography.base,
      color: theme.colors.text,
    },
    optionLabelSelected: {
      fontWeight: Typography.weights.semibold,
      color: theme.colors.primary,
    },
    optionHint: {
      fontSize: Typography.xs + 1,
      color: theme.colors.textTertiary,
    },
  });
