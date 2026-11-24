import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { SquarePen, Trash2, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import dayjs from "dayjs";
import { useTheme, Theme } from "../../contexts/ThemeContext";
import { formStyles } from "../../styles/FormStyles";
import { useAlert } from "../../contexts/AlertContext";
import { useWebModal } from "../../contexts/WebModalContext";
import { useModalParams, useModalDismiss } from "../../hooks/useModalNav";
import { useEvent, useEventPhotos, usePlant, useDeleteEvent } from "../../hooks/queries";
import { getCareTypeByType, isFertilizerEvent } from "../../constants/careTypes";
import { isGeneratedPropagationNote } from "../../constants/propagation";
import { PhotoService } from "../../services/PhotoService";
import WebContainer from "../../components/WebContainer";

const severityColor = (theme: Theme, s: number) =>
  s <= 3 ? theme.colors.success : s <= 6 ? theme.colors.warning : theme.colors.error;
const severityLabel = (s: number) => (s <= 3 ? "Minor" : s <= 6 ? "Moderate" : "Severe");

export default function EventDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const { showAlert } = useAlert();
  const { openModal } = useWebModal();
  const dismiss = useModalDismiss();
  const { id } = useModalParams<{ id: string }>();
  const { data: event, isLoading } = useEvent(id);
  const { data: plant } = usePlant(event?.plant_id ?? "");
  const { data: childPlant } = usePlant(event?.child_plant_id ?? "");
  const { data: sourcePlant } = usePlant(event?.parent_plant_id ?? "");
  const { data: photos = [] } = useEventPhotos(id);
  const deleteEvent = useDeleteEvent();

  const onEdit = () => {
    if (!openModal("edit-care-event", { id })) router.push(`/edit-care-event?id=${id}`);
  };

  const onDelete = () => {
    if (!event) return;
    showAlert(
      "Delete Event",
      `Are you sure you want to delete this ${event.event_type} event? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteEvent.mutateAsync({ id, plantId: event.plant_id });
              dismiss();
            } catch (e) {
              console.error("Failed to delete event:", e);
              showAlert("Error", "Failed to delete event");
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <WebContainer>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </WebContainer>
    );
  }

  if (!event) {
    return (
      <WebContainer>
        <View style={styles.center}>
          <Text style={styles.empty}>Event not found.</Text>
        </View>
      </WebContainer>
    );
  }

  const def = getCareTypeByType(event.event_type);
  const Icon = def?.icon;
  const color = def?.color ?? theme.colors.primary;

  return (
    <WebContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: color + "22" }]}>
            {Icon && <Icon size={26} color={color} />}
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.type}>{def?.label ?? event.event_type}</Text>
            <Text style={styles.date}>{dayjs(event.date).format("dddd, MMM D, YYYY")}</Text>
          </View>
        </View>

        {plant && (
          <TouchableOpacity style={styles.plantRow} onPress={() => router.push(`/plant/${event.plant_id}`)}>
            <Text style={styles.plantName}>{plant.name || plant.type}</Text>
            <ChevronRight size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}

        {childPlant && (
          <View style={styles.field}>
            <Text style={styles.label}>Propagated</Text>
            <TouchableOpacity
              style={styles.plantRow}
              onPress={() => router.push(`/plant/${childPlant.id}`)}
            >
              <Text style={styles.plantName}>
                {childPlant.name || childPlant.type}
              </Text>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {sourcePlant && (
          <View style={styles.field}>
            <Text style={styles.label}>Propagated from</Text>
            <TouchableOpacity
              style={styles.plantRow}
              onPress={() => router.push(`/plant/${sourcePlant.id}`)}
            >
              <Text style={styles.plantName}>
                {sourcePlant.name || sourcePlant.type}
              </Text>
              <ChevronRight size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {isFertilizerEvent(event.event_type) && event.fertilizer_concentration && (
          <View style={styles.field}>
            <Text style={styles.label}>Strength</Text>
            <Text style={styles.value}>{event.fertilizer_concentration}</Text>
          </View>
        )}

        {event.pest_severity != null && (
          <View style={styles.field}>
            <Text style={styles.label}>Pest Severity</Text>
            <Text style={[styles.value, { color: severityColor(theme, event.pest_severity) }]}>
              {event.pest_severity}/10 ({severityLabel(event.pest_severity)})
            </Text>
          </View>
        )}

        {event.notes &&
        !(
          (childPlant || sourcePlant) && isGeneratedPropagationNote(event.notes)
        ) ? (
          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.value}>{event.notes}</Text>
          </View>
        ) : null}

        {photos.length > 0 && (
          <View style={styles.field}>
            <Text style={styles.label}>Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photos}>
              {photos.map((photo) => (
                <Image
                  key={photo.id}
                  source={{ uri: PhotoService.getImageUrl(photo, true) }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.editButton]} onPress={onEdit}>
            <SquarePen size={18} color={theme.colors.textOnPrimary} />
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={onDelete}>
            <Trash2 size={18} color={theme.colors.error} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </WebContainer>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, maxWidth: 600, width: '100%', alignSelf: 'center' },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
    empty: formStyles(theme).empty,
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    iconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    headerBody: { flex: 1 },
    type: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
    date: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
    plantRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
    plantName: { fontSize: 16, fontWeight: "600", color: theme.colors.primary },
    field: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    label: { ...formStyles(theme).label, marginBottom: 4, marginLeft: 0 },
    value: { fontSize: 16, lineHeight: 22, color: theme.colors.text },
    photos: { marginTop: 6 },
    photo: { width: 84, height: 84, borderRadius: 12, marginRight: 8, backgroundColor: theme.colors.surface },
    actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
    button: { flex: 1 },
    editButton: formStyles(theme).primaryButton,
    editText: formStyles(theme).primaryButtonText,
    deleteButton: formStyles(theme).dangerButton,
    deleteText: formStyles(theme).dangerButtonText,
  });
