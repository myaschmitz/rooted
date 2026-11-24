import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { MoreHorizontal, LucideIcon } from "lucide-react-native";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { Spacing, Typography, BorderRadius, Shadows } from "../styles/theme";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: LucideIcon;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionMenuProps {
  /** Groups of items; a divider is drawn between groups. */
  groups: ActionMenuItem[][];
  accessibilityLabel?: string;
  iconSize?: number;
}

const MENU_WIDTH = 240;
const EDGE_MARGIN = Spacing.sm;

/**
 * A "⋯" button that opens a small popover menu anchored below it. Used to keep
 * infrequent actions out of the way.
 */
export default function ActionMenu({
  groups,
  accessibilityLabel = "More actions",
  iconSize = 20,
}: ActionMenuProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { width: windowWidth } = useWindowDimensions();
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(
    null,
  );

  const open = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      const right = Math.max(EDGE_MARGIN, windowWidth - (x + width));
      setAnchor({ top: y + height + Spacing.xs, right });
    });
  }, [windowWidth]);

  const close = useCallback(() => setAnchor(null), []);

  const handleItemPress = useCallback(
    (item: ActionMenuItem) => {
      close();
      // Let the menu close before the action opens its own modal/alert.
      setTimeout(item.onPress, Platform.OS === "web" ? 0 : 150);
    },
    [close],
  );

  const visibleGroups = groups.filter((g) => g.length > 0);

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        onPress={open}
        style={styles.trigger}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={8}
      >
        <MoreHorizontal size={iconSize} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={!!anchor}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        {anchor ? (
          <View
            style={[styles.menu, { top: anchor.top, right: anchor.right }]}
            accessibilityRole="menu"
          >
            {visibleGroups.map((group, groupIndex) => (
              <View
                key={group[0].key}
                style={groupIndex > 0 ? styles.groupDivider : undefined}
              >
                {group.map((item) => {
                  const Icon = item.icon;
                  const color = item.destructive
                    ? theme.colors.error
                    : theme.colors.text;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => handleItemPress(item)}
                      accessibilityRole="menuitem"
                      style={({ pressed, hovered }: any) => [
                        styles.item,
                        (pressed || hovered) && styles.itemActive,
                      ]}
                    >
                      {Icon ? <Icon size={18} color={color} /> : null}
                      <Text style={[styles.itemText, { color }]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    trigger: {
      padding: Spacing.sm,
      borderRadius: BorderRadius.full,
      ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
    },
    menu: {
      position: "absolute",
      width: MENU_WIDTH,
      backgroundColor: theme.colors.surface,
      borderRadius: BorderRadius.xl,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      paddingVertical: Spacing.xs,
      ...Shadows.md,
    },
    groupDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      marginTop: Spacing.xs,
      paddingTop: Spacing.xs,
    },
    item: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm + 4,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.sm + 2,
      ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
    },
    itemActive: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    itemText: {
      fontSize: Typography.base,
    },
  });
