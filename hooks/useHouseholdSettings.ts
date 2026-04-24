import { useState, useCallback } from 'react';
import { Share, Clipboard } from 'react-native';
import { useAlert } from '../contexts/AlertContext';
import { router } from 'expo-router';
import { HouseholdService } from '../services/HouseholdService';
import { HouseholdContext, HouseholdMember } from '../types/Household';

export interface UseHouseholdSettingsReturn {
  householdContext: HouseholdContext;
  loading: boolean;
  householdLoading: boolean;
  newHouseholdName: string;
  setNewHouseholdName: (name: string) => void;
  loadHouseholdInfo: () => Promise<void>;
  shareHouseholdCode: () => Promise<void>;
  copyHouseholdCode: () => Promise<void>;
  editHouseholdName: () => Promise<boolean>;
  regenerateCode: () => void;
  removeMember: (member: HouseholdMember) => void;
  toggleMemberRole: (member: HouseholdMember) => void;
  leaveHousehold: () => void;
}

export const useHouseholdSettings = (): UseHouseholdSettingsReturn => {
  const { showAlert } = useAlert();
  const [loading, setLoading] = useState(false);
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [householdContext, setHouseholdContext] = useState<HouseholdContext>({
    household: null,
    currentMember: null,
    members: [],
    isAdmin: false,
  });
  const [newHouseholdName, setNewHouseholdName] = useState('');

  const loadHouseholdInfo = useCallback(async () => {
    try {
      const context = await HouseholdService.getUserHouseholdContext();
      setHouseholdContext(context);
      if (context.household) {
        setNewHouseholdName(context.household.name);
      }
    } catch (error) {
      console.error('Error loading household info:', error);
    } finally {
      setHouseholdLoading(false);
    }
  }, []);

  const shareHouseholdCode = useCallback(async () => {
    if (!householdContext.household) return;

    try {
      await Share.share({
        message: `Join my household "${householdContext.household.name}" in Rooted!\n\nUse code: ${householdContext.household.id}\n\nDownload Rooted to track your plants together!`,
        title: 'Join My Household in Rooted',
      });
    } catch (error) {
      console.error('Error sharing household code:', error);
    }
  }, [householdContext.household]);

  const copyHouseholdCode = useCallback(async () => {
    if (!householdContext.household) return;

    await Clipboard.setString(householdContext.household.id);
    showAlert('Copied!', 'Household code copied to clipboard');
  }, [householdContext.household]);

  const editHouseholdName = useCallback(async (): Promise<boolean> => {
    if (!newHouseholdName.trim()) {
      showAlert('Error', 'Please enter a household name');
      return false;
    }

    setLoading(true);
    try {
      await HouseholdService.updateHouseholdName(newHouseholdName.trim());
      await loadHouseholdInfo();
      return true;
    } catch (error) {
      console.error('Error updating household name:', error);
      showAlert('Error', error instanceof Error ? error.message : 'Failed to update household name');
      return false;
    } finally {
      setLoading(false);
    }
  }, [newHouseholdName, loadHouseholdInfo]);

  const regenerateCode = useCallback(() => {
    showAlert(
      'Regenerate Household Code',
      'This will create a new code and invalidate the old one. Anyone with the old code will no longer be able to join. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const newCode = await HouseholdService.regenerateHouseholdCode();
              await loadHouseholdInfo();
              showAlert(
                'Code Regenerated',
                `Your new household code is: ${newCode}\n\nMake sure to share the new code with your household members.`
              );
            } catch (error) {
              console.error('Error regenerating code:', error);
              showAlert('Error', error instanceof Error ? error.message : 'Failed to regenerate code');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [loadHouseholdInfo]);

  const removeMember = useCallback(
    (member: HouseholdMember) => {
      showAlert(
        'Remove Member',
        `Are you sure you want to remove ${member.user_name} from this household?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              try {
                await HouseholdService.removeMember(member.id);
                await loadHouseholdInfo();
              } catch (error) {
                console.error('Error removing member:', error);
                showAlert('Error', error instanceof Error ? error.message : 'Failed to remove member');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    },
    [loadHouseholdInfo]
  );

  const toggleMemberRole = useCallback(
    (member: HouseholdMember) => {
      const newRole = member.role === 'admin' ? 'member' : 'admin';
      const action = newRole === 'admin' ? 'promote' : 'demote';

      showAlert(
        `${action === 'promote' ? 'Promote' : 'Demote'} Member`,
        `${action === 'promote' ? 'Give admin privileges to' : 'Remove admin privileges from'} ${member.user_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: action === 'promote' ? 'Promote' : 'Demote',
            onPress: async () => {
              setLoading(true);
              try {
                await HouseholdService.updateMemberRole(member.id, newRole);
                await loadHouseholdInfo();
              } catch (error) {
                console.error('Error updating member role:', error);
                showAlert('Error', error instanceof Error ? error.message : 'Failed to update member role');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    },
    [loadHouseholdInfo]
  );

  const leaveHousehold = useCallback(() => {
    showAlert(
      'Leave Household',
      'Are you sure you want to leave this household? You will need a new invitation code to rejoin.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await HouseholdService.leaveHousehold();
              router.replace('/welcome');
            } catch (error) {
              console.error('Error leaving household:', error);
              showAlert('Error', error instanceof Error ? error.message : 'Failed to leave household');
              setLoading(false);
            }
          },
        },
      ]
    );
  }, []);

  return {
    householdContext,
    loading,
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
  };
};
