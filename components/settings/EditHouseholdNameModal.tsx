import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { formStyles } from '../../styles/FormStyles';

interface EditHouseholdNameModalProps {
  visible: boolean;
  householdName: string;
  loading: boolean;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditHouseholdNameModal({
  visible,
  householdName,
  loading,
  onChangeText,
  onSave,
  onClose,
}: EditHouseholdNameModalProps) {
  const { theme } = useTheme();
  const f = formStyles(theme);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={f.dialogOverlay}>
        <View style={f.dialogCard}>
          <Text style={f.dialogTitle}>Rename household</Text>
          <Text style={f.dialogMessage}>Everyone in the household will see the new name.</Text>

          <TextInput
            style={[f.input, { marginBottom: 20 }]}
            value={householdName}
            onChangeText={onChangeText}
            placeholder="Household name"
            placeholderTextColor={theme.colors.textTertiary}
            autoCapitalize="words"
            autoFocus
          />

          <View style={f.dialogButtonsRow}>
            <TouchableOpacity style={[f.secondaryButton, { flex: 1 }]} onPress={onClose}>
              <Text style={f.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[f.primaryButton, { flex: 1 }, loading && f.buttonDisabled]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={f.primaryButtonText}>{loading ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
