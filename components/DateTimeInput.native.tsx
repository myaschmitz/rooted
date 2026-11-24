import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { CalendarDays, Clock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import { useTheme } from '../contexts/ThemeContext';
import { DateTimeService } from '../services/DateTimeService';
import { formStyles } from '../styles/FormStyles';

interface DateTimeInputProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  label?: string;
  compact?: boolean;
}

/**
 * A field styled like the app's other inputs. Tapping it opens the platform
 * picker: a bottom sheet with Cancel / Done on iOS (calendar for dates, wheel
 * for times) and the system dialog on Android. Shows the user's date and
 * 12/24-hour format preferences.
 */
export default function DateTimeInput({
  value,
  onChange,
  mode = 'date',
  label,
  compact = false,
}: DateTimeInputProps) {
  const { theme, isDark } = useTheme();
  const f = formStyles(theme);
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12');

  useEffect(() => {
    DateTimeService.getDateFormat().then(setDateFormat);
    DateTimeService.getTimeFormat().then(setTimeFormat);
  }, []);

  const is24Hour = timeFormat === '24';
  const display =
    mode === 'date'
      ? dayjs(value).format(dateFormat)
      : dayjs(value).format(is24Hour ? 'HH:mm' : 'h:mm A');
  const title = label ?? (mode === 'date' ? 'Date' : 'Time');
  const Icon = mode === 'date' ? CalendarDays : Clock;

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode,
        is24Hour,
        onChange: (event, selected) => {
          if (event.type === 'set' && selected) onChange(selected);
        },
      });
      return;
    }
    setDraft(value);
    setOpen(true);
  };

  const confirm = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <View>
      {label ? (
        <Text style={[f.label, compact && styles.compactLabel]}>{label}</Text>
      ) : null}

      <Pressable
        onPress={openPicker}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${display}`}
        style={({ pressed }) => [f.input, styles.field, pressed && styles.pressed]}
      >
        <Icon size={16} color={theme.colors.textTertiary} />
        <Text style={[styles.value, { color: theme.colors.text }]} numberOfLines={1}>
          {display}
        </Text>
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.overlay }]}
              onPress={() => setOpen(false)}
              accessibilityLabel="Close picker"
            />
            <View
              style={[
                styles.sheet,
                { backgroundColor: theme.colors.surface, paddingBottom: insets.bottom + 8 },
              ]}
            >
              <View style={[f.sheetHeader, styles.sheetHeader]}>
                <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityRole="button">
                  <Text style={f.sheetAction}>Cancel</Text>
                </Pressable>
                <Text style={f.sheetTitle}>{title}</Text>
                <Pressable onPress={confirm} hitSlop={8} accessibilityRole="button">
                  <Text style={f.sheetActionStrong}>Done</Text>
                </Pressable>
              </View>
              <View style={styles.pickerWrap}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                locale={is24Hour ? 'en_GB' : 'en_US'}
                themeVariant={isDark ? 'dark' : 'light'}
                accentColor={theme.colors.primary}
                onChange={(_, selected) => {
                  if (selected) setDraft(selected);
                }}
                style={mode === 'date' ? styles.inlinePicker : styles.spinnerPicker}
              />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  compactLabel: {
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  value: {
    flex: 1,
    fontSize: 16,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    backgroundColor: 'transparent',
  },
  // The native iOS picker sizes itself; center it rather than stretching it,
  // which left the time wheel hugging the left edge.
  pickerWrap: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  inlinePicker: {
    alignSelf: 'center',
  },
  spinnerPicker: {
    alignSelf: 'center',
    width: 300,
    height: 216,
  },
});
