import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface TagChipProps {
  name: string;
  color: string;
  /** Filled with a stronger tint and a check, for multi-select pickers. */
  selected?: boolean;
  /** Faded and non-interactive (e.g. already added to this plant). */
  dimmed?: boolean;
  /** Trailing content, e.g. a remove button in edit mode. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const isHex = (c: string) => /^#[0-9A-Fa-f]{6}$/.test(c);

/**
 * The one tag look used across the app: a soft tint of the tag color with a
 * colored dot and normal text, so any tag color stays readable in light and
 * dark mode.
 */
export default function TagChip({
  name,
  color,
  selected = false,
  dimmed = false,
  trailing,
  onPress,
  onLongPress,
  accessibilityLabel,
  style,
}: TagChipProps) {
  const { theme } = useTheme();
  const swatch = isHex(color) ? color : theme.colors.textTertiary;
  const interactive = !!(onPress || onLongPress) && !dimmed;

  const content = (
    <>
      {selected ? (
        <View style={[styles.check, { backgroundColor: swatch }]}>
          <Check size={10} color="#FFFFFF" strokeWidth={3.5} />
        </View>
      ) : (
        <View style={[styles.dot, { backgroundColor: swatch }]} />
      )}
      <Text style={[styles.text, { color: theme.colors.text }]} numberOfLines={1}>
        {name}
      </Text>
      {trailing}
    </>
  );

  const chipStyle = [
    styles.chip,
    {
      backgroundColor: `${swatch}${selected ? '40' : '1F'}`,
      borderColor: selected ? swatch : `${swatch}40`,
    },
    dimmed && styles.dimmed,
    style,
  ];

  if (!interactive) {
    return (
      <View style={chipStyle} accessibilityLabel={accessibilityLabel ?? name}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityState={onPress ? { selected } : undefined}
      style={({ pressed }) => [chipStyle, pressed && styles.pressed, styles.pointer]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 10,
    paddingRight: 12,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    maxWidth: 220,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  check: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  dimmed: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  pointer: Platform.OS === 'web' ? { cursor: 'pointer' as any } : {},
});
