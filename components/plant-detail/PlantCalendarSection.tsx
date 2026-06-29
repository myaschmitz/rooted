import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { List, CalendarDays } from "lucide-react-native";
import dayjs from "dayjs";
import { Event, PlantPhoto } from "../../types/Plant";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { MonthCalendar } from "../calendar/MonthCalendar";
import { DayEventsList } from "../calendar/DayEventsList";
import PlantEventsSection from "./PlantEventsSection";

interface FormattedDate {
  date: string;
  timeAgo: string;
}

interface PlantCalendarSectionProps {
  events: Event[];
  eventPhotos: { [eventId: string]: PlantPhoto[] };
  formattedDates: { [key: string]: FormattedDate };
  onDeleteEvent: (eventId: string, eventType: string) => void;
  onPhotoPress: (photo: PlantPhoto) => void;
}

type Mode = "list" | "calendar";

export default function PlantCalendarSection(props: PlantCalendarSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [mode, setMode] = useState<Mode>("list");
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );

  if (mode === "list") {
    return (
      <View>
        <View style={styles.toggleWrap}>
          <Toggle mode={mode} onChange={setMode} theme={theme} />
        </View>
        <PlantEventsSection {...props} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.toggleWrap}>
        <Toggle mode={mode} onChange={setMode} theme={theme} />
      </View>
      <MonthCalendar
        events={props.events}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <DayEventsList date={selectedDate} events={props.events} />
    </View>
  );
}

function Toggle({
  mode,
  onChange,
  theme,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  theme: Theme;
}) {
  const styles = createStyles(theme);
  return (
    <View style={styles.toggle}>
      <TouchableOpacity
        style={[styles.toggleBtn, mode === "list" && styles.toggleActive]}
        onPress={() => onChange("list")}
      >
        <List
          size={16}
          color={mode === "list" ? "#fff" : theme.colors.textSecondary}
        />
        <Text style={[styles.toggleText, mode === "list" && styles.toggleTextActive]}>
          List
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleBtn, mode === "calendar" && styles.toggleActive]}
        onPress={() => onChange("calendar")}
      >
        <CalendarDays
          size={16}
          color={mode === "calendar" ? "#fff" : theme.colors.textSecondary}
        />
        <Text
          style={[styles.toggleText, mode === "calendar" && styles.toggleTextActive]}
        >
          Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      margin: 10,
      marginTop: 0,
      padding: 15,
      borderRadius: 8,
    },
    toggleWrap: { alignItems: "flex-end", marginHorizontal: 10, marginBottom: 8 },
    toggle: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
      padding: 3,
    },
    toggleBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 6,
    },
    toggleActive: { backgroundColor: theme.colors.primary },
    toggleText: { fontSize: 14, fontWeight: "600", color: theme.colors.textSecondary },
    toggleTextActive: { color: "#fff" },
  });
