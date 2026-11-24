import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import dayjs from "dayjs";
import {
  ChevronRight,
  ChevronDown,
  SquarePen,
  Trash2,
  X,
  CircleDot,
} from "lucide-react-native";
import { router } from "expo-router";
import { Event, PlantPhoto } from "../../types/Plant";
import { usePlants } from "../../hooks/queries";
import { isGeneratedPropagationNote } from "../../constants/propagation";
import {
  getCareTypeByType,
  CareEventType,
  CARE_ACTIONS,
} from "../../constants/careTypes";
import { useWebModal } from "../../contexts/WebModalContext";
import { PhotoService } from "../../services/PhotoService";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { BaseColors, Spacing, Typography, BorderRadius } from "../../styles/theme";
import { TextSkeleton } from "../Skeleton";
import ActionMenu from "../ActionMenu";
import {
  computeCareStats,
  daysSincePreviousSameType,
  formatDays,
  sortNewestFirst,
} from "../../utils/eventHistory";

interface FormattedDate {
  date: string;
  timeAgo: string;
}

interface PlantEventsSectionProps {
  events: Event[];
  eventPhotos: { [eventId: string]: PlantPhoto[] };
  formattedDates: { [key: string]: FormattedDate };
  onDeleteEvent: (eventId: string, eventType: string) => void;
  onPhotoPress: (photo: PlantPhoto) => void;
  /** Rendered at the right of the section header (e.g. a view toggle). */
  headerAccessory?: React.ReactNode;
}

const INITIAL_VISIBLE = 8;
const RECENT_STRIP_LENGTH = 16;
const ICON_SIZE = 30;

const getPestSeverityColor = (severity: number): string => {
  if (severity <= 3) return BaseColors.severityLow;
  if (severity <= 6) return BaseColors.severityMedium;
  return BaseColors.severityHigh;
};

const getPestSeverityLabel = (severity: number): string => {
  if (severity <= 3) return "Minor";
  if (severity <= 6) return "Moderate";
  return "Severe";
};

const formatEventTypeTitle = (eventType: string): string =>
  eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

/** Hex color + alpha suffix for soft tinted backgrounds. */
const tint = (color: string, alpha = "1F") => `${color}${alpha}`;

const CARE_ACTION_TYPES = new Set(CARE_ACTIONS.map((c) => c.type));

