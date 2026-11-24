import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { List, CalendarDays } from "lucide-react-native";
import { router } from "expo-router";
import dayjs from "dayjs";
import { Event, PlantPhoto } from "../../types/Plant";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { useWebModal } from "../../contexts/WebModalContext";
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
  const { openModal } = useWebModal();
  const [mode, setMode] = useState<Mode>("list");
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );

  const handleEventPress = (event: Event) => {
    if (!openModal("event", { id: event.id })) router.push(`/event/${event.id}`);
  };

  const toggle = <Toggle mode={mode} onChange={setMode} theme={theme} />;

  if (mode === "list") {
    return <PlantEventsSection {...props} headerAccessory={toggle} />;
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {toggle}
      </View>
      <MonthCalendar
        events={props.events}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />
      <DayEventsList
        date={selectedDate}
        events={props.events}
        onEventPress={handleEventPress}
      />
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
  const option = (value: Mode, label: string, Icon: typeof List) => {
    const active = mode === value;
    return (
      <TouchableOpacity
        style={[styles.toggleBtn, active && styles.toggleActive]}
        onPress={() => onChange(value)}
        accessibilityRole="button"
        accessibilityLabel={`${label} view`}
        accessibilityState={{ selected: active }}
      >
        <Icon
          size={16}
          color={active ? theme.colors.text : theme.colors.textTertiary}
        />
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.toggle}>
      {option("list", "List", List)}
      {option("calendar", "Calendar", CalendarDays)}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      margin: 10,
      marginTop: 0,
      padding: 16,
      borderRadius: 12,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    toggle: {
      flexDirection: "row",
      backgroundColor: theme.colors.surfaceSecondary,
      borderRadius: 8,
      padding: 2,
    },
    toggleBtn: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    toggleActive: {
      backgroundColor: theme.colors.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
  });
