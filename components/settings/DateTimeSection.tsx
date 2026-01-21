import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { DATE_FORMATS, TIME_FORMATS, DateFormatValue, TimeFormatValue } from '../../hooks/useSettings';

interface DateTimeSectionProps {
  dateFormat: DateFormatValue;
  timeFormat: TimeFormatValue;
  onDateFormatChange: (format: DateFormatValue) => void;
  onTimeFormatChange: (format: TimeFormatValue) => void;
}

export default function DateTimeSection({
  dateFormat,
  timeFormat,
  onDateFormatChange,
  onTimeFormatChange,
}: DateTimeSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const handleDateFormatChange = (format: DateFormatValue) => {
    onDateFormatChange(format);
    setDropdownVisible(false);
  };

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date & Time Format</Text>

      <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Date Format</Text>

      {/* Dropdown for Date Format */}
      <TouchableOpacity
        style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => setDropdownVisible(true)}
      >
        <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{dateFormat}</Text>
        <ChevronDown size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setDropdownVisible(false)}>
          <View style={[styles.dropdownModal, { backgroundColor: theme.colors.surface }]}>
            {DATE_FORMATS.map((format) => (
              <TouchableOpacity
                key={format.value}
                style={[
                  styles.dropdownOption,
                  dateFormat === format.value && [
                    styles.selectedDropdownOption,
                    { backgroundColor: theme.colors.primary },
                  ],
                ]}
                onPress={() => handleDateFormatChange(format.value)}
              >
                <Text
                  style={[
                    styles.dropdownOptionText,
                    { color: theme.colors.text },
                    dateFormat === format.value && [
                      styles.selectedDropdownOptionText,
                      { color: theme.colors.textOnPrimary },
                    ],
                  ]}
                >
                  {format.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Text style={[styles.settingLabel, { marginTop: 20, color: theme.colors.text }]}>Time Format</Text>
      {TIME_FORMATS.map((format) => (
        <TouchableOpacity
          key={format.value}
          style={[
            styles.formatOption,
            { borderColor: theme.colors.border },
            timeFormat === format.value && [styles.selectedFormat, { backgroundColor: theme.colors.primary }],
          ]}
          onPress={() => onTimeFormatChange(format.value)}
        >
          <Text
            style={[
              styles.formatText,
              { color: theme.colors.text },
              timeFormat === format.value && [styles.selectedFormatText, { color: theme.colors.textOnPrimary }],
            ]}
          >
            {format.label}
          </Text>
        </TouchableOpacity>
      ))}
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
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    dropdown: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8,
    },
    dropdownText: {
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dropdownModal: {
      borderRadius: 8,
      padding: 8,
      minWidth: 200,
      maxWidth: 300,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    dropdownOption: {
      padding: 12,
      borderRadius: 4,
    },
    selectedDropdownOption: {},
    dropdownOptionText: {
      fontSize: 16,
      textAlign: 'center',
    },
    selectedDropdownOptionText: {
      fontWeight: 'bold',
    },
    formatOption: {
      paddingVertical: 12,
      paddingHorizontal: 15,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 8,
    },
    selectedFormat: {
      borderColor: 'transparent',
    },
    formatText: {
      fontSize: 16,
    },
    selectedFormatText: {
      fontWeight: '600',
    },
  });
