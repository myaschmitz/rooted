import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SquarePen, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { Event, PlantPhoto } from '../../types/Plant';
import { useWebModal } from '../../contexts/WebModalContext';
import { PhotoService } from '../../services/PhotoService';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { TextSkeleton } from '../Skeleton';

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
}

const getPestSeverityColor = (severity: number): string => {
  if (severity <= 3) return '#4CAF50'; // Green for low
  if (severity <= 6) return '#FF9800'; // Orange for medium
  return '#F44336'; // Red for high
};

const getPestSeverityLabel = (severity: number): string => {
  if (severity <= 3) return '(Minor)';
  if (severity <= 6) return '(Moderate)';
  return '(Severe)';
};

const formatEventTypeTitle = (eventType: string): string => {
  return eventType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function PlantEventsSection({
  events,
  eventPhotos,
  formattedDates,
  onDeleteEvent,
  onPhotoPress,
}: PlantEventsSectionProps) {
  const { theme } = useTheme();
  const { openModal } = useWebModal();
  const styles = createStyles(theme);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Event History ({events.length})</Text>
      {events.length === 0 ? (
        <Text style={styles.emptyCareText}>No events recorded yet</Text>
      ) : (
        events.slice(0, 10).map((event) => (
          <React.Fragment key={event.id}>
            <View style={styles.careEventItem}>
              <View style={styles.careEventHeader}>
                <View style={styles.careEventInfo}>
                  <Text style={styles.careEventType}>
                    {formatEventTypeTitle(event.event_type)}
                  </Text>
                  <Text style={styles.careEventDate}>
                    {formattedDates[event.id] ? (
                      `${formattedDates[event.id].date} (${formattedDates[event.id].timeAgo})`
                    ) : (
                      <TextSkeleton width={180} height={14} />
                    )}
                  </Text>
                </View>
                <View style={styles.careEventActions}>
                  <TouchableOpacity
                    style={styles.editCareButton}
                    onPress={() => { if (!openModal('edit-care-event', { id: event.id })) router.push(`/edit-care-event?id=${event.id}`); }}
                  >
                    <SquarePen size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteCareButton}
                    onPress={() => onDeleteEvent(event.id, event.event_type)}
                  >
                    <Trash2 size={16} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
              {event.notes && <Text style={styles.careEventNotes}>{event.notes}</Text>}
              {event.fertilizer_concentration && (
                <Text style={styles.fertilizerInfo}>
                  Strength: {event.fertilizer_concentration}
                </Text>
              )}
              {event.pest_severity && (
                <Text
                  style={[
                    styles.pestSeverityInfo,
                    { color: getPestSeverityColor(event.pest_severity) },
                  ]}
                >
                  Pest Severity: {event.pest_severity}/10{' '}
                  {getPestSeverityLabel(event.pest_severity)}
                </Text>
              )}
              {eventPhotos[event.id] && eventPhotos[event.id].length > 0 && (
                <View style={styles.eventPhotosContainer}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {eventPhotos[event.id].map((photo) => (
                      <TouchableOpacity
                        key={photo.id}
                        style={styles.eventPhotoItem}
                        onPress={() => onPhotoPress(photo)}
                      >
                        <Image
                          source={{ uri: PhotoService.getImageUrl(photo, true) }}
                          style={styles.eventPhotoImage}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                          transition={200}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </React.Fragment>
        ))
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
      padding: 15,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: theme.colors.text,
    },
    emptyCareText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    careEventItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    careEventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
    },
    careEventInfo: {
      flex: 1,
    },
    careEventType: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    careEventDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    careEventNotes: {
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 3,
    },
    fertilizerInfo: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },
    pestSeverityInfo: {
      fontSize: 12,
      fontWeight: '500',
      fontStyle: 'italic',
    },
    careEventActions: {
      flexDirection: 'row',
      gap: 8,
    },
    editCareButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteCareButton: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventPhotosContainer: {
      marginTop: 8,
    },
    eventPhotoItem: {
      marginRight: 8,
    },
    eventPhotoImage: {
      width: 40,
      height: 40,
      borderRadius: 6,
    },
  });
