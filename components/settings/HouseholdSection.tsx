import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Home,
  Users,
  Share2,
  Copy,
  LogOut,
  Settings as SettingsIcon,
  Crown,
  UserMinus,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { HouseholdContext, HouseholdMember } from '../../types/Household';

interface HouseholdSectionProps {
  householdContext: HouseholdContext;
  loading: boolean;
  onEditName: () => void;
  onCopyCode: () => void;
  onShareCode: () => void;
  onRegenerateCode: () => void;
  onToggleMemberRole: (member: HouseholdMember) => void;
  onRemoveMember: (member: HouseholdMember) => void;
  onLeaveHousehold: () => void;
}

export default function HouseholdSection({
  householdContext,
  loading,
  onEditName,
  onCopyCode,
  onShareCode,
  onRegenerateCode,
  onToggleMemberRole,
  onRemoveMember,
  onLeaveHousehold,
}: HouseholdSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!householdContext.household) {
    return null;
  }

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Household</Text>

      {/* Household Name */}
      <View style={[styles.settingRow, { borderColor: theme.colors.border }]}>
        <View style={styles.settingInfo}>
          <Home size={24} color={theme.colors.primary} />
          <View>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              {householdContext.household.name}
            </Text>
            <Text style={[styles.settingSubtext, { color: theme.colors.textSecondary }]}>
              {householdContext.members.length} member{householdContext.members.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        {householdContext.isAdmin && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
            onPress={onEditName}
          >
            <SettingsIcon size={16} color={theme.colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Household Code */}
      <View style={[styles.settingRow, { borderColor: theme.colors.border, justifyContent: 'center' }]}>
        <View style={styles.settingInfo}>
          <Text style={[styles.settingLabel, { color: theme.colors.text, marginBottom: 0 }]}>
            Household Code:
          </Text>
          <Text style={[styles.householdCode, { color: theme.colors.primary, marginTop: 0 }]}>
            {householdContext.household.id}
          </Text>
        </View>
        <View style={[styles.householdCodeActions, { marginLeft: 16 }]}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
            onPress={onCopyCode}
          >
            <Copy size={16} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
            onPress={onShareCode}
          >
            <Share2 size={16} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Admin Actions */}
      {householdContext.isAdmin && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={onRegenerateCode}
          disabled={loading}
        >
          <RefreshCw size={16} color={theme.colors.textOnPrimary} />
          <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Regenerate Code</Text>
        </TouchableOpacity>
      )}

      {/* Members List */}
      <Text style={[styles.subsectionTitle, { color: theme.colors.text }]}>Members</Text>
      {householdContext.members.map((member) => (
        <View key={member.id} style={[styles.memberRow, { borderColor: theme.colors.border }]}>
          <View style={styles.memberInfo}>
            <Users size={18} color={theme.colors.primary} />
            <View>
              <Text style={[styles.memberName, { color: theme.colors.text }]}>
                {member.user_name}
                {member.id === householdContext.currentMember?.id && ' (You)'}
              </Text>
              <View style={styles.memberRoleContainer}>
                {member.role === 'admin' && <Crown size={12} color={theme.colors.primary} />}
                <Text style={[styles.memberRole, { color: theme.colors.textSecondary }]}>
                  {member.role === 'admin' ? 'Admin' : 'Member'}
                </Text>
              </View>
            </View>
          </View>

          {/* Admin can manage other members */}
          {householdContext.isAdmin && member.id !== householdContext.currentMember?.id && (
            <View style={styles.memberActions}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
                onPress={() => onToggleMemberRole(member)}
                disabled={loading}
              >
                <Crown
                  size={14}
                  color={member.role === 'admin' ? theme.colors.warning : theme.colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
                onPress={() => onRemoveMember(member)}
                disabled={loading}
              >
                <UserMinus size={14} color={theme.colors.error || '#ff4444'} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      {/* Leave Household */}
      <TouchableOpacity
        style={[styles.button, styles.dangerButton, { backgroundColor: theme.colors.error || '#ff4444' }]}
        onPress={onLeaveHousehold}
        disabled={loading}
      >
        <LogOut size={16} color={theme.colors.textOnPrimary} />
        <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>Leave Household</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      margin: 15,
      padding: 20,
      borderRadius: 10,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    settingSubtext: {
      fontSize: 14,
      marginTop: 2,
    },
    householdCode: {
      fontSize: 16,
      fontWeight: 'bold',
      letterSpacing: 1,
      marginTop: 4,
    },
    householdCodeActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconButton: {
      width: 32,
      height: 32,
      borderRadius: 6,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    dangerButton: {
      marginTop: 16,
    },
    subsectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginTop: 20,
      marginBottom: 12,
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 12,
      borderBottomWidth: 1,
      marginBottom: 8,
    },
    memberInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '500',
    },
    memberRoleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    memberRole: {
      fontSize: 14,
    },
    memberActions: {
      flexDirection: 'row',
      gap: 8,
    },
  });
