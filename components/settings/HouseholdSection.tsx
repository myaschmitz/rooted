import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  Home,
  KeyRound,
  Share2,
  Copy,
  LogOut,
  Crown,
  UserMinus,
  RefreshCw,
} from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { HouseholdContext, HouseholdMember } from '../../types/Household';
import { Spacing, Typography, BorderRadius } from '../../styles/theme';
import ActionMenu from '../ActionMenu';
import { SettingsGroup, SettingsRow } from './SettingsList';

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

  const { household, members, currentMember, isAdmin } = householdContext;
  if (!household) {
    return null;
  }

  const memberCount = `${members.length} member${members.length !== 1 ? 's' : ''}`;

  return (
    <>
      <SettingsGroup
        title="Household"
        footer="Share the invite code so others can join your household."
      >
        <SettingsRow
          icon={Home}
          label={household.name}
          subtitle={memberCount}
          onPress={isAdmin ? onEditName : undefined}
          value={isAdmin ? 'Rename' : undefined}
        />
        <SettingsRow
          icon={KeyRound}
          label="Invite code"
          subtitle={household.id}
          accessory={
            <View style={styles.codeActions}>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={onCopyCode}
                accessibilityRole="button"
                accessibilityLabel="Copy invite code"
              >
                <Copy size={16} color={theme.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.circleButton}
                onPress={onShareCode}
                accessibilityRole="button"
                accessibilityLabel="Share invite code"
              >
                <Share2 size={16} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          }
        />
        {isAdmin ? (
          <SettingsRow
            icon={RefreshCw}
            label="Generate new invite code"
            onPress={onRegenerateCode}
            disabled={loading}
            chevron={false}
          />
        ) : null}
      </SettingsGroup>

      <SettingsGroup title={`Members · ${members.length}`}>
        {members.map((member) => {
          const isYou = member.id === currentMember?.id;
          const isMemberAdmin = member.role === 'admin';
          const canManage = isAdmin && !isYou;

          return (
            <View key={member.id} style={styles.memberRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(member.user_name || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberText}>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.user_name}
                  {isYou ? <Text style={styles.you}> · You</Text> : null}
                </Text>
                <View style={styles.roleRow}>
                  {isMemberAdmin ? <Crown size={12} color={theme.colors.warning} /> : null}
                  <Text style={styles.role}>{isMemberAdmin ? 'Admin' : 'Member'}</Text>
                </View>
              </View>
              {canManage ? (
                <ActionMenu
                  iconSize={18}
                  accessibilityLabel={`Manage ${member.user_name}`}
                  groups={[
                    [
                      {
                        key: 'role',
                        label: isMemberAdmin ? 'Remove admin' : 'Make admin',
                        icon: Crown,
                        onPress: () => onToggleMemberRole(member),
                      },
                    ],
                    [
                      {
                        key: 'remove',
                        label: 'Remove from household',
                        icon: UserMinus,
                        destructive: true,
                        onPress: () => onRemoveMember(member),
                      },
                    ],
                  ]}
                />
              ) : null}
            </View>
          );
        })}
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon={LogOut}
          label="Leave household"
          onPress={onLeaveHousehold}
          disabled={loading}
          destructive
        />
      </SettingsGroup>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    codeActions: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    circleButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceSecondary,
      ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm + 4,
      minHeight: 56,
      paddingLeft: Spacing.base,
      paddingRight: Spacing.sm,
      paddingVertical: Spacing.sm,
    },
    avatar: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.colors.primary}26`,
    },
    avatarText: {
      fontSize: Typography.sm,
      fontWeight: Typography.weights.bold,
      color: theme.colors.primary,
    },
    memberText: {
      flex: 1,
      gap: 2,
    },
    memberName: {
      fontSize: Typography.base,
      color: theme.colors.text,
    },
    you: {
      color: theme.colors.textTertiary,
    },
    roleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    role: {
      fontSize: Typography.xs + 1,
      color: theme.colors.textSecondary,
    },
  });
