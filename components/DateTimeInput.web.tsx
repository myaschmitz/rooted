import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface DateTimeInputProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time';
  label?: string;
}

export default function DateTimeInput({ value, onChange, mode = 'date', label }: DateTimeInputProps) {
  const { theme } = useTheme();

  const formatDateForInput = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (d: Date): string => {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const handleChange = (e: any) => {
    const val = e.target.value;
    if (!val) return;

    const newDate = new Date(value);
    if (mode === 'date') {
      const [year, month, day] = val.split('-').map(Number);
      newDate.setFullYear(year, month - 1, day);
    } else {
      const [hours, minutes] = val.split(':').map(Number);
      newDate.setHours(hours, minutes);
    }
    onChange(newDate);
  };

  const inputValue = mode === 'date' ? formatDateForInput(value) : formatTimeForInput(value);

  return (
    <View>
      {label && (
        <Text style={[styles.label, { color: theme.colors.textPrimary }]}>{label}</Text>
      )}
      <input
        type={mode === 'date' ? 'date' : 'time'}
        value={inputValue}
        onChange={handleChange}
        style={{
          padding: 10,
          fontSize: 16,
          borderRadius: 8,
          border: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface,
          color: theme.colors.textPrimary,
          outline: 'none',
          fontFamily: 'inherit',
          width: '100%',
          boxSizing: 'border-box' as const,
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
