import React from 'react';
import { View, Text } from 'react-native';

interface DateTimeInputProps {
  value: Date;
  onChange: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime';
  placeholder?: string;
  style?: any;
  label?: string;
}

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  mode = 'datetime',
  placeholder,
  style,
  label,
}) => {
  return (
    <View style={style}>
      {label && <Text>{label}</Text>}
      <Text>DateTimeInput placeholder - {mode} mode</Text>
    </View>
  );
};

export default DateTimeInput;
