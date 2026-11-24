import React from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from "react-native";
import { ChevronRight, LucideIcon } from "lucide-react-native";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { Spacing, Typography, BorderRadius } from "../../styles/theme";

/* ------------------------------------------------------------------ */
/* Group: small label above a rounded card of rows, optional footer.  */
/* ------------------------------------------------------------------ */

interface SettingsGroupProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, footer, children }: SettingsGroupProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Insert hairline separators between rows.
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View style={styles.group}>
      {title ? <Text style={styles.groupTitle}>{title}</Text> : null}
      <View style={styles.card}>
        {rows.map((row, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.separator} /> : null}
            {row}
          </React.Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.groupFooter}>{footer}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Row: tinted icon, label + optional subtitle, right-hand accessory. */
/* ------------------------------------------------------------------ */

interface SettingsRowProps {
  icon?: LucideIcon;
  /** Icon tint; defaults to the theme primary. */
  iconColor?: string;
  label: string;
  subtitle?: string;
  /** Short value shown on the right (e.g. the current date format). */
  value?: string;
  /** Custom right-hand content (toggle, buttons). Replaces value/chevron. */
  accessory?: React.ReactNode;
  onPress?: () => void;
  /** Show a chevron for rows that navigate. Defaults to true when pressable. */
  chevron?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

export function SettingsRow({
  icon: Icon,
  iconColor,
  label,
  subtitle,
  value,
  accessory,
  onPress,
  chevron,
  destructive = false,
  disabled = false,
  loading = false,
}: SettingsRowProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const tint = destructive ? theme.colors.error : iconColor ?? theme.colors.primary;
  const showChevron = chevron ?? (!!onPress && !accessory && !destructive);

  const content = (
    <>
      {Icon ? (
        <View style={[styles.iconWrap, { backgroundColor: `${tint}1F` }]}>
          <Icon size={17} color={tint} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text
          style={[styles.label, destructive && { color: theme.colors.error }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textTertiary} />
      ) : accessory ? (
        accessory
      ) : (
        <>
          {value ? (
            <Text style={styles.value} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {showChevron ? (
            <ChevronRight size={18} color={theme.colors.textTertiary} />
          ) : null}
        </>
      )}
    </>
  );

  if (!onPress) {
    return <View style={styles.row}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed, hovered }: any) => [
        styles.row,
        styles.pressable,
        (pressed || hovered) && styles.rowActive,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {content}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control for small enum settings (theme, time format).     */
/* ------------------------------------------------------------------ */

interface SegmentedOption<T extends string> {
  value: T;
  label?: string;
  icon?: LucideIcon;
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        const color = active ? theme.colors.text : theme.colors.textTertiary;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {Icon ? <Icon size={16} color={color} /> : null}
            {option.label ? (
              <Text style={[styles.segmentText, { color }]}>{option.label}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const ICON_BOX = 30;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    group: {
      marginHorizontal: Spacing.base,
      marginTop: Spacing.lg,
    },
    groupTitle: {
      fontSize: Typography.xs + 1,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginLeft: Spacing.base,
      marginBottom: Spacing.sm,
    },
    groupFooter: {
      fontSize: Typography.xs + 1,
      lineHeight: (Typography.xs + 1) * 1.4,
      color: theme.colors.textTertiary,
      marginHorizontal: Spacing.base,
      marginTop: Spacing.sm,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: BorderRadius.xl + 2,
      overflow: "hidden",
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginLeft: Spacing.base + ICON_BOX + Spacing.sm + 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm + 4,
      minHeight: 52,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm + 2,
    },
    pressable: Platform.OS === "web" ? { cursor: "pointer" as any } : {},
    rowActive: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    disabled: {
      opacity: 0.5,
    },
    iconWrap: {
      width: ICON_BOX,
      height: ICON_BOX,
      borderRadius: BorderRadius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    text: {
      flex: 1,
      gap: 2,
    },
    label: {
      fontSize: Typography.base,
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: Typography.xs + 1,
      color: theme.colors.textSecondary,
    },
    value: {
      fontSize: Typography.sm + 1,
      color: theme.colors.textSecondary,
      maxWidth: 160,
    },
    segmented: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: BorderRadius.md + 1,
      padding: 2,
    },
    segment: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 11,
      borderRadius: BorderRadius.md - 1,
      ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
    },
    segmentActive: {
      backgroundColor: theme.colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    segmentText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
    },
  });
