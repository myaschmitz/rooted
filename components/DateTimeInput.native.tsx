import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../contexts/ThemeContext';

interface DateTimeInputProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  label?: string;
}

export default function DateTimeInput({ value, onChange, mode = 'date', label }: DateTimeInputProps) {
  const { theme } = useTheme();

  return (
    <View>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      )}
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
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
});
