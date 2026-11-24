import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Keyboard, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { TagService } from '../services/TagService';
import { formStyles } from '../styles/FormStyles';
import TagChip from './TagChip';

interface TagFormProps {
  name: string;
  onNameChange: (name: string) => void;
  color: string;
  onColorChange: (color: string) => void;
  autoFocus?: boolean;
}

const MAX_NAME = 50;

/** Name, live preview, and color picker shared by Add Tag and Edit Tag. */
export default function TagForm({
  name,
  onNameChange,
  color,
  onColorChange,
  autoFocus = false,
}: TagFormProps) {
  const { theme } = useTheme();
  const f = formStyles(theme);
  const colors = TagService.getDefaultTagColors();
  const validColor = TagService.validateTagColor(color);

  const handleHexChange = (text: string) => {
    let hex = text.toUpperCase();
    if (!hex.startsWith('#')) hex = `#${hex}`;
    hex = hex.replace(/[^#0-9A-F]/g, '');
    if (hex.length <= 7) onColorChange(hex);
  };

  return (
    <View>
      <View style={f.inputGroup}>
        <View style={styles.labelRow}>
          <Text style={[f.label, styles.flatLabel]}>Name</Text>
          <Text style={styles.counter}>
            {name.length}/{MAX_NAME}
          </Text>
        </View>
        <TextInput
          style={f.input}
          value={name}
          onChangeText={onNameChange}
          placeholder="e.g. Low light"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={MAX_NAME}
          autoFocus={autoFocus}
          returnKeyType="done"
        />
      </View>

      <View style={f.inputGroup}>
        <Text style={f.label}>Color</Text>
        <View style={styles.swatches}>
          {colors.map((c) => {
            const selected = c.toUpperCase() === color.toUpperCase();
            return (
              <Pressable
                key={c}
                onPress={() => {
                  onColorChange(c);
                  Keyboard.dismiss();
                }}
                accessibilityRole="button"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected }}
                style={[
                  styles.swatch,
                  { backgroundColor: c },
                  selected && { borderColor: theme.colors.text },
                ]}
              >
                {selected ? <Check size={16} color="#FFFFFF" strokeWidth={3} /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.hexRow}>
          <View
            style={[
              styles.hexSwatch,
              { backgroundColor: validColor ? color : theme.colors.surfaceSecondary, borderColor: theme.colors.border },
            ]}
          />
          <TextInput
            style={[f.input, styles.hexInput]}
            value={color}
            onChangeText={handleHexChange}
            placeholder="#FF5733"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={7}
            autoCapitalize="characters"
            autoCorrect={false}
            accessibilityLabel="Custom hex color"
          />
        </View>
      </View>

      <View style={f.inputGroup}>
        <Text style={f.label}>Preview</Text>
        <View style={[styles.preview, { backgroundColor: theme.colors.surface }]}>
          <TagChip name={name.trim() || 'Tag name'} color={validColor ? color : '#999999'} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  flatLabel: {
    marginBottom: 0,
  },
  counter: {
    fontSize: 12,
    color: '#999999',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  hexSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  hexInput: {
    flex: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    letterSpacing: 1,
  },
  preview: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
  },
});
