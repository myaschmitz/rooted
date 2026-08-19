import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import WebContainer from "../../components/WebContainer";
import { TextSkeleton } from "../../components/Skeleton";
import { useSettings } from "../../hooks/useSettings";
import { useHouseholdSettings } from "../../hooks/useHouseholdSettings";
import {
  HouseholdSection,
  AppearanceSection,
  DateTimeSection,
  DataManagementSection,
  ArchiveSection,
  AboutSection,
  EditHouseholdNameModal,
} from "../../components/settings";

export default function SettingsScreen() {
  const { theme } = useTheme();

  const {
    dateFormat,
    timeFormat,
    loading: settingsLoading,
    exporting,
    setDateFormat,
    setTimeFormat,
    exportData,
    generateThumbnails,
    deleteAllData,
  } = useSettings();

  const {
    householdContext,
    loading: householdActionLoading,
    householdLoading,
    newHouseholdName,
    setNewHouseholdName,
    loadHouseholdInfo,
    shareHouseholdCode,
    copyHouseholdCode,
    editHouseholdName,
    regenerateCode,
    removeMember,
    toggleMemberRole,
    leaveHousehold,
  } = useHouseholdSettings();

  const [editHouseholdNameVisible, setEditHouseholdNameVisible] =
    useState(false);

  const loading = settingsLoading || householdActionLoading;

  useFocusEffect(
    React.useCallback(() => {
      loadHouseholdInfo();
    }, [loadHouseholdInfo]),
  );

  const handleEditHouseholdName = async () => {
    const success = await editHouseholdName();
    if (success) {
      setEditHouseholdNameVisible(false);
    }
  };

  if (householdLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ alignItems: "center", padding: 32 }}>
          <TextSkeleton width={200} height={24} style={{ marginBottom: 20 }} />
          <TextSkeleton width={150} height={18} style={{ marginBottom: 16 }} />
          <TextSkeleton width={180} height={16} style={{ marginBottom: 12 }} />
          <TextSkeleton width={120} height={16} style={{ marginBottom: 12 }} />
          <TextSkeleton width={160} height={16} />
        </View>
      </View>
    );
  }

  return (
    <WebContainer>
      <>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        >
          <HouseholdSection
            householdContext={householdContext}
            loading={loading}
            onEditName={() => setEditHouseholdNameVisible(true)}
            onCopyCode={copyHouseholdCode}
            onShareCode={shareHouseholdCode}
            onRegenerateCode={regenerateCode}
            onToggleMemberRole={toggleMemberRole}
            onRemoveMember={removeMember}
            onLeaveHousehold={leaveHousehold}
          />

          <AppearanceSection />

          <DateTimeSection
            dateFormat={dateFormat}
            timeFormat={timeFormat}
            onDateFormatChange={setDateFormat}
            onTimeFormatChange={setTimeFormat}
          />

          <ArchiveSection />

          <DataManagementSection
            loading={loading}
            exporting={exporting}
            onExportData={exportData}
            onGenerateThumbnails={generateThumbnails}
            onDeleteAllData={deleteAllData}
          />

          <AboutSection />
        </ScrollView>

        <EditHouseholdNameModal
          visible={editHouseholdNameVisible}
          householdName={newHouseholdName}
          loading={loading}
          onChangeText={setNewHouseholdName}
          onSave={handleEditHouseholdName}
          onClose={() => setEditHouseholdNameVisible(false)}
        />
      </>
    </WebContainer>
  );
}
