import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  TextInput,
  Share,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { 
  ChevronDown, 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Home, 
  Users, 
  Share2, 
  Copy, 
  LogOut, 
  Settings as SettingsIcon,
  Crown,
  UserMinus,
  RefreshCw 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlantService } from '../../services/PlantService';
import { EventService } from '../../services/EventService';
import { PhotoService } from '../../services/PhotoService';
import { HouseholdService } from '../../services/HouseholdService';
import { HouseholdContext, HouseholdMember } from '../../types/Household';
import { useTheme } from '../../contexts/ThemeContext';
import { useColorScheme } from 'react-native';

const DATE_FORMATS = [
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'YYYY/MM/DD', value: 'YYYY/MM/DD' },
];

const TIME_FORMATS = [
  { label: '12-hour (AM/PM)', value: '12' },
  { label: '24-hour', value: '24' },
];

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme();
  const systemColorScheme = useColorScheme();
  const styles = createStyles(theme.colors);
  const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');
  const [timeFormat, setTimeFormat] = useState('12');
  const [loading, setLoading] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [householdLoading, setHouseholdLoading] = useState(true);
  
  // Household state
  const [householdContext, setHouseholdContext] = useState<HouseholdContext>({
    household: null,
    currentMember: null,
    members: [],
    isAdmin: false,
  });
  const [editHouseholdNameVisible, setEditHouseholdNameVisible] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [thumbnailConfirmVisible, setThumbnailConfirmVisible] = useState(false);

  // Load saved preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedDateFormat = await AsyncStorage.getItem('dateFormat');
        const savedTimeFormat = await AsyncStorage.getItem('timeFormat');
        
        if (savedDateFormat) {
          setDateFormat(savedDateFormat);
        }
        if (savedTimeFormat) {
          setTimeFormat(savedTimeFormat);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Load household information when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadHouseholdInfo();
    }, [])
  );

  const loadHouseholdInfo = async () => {
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
  };

  // Household management functions
  const handleShareHouseholdCode = async () => {
    if (!householdContext.household) return;
    
    try {
      await Share.share({
        message: `Join my household "${householdContext.household.name}" in Rooted!\n\nUse code: ${householdContext.household.id}\n\nDownload Rooted to track your plants together!`,
        title: 'Join My Household in Rooted',
      });
    } catch (error) {
      console.error('Error sharing household code:', error);
    }
  };

  const handleCopyHouseholdCode = async () => {
    if (!householdContext.household) return;
    
    await Clipboard.setString(householdContext.household.id);
    Alert.alert('Copied!', 'Household code copied to clipboard');
  };

  const handleEditHouseholdName = async () => {
    if (!newHouseholdName.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    setLoading(true);
    try {
      await HouseholdService.updateHouseholdName(newHouseholdName.trim());
      await loadHouseholdInfo();
      setEditHouseholdNameVisible(false);
    } catch (error) {
      console.error('Error updating household name:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update household name');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCode = () => {
    Alert.alert(
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
              Alert.alert(
                'Code Regenerated',
                `Your new household code is: ${newCode}\n\nMake sure to share the new code with your household members.`
              );
            } catch (error) {
              console.error('Error regenerating code:', error);
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to regenerate code');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: HouseholdMember) => {
    Alert.alert(
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
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to remove member');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleMemberRole = (member: HouseholdMember) => {
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const action = newRole === 'admin' ? 'promote' : 'demote';
    
    Alert.alert(
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
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update member role');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
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
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to leave household');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Save date format preference
  const handleDateFormatChange = async (format: string) => {
    try {
      await AsyncStorage.setItem('dateFormat', format);
      setDateFormat(format);
      setDropdownVisible(false);
    } catch (error) {
      console.error('Error saving date format:', error);
    }
  };

  const saveTimeFormat = async (format: string) => {
    try {
      await AsyncStorage.setItem('timeFormat', format);
      setTimeFormat(format);
    } catch (error) {
      console.error('Failed to save time format:', error);
      Alert.alert('Error', 'Failed to save time format setting');
    }
  };

  const handleGenerateThumbnails = () => {
    setThumbnailConfirmVisible(true);
  };

  const handleConfirmGenerateThumbnails = async () => {
    setThumbnailConfirmVisible(false);
    setLoading(true);
    try {
      const result = await PhotoService.generateThumbnailsForExistingPhotos();
      Alert.alert(
        'Thumbnails Generated',
        `Successfully created ${result.success} thumbnails.\n${result.failed} failed, ${result.skipped} skipped.\n\nYour app will now use less data when loading photos!`
      );
    } catch (error) {
      console.error('Error generating thumbnails:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to generate thumbnails');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllData = () => {
    setDeleteConfirmText('');
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'CONFIRM DELETE') {
      return;
    }
    
    setDeleteConfirmVisible(false);
    await deleteAllData();
  };

  const deleteAllData = async () => {
    setLoading(true);
    try {
      // Delete all photos first
      await PhotoService.deleteAllPhotos();
      
      // Delete all events
      await EventService.deleteAllEvents();
      
      // Delete all plants
      await PlantService.deleteAllPlants();
      
      // Clear all AsyncStorage settings
      await AsyncStorage.clear();
      
      Alert.alert(
        'Success',
        'All data has been deleted successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset preferences to defaults
              setDateFormat('MM/DD/YYYY');
              setTimeFormat('12');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to delete all data:', error);
      Alert.alert('Error', 'Failed to delete all data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (householdLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Household Information Section */}
        {householdContext.household && (
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
                  onPress={() => setEditHouseholdNameVisible(true)}
                >
                  <SettingsIcon size={16} color={theme.colors.text} />
                </TouchableOpacity>
              )}
            </View>

            {/* Household Code */}
            <View style={[styles.settingRow, { borderColor: theme.colors.border, justifyContent: 'center' }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.colors.text, marginBottom: 0 }]}>Household Code:</Text>
                <Text style={[styles.householdCode, { color: theme.colors.primary, marginTop: 0 }]}>
                  {householdContext.household.id}
                </Text>
              </View>
              <View style={[styles.householdCodeActions, { marginLeft: 16 }]}>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
                  onPress={handleCopyHouseholdCode}
                >
                  <Copy size={16} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
                  onPress={handleShareHouseholdCode}
                >
                  <Share2 size={16} color={theme.colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Admin Actions */}
            {householdContext.isAdmin && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                onPress={handleRegenerateCode}
                disabled={loading}
              >
                <RefreshCw size={16} color={theme.colors.textOnPrimary} />
                <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>
                  Regenerate Code
                </Text>
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
                      {member.role === 'admin' && (
                        <Crown size={12} color={theme.colors.primary} />
                      )}
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
                      onPress={() => handleToggleMemberRole(member)}
                      disabled={loading}
                    >
                      <Crown 
                        size={14} 
                        color={member.role === 'admin' ? theme.colors.warning : theme.colors.primary} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
                      onPress={() => handleRemoveMember(member)}
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
              onPress={handleLeaveHousehold}
              disabled={loading}
            >
              <LogOut size={16} color={theme.colors.textOnPrimary} />
              <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>
                Leave Household
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Theme Settings Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>
        
        <View style={[styles.settingRow, { borderColor: theme.colors.border }]}>
          <View style={styles.settingInfo}>
            <Palette size={20} color={theme.colors.primary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Theme</Text>
          </View>
          
          <View style={[styles.themeSelector, { backgroundColor: theme.colors.background }]}>
            {[
              { value: 'light', icon: Sun },
              { value: 'dark', icon: Moon },
              { value: 'system', icon: Monitor },
            ].map((option) => {
              const IconComponent = option.icon;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.themeOptionCompact,
                    themeMode === option.value && [styles.selectedThemeOptionCompact, { backgroundColor: theme.colors.primary }],
                  ]}
                  onPress={() => setThemeMode(option.value as 'light' | 'dark' | 'system')}
                >
                  <IconComponent 
                    size={18} 
                    color={themeMode === option.value ? theme.colors.textOnPrimary : theme.colors.text}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Date & Time Format</Text>
        
        <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Date Format</Text>
        
        {/* Dropdown for Date Format */}
        <TouchableOpacity
          style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setDropdownVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{dateFormat}</Text>
          <ChevronDown size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {/* Dropdown Modal */}
        <Modal
          visible={dropdownVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDropdownVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            onPress={() => setDropdownVisible(false)}
          >
            <View style={styles.dropdownModal}>
              {DATE_FORMATS.map((format) => (
                <TouchableOpacity
                  key={format.value}
                  style={[
                    styles.dropdownOption,
                    dateFormat === format.value && styles.selectedDropdownOption,
                  ]}
                  onPress={() => handleDateFormatChange(format.value)}
                >
                  <Text style={[
                    styles.dropdownOptionText,
                    dateFormat === format.value && styles.selectedDropdownOptionText,
                  ]}>
                    {format.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <Text style={[styles.settingLabel, { marginTop: 20 }]}>Time Format</Text>
        {TIME_FORMATS.map((format) => (
          <TouchableOpacity
            key={format.value}
            style={[
              styles.formatOption,
              timeFormat === format.value && styles.selectedFormat,
            ]}
            onPress={() => saveTimeFormat(format.value)}
          >
            <Text
              style={[
                styles.formatText,
                timeFormat === format.value && styles.selectedFormatText,
              ]}
            >
              {format.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }, loading && styles.disabledButton]}
          onPress={handleGenerateThumbnails}
          disabled={loading}
        >
          <RefreshCw size={16} color={theme.colors.textOnPrimary} />
          <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>
            {loading ? 'Generating...' : 'Generate Photo Thumbnails'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.warningText}>
          Creates smaller versions of existing photos to reduce data usage.
        </Text>
        
        <TouchableOpacity
          style={[styles.deleteButton, loading && styles.disabledButton]}
          onPress={handleDeleteAllData}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>
            {loading ? 'Deleting...' : 'Delete All Plants & Data'}
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.warningText}>
          This will permanently delete all plants, event history, photos, and settings.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Rooted - Plant Care Tracker{'\n'}
          Track your plants, log events, and keep your green friends healthy!
        </Text>
        <Text style={styles.versionText}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>

    {/* Edit Household Name Modal */}
    <Modal
      visible={editHouseholdNameVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setEditHouseholdNameVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Household Name</Text>
          
          <TextInput
            style={[styles.modalInput, { 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text 
            }]}
            value={newHouseholdName}
            onChangeText={setNewHouseholdName}
            placeholder="Enter household name"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setEditHouseholdNameVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleEditHouseholdName}
              disabled={loading}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.textOnPrimary }]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Delete Confirmation Modal */}
    <Modal
      visible={deleteConfirmVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setDeleteConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.error || '#ff4444' }]}>
            Delete All Plants & Data
          </Text>
          
          <Text style={[styles.deleteWarningText, { color: theme.colors.text }]}>
            This will permanently delete all plants, events, photos, and settings. This action cannot be undone.
          </Text>
          
          <Text style={[styles.confirmationInstructions, { color: theme.colors.text }]}>
            Type "CONFIRM DELETE" to confirm:
          </Text>
          
          <TextInput
            style={[styles.modalInput, { 
              backgroundColor: theme.colors.background,
              borderColor: deleteConfirmText === 'CONFIRM DELETE' ? theme.colors.primary : theme.colors.border,
              color: theme.colors.text 
            }]}
            value={deleteConfirmText}
            onChangeText={setDeleteConfirmText}
            placeholder="Type here..."
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="characters"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setDeleteConfirmVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.modalButton, 
                { 
                  backgroundColor: deleteConfirmText === 'CONFIRM DELETE' 
                    ? (theme.colors.error || '#ff4444') 
                    : theme.colors.disabled,
                }
              ]}
              onPress={handleConfirmDelete}
              disabled={deleteConfirmText !== 'CONFIRM DELETE' || loading}
            >
              <Text style={[styles.modalButtonText, { 
                color: deleteConfirmText === 'CONFIRM DELETE' 
                  ? theme.colors.textOnPrimary 
                  : theme.colors.textSecondary 
              }]}>
                {loading ? 'Deleting...' : 'Delete Everything'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Thumbnail Generation Confirmation Modal */}
    <Modal
      visible={thumbnailConfirmVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setThumbnailConfirmVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Generate Photo Thumbnails
          </Text>
          
          <Text style={[styles.deleteWarningText, { color: theme.colors.text }]}>
            This will create optimized thumbnail versions of existing photos to reduce data usage. This may take a few minutes.
          </Text>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
              onPress={() => setThumbnailConfirmVisible(false)}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleConfirmGenerateThumbnails}
              disabled={loading}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.textOnPrimary }]}>
                {loading ? 'Generating...' : 'Generate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  section: {
    backgroundColor: theme.surface,
    margin: 15,
    padding: 20,
    borderRadius: 10,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: theme.text,
  },
  themeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  themeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  themeButtonText: {
    fontSize: 16,
    color: theme.text,
    marginLeft: 15,
  },
  settingValue: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  button: {
    backgroundColor: theme.primary,
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
    color: theme.textOnPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  dangerButton: {
    backgroundColor: theme.danger,
  },
  dangerButtonText: {
    color: theme.textOnPrimary,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: theme.text,
  },
  formatOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  selectedFormat: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  formatText: {
    fontSize: 16,
    color: theme.text,
  },
  selectedFormatText: {
    color: theme.textOnPrimary,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    color: theme.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownModal: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    padding: 8,
    minWidth: 200,
    maxWidth: 300,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownOption: {
    padding: 12,
    borderRadius: 4,
  },
  selectedDropdownOption: {
    backgroundColor: theme.primary,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: theme.text,
    textAlign: 'center',
  },
  selectedDropdownOptionText: {
    color: theme.textOnPrimary,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: theme.danger,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: theme.disabled,
  },
  deleteButtonText: {
    color: theme.textOnPrimary,
    backgroundColor: '#F44336',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  aboutText: {
    fontSize: 16,
    color: theme.text,
    marginBottom: 5,
    lineHeight: 22,
  },
  versionText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  // Compact theme selector styles
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
  settingSubtext: {
    fontSize: 14,
    marginTop: 2,
  },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  themeOptionCompact: {
    width: 36,
    height: 36,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedThemeOptionCompact: {
    backgroundColor: theme.primary,
  },
  themeIconCompact: {
    fontSize: 16,
  },
  // Household-specific styles
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 12,
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
    borderColor: theme.border,
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
  // Modal styles
  editModal: {
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
    maxWidth: 400,
    shadowColor: theme.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  deleteWarningText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmationInstructions: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
});