export default function PlantEventsSection({
  events,
  eventPhotos,
  formattedDates,
  onDeleteEvent,
  onPhotoPress,
  headerAccessory,
}: PlantEventsSectionProps) {
  const { theme } = useTheme();
  const { openModal } = useWebModal();
  const { data: plants = [] } = usePlants();
  const styles = createStyles(theme);
  const [filter, setFilter] = useState<CareEventType | null>(null);
  const [expanded, setExpanded] = useState(false);

  const plantNames = useMemo(
    () => new Map(plants.map((p) => [p.id, p.name || p.type])),
    [plants],
  );

  const sorted = useMemo(() => sortNewestFirst(events), [events]);
  const stats = useMemo(() => computeCareStats(sorted, CARE_ACTION_TYPES), [sorted]);
  const sinceLast = useMemo(() => daysSincePreviousSameType(sorted), [sorted]);

  const filtered = useMemo(
    () => (filter ? sorted.filter((e) => e.event_type === filter) : sorted),
    [sorted, filter],
  );
  const visible = expanded ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hiddenCount = filtered.length - visible.length;

  // Group visible events by month for the timeline headings.
  const groups = useMemo(() => {
    const out: { key: string; label: string; events: Event[] }[] = [];
    for (const e of visible) {
      const d = dayjs(e.date);
      const key = d.format("YYYY-MM");
      const last = out[out.length - 1];
      if (last && last.key === key) last.events.push(e);
      else
        out.push({
          key,
          label: d.year() === dayjs().year() ? d.format("MMMM") : d.format("MMMM YYYY"),
          events: [e],
        });
    }
    return out;
  }, [visible]);

  const typeMeta = (type: CareEventType) => {
    const def = getCareTypeByType(type);
    return {
      label: def?.label ?? formatEventTypeTitle(type),
      Icon: def?.icon ?? CircleDot,
      color: def?.color ?? theme.colors.primary,
    };
  };

  // Propagate events point at the other plant in the relationship.
  const relatedPlant = (event: Event) => {
    const id = event.child_plant_id || event.parent_plant_id;
    if (!id) return null;
    return {
      id,
      label: event.child_plant_id ? "Propagated" : "Propagated from",
      name: plantNames.get(id) ?? "View plant",
    };
  };

  const editEvent = (event: Event) => {
    if (!openModal("edit-care-event", { id: event.id }))
      router.push(`/edit-care-event?id=${event.id}`);
  };

  const toggleFilter = (type: CareEventType) => {
    setFilter((current) => (current === type ? null : type));
    setExpanded(false);
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>History</Text>
          {events.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{events.length}</Text>
            </View>
          ) : null}
        </View>
        {headerAccessory}
      </View>

      {events.length === 0 ? (
        <Text style={styles.emptyText}>
          No events yet. Logged care will show up here.
        </Text>
      ) : (
        <>
          {/* At a glance: one tile per care type — last time + typical gap. */}
          {stats.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsRow}
              style={styles.bleed}
            >
              {stats.map((stat) => {
                const { label, Icon, color } = typeMeta(stat.type);
                const active = filter === stat.type;
                const last = formattedDates[stat.lastEventId]?.timeAgo;
                return (
                  <Pressable
                    key={stat.type}
                    onPress={() => toggleFilter(stat.type)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${label}: show only ${label} events`}
                    style={[
                      styles.statTile,
                      { backgroundColor: tint(color, active ? "33" : "14") },
                      active && { borderColor: color },
                    ]}
                  >
                    <View style={styles.statTop}>
                      <Icon size={15} color={color} />
                      <Text style={[styles.statLabel, { color }]} numberOfLines={1}>
                        {label}
                      </Text>
                      <Text style={styles.statCount}>{stat.count}</Text>
                    </View>
                    <Text style={styles.statPrimary} numberOfLines={1}>
                      {last ?? "—"}
                    </Text>
                    <Text style={styles.statSecondary} numberOfLines={1}>
                      {stat.avgIntervalDays != null
                        ? `about every ${formatDays(stat.avgIntervalDays)}`
                        : "first time"}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {/* Sequence of recent events, newest first, for spotting patterns. */}
          <View style={styles.recentBlock}>
            <Text style={styles.recentLabel}>Recent · newest first</Text>
            <View style={styles.recentStrip}>
              {sorted.slice(0, RECENT_STRIP_LENGTH).map((event, i) => {
                const { Icon, color, label } = typeMeta(event.event_type);
                const dimmed = filter !== null && event.event_type !== filter;
                return (
                  <View
                    key={event.id}
                    accessibilityLabel={label}
                    style={[
                      styles.recentDot,
                      { backgroundColor: i === 0 ? color : tint(color, "26") },
                      dimmed && styles.dimmed,
                    ]}
                  >
                    <Icon size={13} color={i === 0 ? BaseColors.white : color} />
                  </View>
                );
              })}
            </View>
          </View>

          {filter ? (
            <View style={styles.filterBar}>
              <Text style={styles.filterText}>
                Showing {typeMeta(filter).label.toLowerCase()} only
              </Text>
              <TouchableOpacity
                onPress={() => setFilter(null)}
                style={styles.filterClear}
                accessibilityRole="button"
                hitSlop={8}
              >
                <X size={14} color={theme.colors.textSecondary} />
                <Text style={styles.filterClearText}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Timeline */}
          {groups.map((group) => (
            <View key={group.key} style={styles.monthGroup}>
              <Text style={styles.monthLabel}>{group.label}</Text>
              {group.events.map((event, index) => {
                const { label, Icon, color } = typeMeta(event.event_type);
                const isLast = index === group.events.length - 1;
                const related = relatedPlant(event);
                // Only swap the generated note for the link when a link exists; if
                // the other plant was deleted the FK is NULL and the note is all we have.
                const showNotes =
                  !!event.notes && !(related && isGeneratedPropagationNote(event.notes));
                const dates = formattedDates[event.id];
                const gap = sinceLast.get(event.id);
                const photos = eventPhotos[event.id] ?? [];

                return (
                  <View key={event.id} style={styles.row}>
                    <View style={styles.rail}>
                      <View style={[styles.icon, { backgroundColor: tint(color, "24") }]}>
                        <Icon size={15} color={color} />
                      </View>
                      {!isLast ? <View style={styles.railLine} /> : null}
                    </View>

                    <View style={styles.rowBody}>
                      <View style={styles.rowHeader}>
                        <View style={styles.rowTitleBlock}>
                          <Text style={styles.rowTitle}>{label}</Text>
                          {dates ? (
                            <Text style={styles.rowMeta} numberOfLines={1}>
                              {dates.date}
                              {gap != null ? ` · ${formatDays(gap)} since last` : ""}
                            </Text>
                          ) : (
                            <TextSkeleton width={140} height={12} />
                          )}
                        </View>
                        {dates ? (
                          <Text style={styles.rowAgo} numberOfLines={1}>
                            {dates.timeAgo}
                          </Text>
                        ) : null}
                        <ActionMenu
                          iconSize={16}
                          accessibilityLabel={`${label} event actions`}
                          groups={[
                            [
                              {
                                key: "edit",
                                label: "Edit event",
                                icon: SquarePen,
                                onPress: () => editEvent(event),
                              },
                            ],
                            [
                              {
                                key: "delete",
                                label: "Delete event",
                                icon: Trash2,
                                destructive: true,
                                onPress: () => onDeleteEvent(event.id, event.event_type),
                              },
                            ],
                          ]}
                        />
                      </View>

                      {event.fertilizer_concentration || event.pest_severity ? (
                        <View style={styles.chips}>
                          {event.fertilizer_concentration ? (
                            <View style={[styles.chip, { backgroundColor: tint(color, "1A") }]}>
                              <Text style={[styles.chipText, { color }]}>
                                {event.fertilizer_concentration} strength
                              </Text>
                            </View>
                          ) : null}
                          {event.pest_severity ? (
                            <View
                              style={[
                                styles.chip,
                                {
                                  backgroundColor: tint(
                                    getPestSeverityColor(event.pest_severity),
                                    "1A",
                                  ),
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  { color: getPestSeverityColor(event.pest_severity) },
                                ]}
                              >
                                {getPestSeverityLabel(event.pest_severity)} ·{" "}
                                {event.pest_severity}/10
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {showNotes ? <Text style={styles.notes}>{event.notes}</Text> : null}

                      {related ? (
                        <TouchableOpacity
                          style={styles.lineageLink}
                          onPress={() => router.push(`/plant/${related.id}`)}
                          accessibilityRole="link"
                          accessibilityLabel={`${related.label} ${related.name}`}
                        >
                          <Text style={styles.lineageLinkText} numberOfLines={1}>
                            {related.label}: {related.name}
                          </Text>
                          <ChevronRight size={14} color={theme.colors.primary} />
                        </TouchableOpacity>
                      ) : null}

                      {photos.length > 0 ? (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.photos}
                        >
                          {photos.map((photo) => (
                            <TouchableOpacity
                              key={photo.id}
                              onPress={() => onPhotoPress(photo)}
                              accessibilityLabel="View photo"
                            >
                              <Image
                                source={{ uri: PhotoService.getImageUrl(photo, true) }}
                                style={styles.photo}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                                transition={200}
                              />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {hiddenCount > 0 || expanded ? (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={() => setExpanded((v) => !v)}
              accessibilityRole="button"
            >
              <Text style={styles.moreText}>
                {expanded ? "Show less" : `Show ${hiddenCount} older`}
              </Text>
              <ChevronDown
                size={16}
                color={theme.colors.primary}
                style={expanded ? { transform: [{ rotate: "180deg" }] } : undefined}
              />
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      margin: 10,
      marginTop: 0,
      padding: Spacing.base,
      borderRadius: BorderRadius.xl,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: Spacing.sm + 4,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.sm,
    },
    title: {
      fontSize: Typography.lg,
      fontWeight: Typography.weights.bold,
      color: theme.colors.text,
    },
    countBadge: {
      minWidth: 22,
      paddingHorizontal: 7,
      paddingVertical: 1,
      borderRadius: BorderRadius.full,
      backgroundColor: theme.colors.surfaceSecondary,
      alignItems: "center",
    },
    countText: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
    },
    emptyText: {
      fontSize: Typography.sm,
      color: theme.colors.textSecondary,
    },

    // Stats
    bleed: {
      marginHorizontal: -Spacing.base,
    },
    statsRow: {
      paddingHorizontal: Spacing.base,
      gap: Spacing.sm,
    },
    statTile: {
      width: 132,
      padding: Spacing.sm + 2,
      borderRadius: BorderRadius.lg,
      borderWidth: 1.5,
      borderColor: "transparent",
      ...(Platform.OS === "web" ? { cursor: "pointer" as any } : {}),
    },
    statTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: Spacing.xs + 2,
    },
    statLabel: {
      flex: 1,
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
    },
    statCount: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textTertiary,
    },
    statPrimary: {
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.text,
    },
    statSecondary: {
      fontSize: Typography.xs,
      color: theme.colors.textSecondary,
      marginTop: 1,
    },

    // Recent strip
    recentBlock: {
      marginTop: Spacing.base - 2,
    },
    recentLabel: {
      fontSize: Typography.xs,
      color: theme.colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: Spacing.xs + 2,
    },
    recentStrip: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
    },
    recentDot: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    dimmed: {
      opacity: 0.25,
    },

    // Filter
    filterBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: Spacing.base - 2,
      paddingVertical: Spacing.xs + 2,
      paddingHorizontal: Spacing.sm + 2,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    filterText: {
      fontSize: Typography.sm,
      color: theme.colors.textSecondary,
    },
    filterClear: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
    },
    filterClearText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textSecondary,
    },

    // Timeline
    monthGroup: {
      marginTop: Spacing.base,
    },
    monthLabel: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.textTertiary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: Spacing.sm,
    },
    row: {
      flexDirection: "row",
      gap: Spacing.sm + 4,
    },
    rail: {
      width: ICON_SIZE,
      alignItems: "center",
    },
    icon: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      borderRadius: ICON_SIZE / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    railLine: {
      flex: 1,
      width: 2,
      marginVertical: 3,
      borderRadius: 1,
      backgroundColor: theme.colors.borderLight,
    },
    rowBody: {
      flex: 1,
      paddingBottom: Spacing.base - 2,
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: Spacing.xs,
      minHeight: ICON_SIZE,
      // Pull the ⋯ button's tap padding into the row's right edge.
      marginRight: -Spacing.sm,
    },
    rowTitleBlock: {
      flex: 1,
      gap: 1,
    },
    rowTitle: {
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.text,
    },
    rowMeta: {
      fontSize: Typography.xs,
      color: theme.colors.textTertiary,
    },
    rowAgo: {
      fontSize: Typography.xs,
      color: theme.colors.textSecondary,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: Spacing.xs + 2,
      marginTop: Spacing.xs + 2,
    },
    chip: {
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: BorderRadius.full,
    },
    chipText: {
      fontSize: Typography.xs,
      fontWeight: Typography.weights.semibold,
    },
    notes: {
      fontSize: Typography.sm,
      lineHeight: Typography.sm * 1.45,
      color: theme.colors.textSecondary,
      marginTop: Spacing.xs + 2,
    },
    lineageLink: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      paddingVertical: 4,
      marginTop: 2,
    },
    lineageLinkText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.primary,
      flexShrink: 1,
    },
    photos: {
      gap: Spacing.xs + 2,
      marginTop: Spacing.sm,
    },
    photo: {
      width: 48,
      height: 48,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    moreButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingVertical: Spacing.sm + 2,
      marginTop: Spacing.xs,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.colors.surfaceSecondary,
    },
    moreText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.primary,
    },
  });
