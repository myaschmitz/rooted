import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { ArchiveRestore } from "lucide-react-native";
import { useTheme, Theme } from "../contexts/ThemeContext";
import { useAlert } from "../contexts/AlertContext";
import { useArchivedPlants, useRestorePlant } from "../hooks/queries";
import WebContainer from "../components/WebContainer";
import { Plant } from "../types/Plant";

export default function ArchivedPlantsScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const { data: archivedPlants, isLoading } = useArchivedPlants();
  const restoreMutation = useRestorePlant();
  const styles = createStyles(theme);

  const handleRestore = (plant: Plant) => {
    showAlert(
      "Restore Plant",
      `Are you sure you want to restore "${plant.name || plant.type}" to your active plants?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            try {
              await restoreMutation.mutateAsync(plant.id);
            } catch (error) {
              console.error("Failed to restore plant:", error);
              showAlert("Error", "Failed to restore plant");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Plant }) => (
    <View style={styles.plantItem}>
      <View style={styles.plantInfo}>
        <Text style={styles.plantName}>{item.name || item.type}</Text>
        <Text style={styles.plantType}>{item.type}</Text>
        {item.location && (
          <Text style={styles.plantLocation}>{item.location}</Text>
        )}
        {item.archived_at && (
          <Text style={styles.archivedDate}>
            Archived {new Date(item.archived_at).toLocaleDateString()}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={() => handleRestore(item)}
      >
        <ArchiveRestore size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <WebContainer>
      <View style={styles.container}>
        {!archivedPlants || archivedPlants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No archived plants</Text>
            <Text style={styles.emptySubtext}>
              Plants you archive will appear here. You can restore them at any
              time.
            </Text>
          </View>
        ) : (
          <FlatList
            data={archivedPlants}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </WebContainer>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    listContent: {
      padding: 16,
    },
    plantItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 8,
      marginBottom: 10,
    },
    plantInfo: {
      flex: 1,
    },
    plantName: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    plantType: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    plantLocation: {
      fontSize: 13,
      color: theme.colors.textTertiary,
      marginTop: 2,
    },
    archivedDate: {
      fontSize: 12,
      color: theme.colors.textTertiary,
      marginTop: 4,
      fontStyle: "italic",
    },
    restoreButton: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: theme.colors.background,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 8,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
  });
