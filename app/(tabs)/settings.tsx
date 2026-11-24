import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import WebContainer from "../../components/WebContainer";
import { Skeleton, TextSkeleton } from "../../components/Skeleton";
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
    const skeletonGroup = (rows: number, key: number) => (
      <View key={key} style={{ marginHorizontal: 16, marginTop: 20 }}>
        <TextSkeleton width={90} height={12} style={{ marginLeft: 16, marginBottom: 8 }} />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            paddingHorizontal: 16,
          }}
        >
          {Array.from({ length: rows }).map((_, i) => (
            <View
              key={i}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 52 }}
            >
              <Skeleton width={30} height={30} borderRadius={8} />
              <TextSkeleton width="45%" height={14} />
            </View>
          ))}
        </View>
      </View>
    );

    return (
      <WebContainer>
        <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
          {[3, 2, 1, 2].map((rows, i) => skeletonGroup(rows, i))}
        </ScrollView>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <>
        <ScrollView
          style={{ flex: 1, backgroundColor: theme.colors.background }}
          contentContainerStyle={{ paddingTop: 4 }}
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
