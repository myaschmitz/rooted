import React from "react";
import { Archive } from "lucide-react-native";
import { router } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { SettingsGroup, SettingsRow } from "./SettingsList";

export default function ArchiveSection() {
  const { theme } = useTheme();

  return (
    <SettingsGroup title="Plants">
      <SettingsRow
        icon={Archive}
        iconColor={theme.colors.warning}
        label="Archived plants"
        subtitle="View and restore plants you've archived"
        onPress={() => router.push("/archived-plants")}
      />
    </SettingsGroup>
  );
}
