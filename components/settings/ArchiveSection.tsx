import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Archive, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import { useTheme, Theme } from "../../contexts/ThemeContext";

export default function ArchiveSection() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Archive
      </Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push("/archived-plants")}
      >
        <View style={styles.rowLeft}>
          <Archive size={18} color={theme.colors.textSecondary} />
          <Text style={[styles.rowText, { color: theme.colors.text }]}>
            Archived Plants
          </Text>
        </View>
        <ChevronRight size={18} color={theme.colors.textTertiary} />
      </TouchableOpacity>

      <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
        View and restore plants you've archived.
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      margin: 10,
      padding: 15,
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 15,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      paddingHorizontal: 4,
    },
    rowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    rowText: {
      fontSize: 16,
    },
    helperText: {
      fontSize: 13,
      marginTop: 8,
    },
  });
