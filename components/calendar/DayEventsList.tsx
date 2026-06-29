import { useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronRight } from "lucide-react-native";
import dayjs from "dayjs";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { getCareTypeByType } from "../../constants/careTypes";
import { Event } from "../../types/Plant";

interface DayEventsListProps {
  date: string | null;
  events: Event[];
  plantNames?: Record<string, string>;
  onEventPress?: (event: Event) => void;
}

const formatType = (t: string) =>
  t
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function DayEventsList({
  date,
  events,
  plantNames,
  onEventPress,
}: DayEventsListProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const dayEvents = useMemo(() => {
    if (!date) return [];
    return events.filter((e) => dayjs(e.date).format("YYYY-MM-DD") === date);
  }, [events, date]);

  if (!date) {
    return (
      <Text style={styles.empty}>Select a day to see its events.</Text>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{dayjs(date).format("ddd, MMM D")}</Text>
      {dayEvents.length === 0 ? (
        <Text style={styles.empty}>No events on this day.</Text>
      ) : (
        dayEvents.map((event) => {
          const def = getCareTypeByType(event.event_type);
          const Icon = def?.icon;
          const color = def?.color ?? theme.colors.primary;
          const row = (
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
                {Icon && <Icon size={18} color={color} />}
              </View>
              <View style={styles.body}>
                <Text style={styles.type}>{def?.label ?? formatType(event.event_type)}</Text>
                {plantNames?.[event.plant_id] && (
                  <Text style={styles.plant}>{plantNames[event.plant_id]}</Text>
                )}
                {event.notes ? (
                  <Text style={styles.notes} numberOfLines={2}>
                    {event.notes}
                  </Text>
                ) : null}
              </View>
              {onEventPress && (
                <ChevronRight size={18} color={theme.colors.textSecondary} />
              )}
            </View>
          );
          return onEventPress ? (
            <TouchableOpacity key={event.id} onPress={() => onEventPress(event)}>
              {row}
            </TouchableOpacity>
          ) : (
            <View key={event.id}>{row}</View>
          );
        })
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { marginTop: 12 },
    heading: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 8,
    },
    empty: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      marginTop: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      gap: 12,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    body: { flex: 1 },
    type: { fontSize: 15, fontWeight: "600", color: theme.colors.text },
    plant: { fontSize: 13, color: theme.colors.primary, marginTop: 1 },
    notes: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
  });
