import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';

interface DateTimeInputProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  label?: string;
  compact?: boolean;
}

export default function DateTimeInput({
  value,
  onChange,
  mode = 'date',
  label,
  compact = false,
}: DateTimeInputProps) {
  const { theme } = useTheme();

  return (
    <View style={compact && styles.compactContainer}>
      {label && (
        <Text
          style={[
            styles.label,
            compact && styles.compactLabel,
            { color: theme.colors.textPrimary },
          ]}
        >
          {label}
        </Text>
      )}
      <DateTimePicker
        value={value}
        mode={mode}
        display={compact ? 'compact' : 'default'}
        style={compact ? styles.compactPicker : undefined}
        onChange={(event, selectedDate) => {
          if (selectedDate) {
            onChange(selectedDate);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  compactContainer: {
    minWidth: 0,
  },
  compactLabel: {
    marginBottom: 4,
  },
  compactPicker: {
    alignSelf: 'stretch',
  },
});
