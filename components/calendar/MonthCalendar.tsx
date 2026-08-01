import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import dayjs from "dayjs";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { getCareTypeByType } from "../../constants/careTypes";
import { Event } from "../../types/Plant";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MAX_DOTS = 3;

interface MonthCalendarProps {
  events: Event[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const dayKey = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");

export function MonthCalendar({
  events,
  selectedDate,
  onSelectDate,
}: MonthCalendarProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [month, setMonth] = useState(() =>
    dayjs(selectedDate || undefined).startOf("month"),
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const key = dayjs(e.date).format("YYYY-MM-DD");
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => {
    const start = month.startOf("month").startOf("week");
    return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
  }, [month]);

  const today = dayKey(dayjs());

  const dotColors = (key: string): string[] => {
    const list = eventsByDay.get(key);
    if (!list) return [];
    const seen = new Set<string>();
    const colors: string[] = [];
    for (const e of list) {
      const c = getCareTypeByType(e.event_type)?.color ?? theme.colors.primary;
      if (!seen.has(c)) {
        seen.add(c);
        colors.push(c);
      }
      if (colors.length >= MAX_DOTS) break;
    }
    return colors;
  };

  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setMonth(month.subtract(1, "month"))}
          accessibilityLabel="Previous month"
        >
          <ChevronLeft size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMonth(dayjs().startOf("month"))}>
          <Text style={styles.monthLabel}>{month.format("MMMM YYYY")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setMonth(month.add(1, "month"))}
          accessibilityLabel="Next month"
        >
          <ChevronRight size={22} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {grid.map((d) => {
          const key = dayKey(d);
          const inMonth = d.month() === month.month();
          const isSelected = key === selectedDate;
          const isToday = key === today;
          const colors = dotColors(key);
          return (
            <TouchableOpacity
              key={key}
              style={styles.cell}
              activeOpacity={0.7}
              onPress={() => onSelectDate(key)}
            >
              <View
                style={[
                  styles.dayCircle,
                  isToday && styles.dayToday,
                  isSelected && styles.daySelected,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !inMonth && styles.dayMuted,
                    isSelected && styles.daySelectedText,
                  ]}
                >
                  {d.date()}
                </Text>
              </View>
              <View style={styles.dots}>
                {colors.map((c, i) => (
                  <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    navButton: { padding: 8 },
    monthLabel: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
    },
    weekRow: { flexDirection: "row" },
    weekday: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    dayToday: { borderWidth: 1, borderColor: theme.colors.primary },
    daySelected: { backgroundColor: theme.colors.primary },
    dayText: { fontSize: 15, color: theme.colors.text },
    dayMuted: { color: theme.colors.textTertiary },
    daySelectedText: { color: "#fff", fontWeight: "700" },
    dots: {
      flexDirection: "row",
      gap: 3,
      height: 6,
      marginTop: 2,
    },
    dot: { width: 5, height: 5, borderRadius: 2.5 },
  });
