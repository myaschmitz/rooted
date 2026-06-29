import { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import dayjs from "dayjs";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { useWebModal } from "../../contexts/WebModalContext";
import WebContainer from "../../components/WebContainer";
import { MonthCalendar } from "../../components/calendar/MonthCalendar";
import { DayEventsList } from "../../components/calendar/DayEventsList";
import { TextSkeleton } from "../../components/Skeleton";
import { useAllEvents, usePlants } from "../../hooks/queries";
import { Event } from "../../types/Plant";

export default function CalendarScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { openModal } = useWebModal();
  const { data: events = [], isLoading: eventsLoading } = useAllEvents();
  const { data: plants = [], isLoading: plantsLoading } = usePlants();
  const [selectedDate, setSelectedDate] = useState<string>(
    dayjs().format("YYYY-MM-DD"),
  );

  const plantNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of plants) map[p.id] = p.name || p.type;
    return map;
  }, [plants]);

  const handleEventPress = (event: Event) => {
    if (!openModal("event", { id: event.id })) router.push(`/event/${event.id}`);
  };

  return (
    <WebContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {eventsLoading || plantsLoading ? (
          <TextSkeleton width={220} height={300} />
        ) : (
          <>
            <MonthCalendar
              events={events}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <DayEventsList
              date={selectedDate}
              events={events}
              plantNames={plantNames}
              onEventPress={handleEventPress}
            />
          </>
        )}
      </ScrollView>
    </WebContainer>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, maxWidth: 700, width: "100%", alignSelf: "center" },
  });
