import { View, StyleSheet } from "react-native";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { Skeleton } from "../Skeleton";

const LIST_ROWS = 3;

/**
 * Loading placeholder that mirrors MonthCalendar + DayEventsList:
 * month header with nav buttons, weekday labels, a 6x7 day grid,
 * then the selected-day heading and a few event rows.
 */
export function CalendarSkeleton() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View accessibilityLabel="Loading calendar">
      <View style={styles.header}>
        <View style={styles.navButton}>
          <Skeleton width={22} height={22} borderRadius={11} />
        </View>
        <Skeleton width={140} height={20} borderRadius={6} />
        <View style={styles.navButton}>
          <Skeleton width={22} height={22} borderRadius={11} />
        </View>
      </View>

      <View style={styles.weekRow}>
        {Array.from({ length: 7 }, (_, i) => (
          <View key={i} style={styles.weekday}>
            <Skeleton width={10} height={12} borderRadius={3} />
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 42 }, (_, i) => (
          <View key={i} style={styles.cell}>
            <Skeleton width={34} height={34} borderRadius={17} />
            <View style={styles.dots} />
          </View>
        ))}
      </View>

      <View style={styles.list}>
        <Skeleton width={110} height={16} style={styles.heading} />
        {Array.from({ length: LIST_ROWS }, (_, i) => (
          <View key={i} style={styles.row}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={styles.body}>
              <Skeleton width="40%" height={14} />
              <Skeleton width="25%" height={12} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// Dimensions match MonthCalendar / DayEventsList so the layout doesn't jump on load.
const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    navButton: { padding: 8 },
    weekRow: { flexDirection: "row", marginBottom: 4 },
    weekday: { flex: 1, alignItems: "center" },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dots: { height: 6, marginTop: 2 },
    list: { marginTop: 12 },
    heading: { marginBottom: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    body: { flex: 1, gap: 6 },
  });
