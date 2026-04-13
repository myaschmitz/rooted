import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import WebContainer from '../components/WebContainer';
import { HouseholdService } from '../services/HouseholdService';
import {
  WelcomeFlowState,
  CreateHouseholdRequest,
  JoinHouseholdRequest,
} from '../types/Household';
import { useTheme } from '../contexts/ThemeContext';

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<WelcomeFlowState>({
    step: 'name',
  });
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const isInHousehold = await HouseholdService.isUserInHousehold();
      if (isInHousehold) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking household session:', error);
    }
  };

  const handleNameSubmit = () => {
    if (!state.userName?.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setState(prev => ({ ...prev, step: 'choice' }));
  };

  const handleCreateHousehold = () => {
    setState(prev => ({ ...prev, step: 'create_household', isCreating: true }));
  };

  const handleJoinHousehold = () => {
    setState(prev => ({ ...prev, step: 'join_household', isCreating: false }));
  };

  const handleCreateHouseholdSubmit = async () => {
    if (!state.householdName?.trim()) {
      Alert.alert('Error', 'Please enter a household name');
      return;
    }

    setLoading(true);
    try {
      const request: CreateHouseholdRequest = {
        householdName: state.householdName.trim(),
        adminUserName: state.userName!.trim(),
      };

      const response = await HouseholdService.createHousehold(request);
      
      Alert.alert(
        'Household Created!',
        `Your household "${state.householdName}" has been created.\n\nYour household code is: ${response.household_code}\n\nShare this code with family members so they can join your household.`,
        [
          {
            text: 'Continue',
            onPress: () => {
              setState(prev => ({ ...prev, step: 'complete' }));
              setTimeout(() => router.replace('/(tabs)'), 1000);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating household:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create household');
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Failed to create household' }));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinHouseholdSubmit = async () => {
    if (!state.householdCode?.trim()) {
      Alert.alert('Error', 'Please enter a household code');
      return;
    }

    setLoading(true);
    try {
      const validation = await HouseholdService.validateHouseholdCode(state.householdCode.trim().toUpperCase());

      if (!validation.valid) {
        Alert.alert('Invalid Code', validation.error_message || 'Household code not found');
        setState(prev => ({ ...prev, error: validation.error_message || 'Invalid household code' }));
        setLoading(false);
        return;
      }

      // Move to confirmation step instead of using Alert.alert
      setState(prev => ({
        ...prev,
        step: 'confirm_join',
        validatedHouseholdName: validation.household_name,
        error: undefined,
      }));
      setLoading(false);
    } catch (error) {
      console.error('Error validating household code:', error);
      Alert.alert('Error', 'Failed to validate household code');
      setState(prev => ({ ...prev, error: 'Failed to validate household code' }));
      setLoading(false);
    }
  };

  const handleConfirmJoin = async () => {
    setLoading(true);
    try {
      const request: JoinHouseholdRequest = {
        householdCode: state.householdCode!.trim().toUpperCase(),
        memberUserName: state.userName!.trim(),
      };

      const response = await HouseholdService.joinHousehold(request);

      if (response.success) {
        const session = await HouseholdService.getUserSession();
        const finalUserName = session?.user_name || state.userName;

        setState(prev => ({
          ...prev,
          step: 'complete',
          householdName: response.household_name || undefined,
          userName: finalUserName,
        }));
        setTimeout(() => router.replace('/(tabs)'), 1000);
      } else {
        Alert.alert('Error', response.error_message || 'Failed to join household');
        setState(prev => ({ ...prev, step: 'join_household', error: response.error_message || 'Failed to join household' }));
      }
    } catch (error) {
      console.error('Error joining household:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to join household');
      setState(prev => ({ ...prev, step: 'join_household', error: error instanceof Error ? error.message : 'Failed to join household' }));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (state.step) {
      case 'choice':
        setState(prev => ({ ...prev, step: 'name', error: undefined }));
        break;
      case 'create_household':
      case 'join_household':
        setState(prev => ({ ...prev, step: 'choice', error: undefined }));
        break;
      case 'confirm_join':
        setState(prev => ({ ...prev, step: 'join_household', error: undefined }));
        break;
      default:
        break;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
    },
    buttonSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: theme.colors.primary,
    },
    backButton: {
      position: 'absolute',
      top: insets.top + 10,
      left: 20,
      padding: 12,
      zIndex: 10,
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
    },
    errorText: {
      color: theme.colors.error || '#ff4444',
      textAlign: 'center',
      marginBottom: 20,
      fontSize: 14,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    completeContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    completeText: {
      fontSize: 24,
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: 20,
    },
    codeDisplay: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    codeText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      letterSpacing: 2,
    },
    helpText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 20,
    },
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.completeText, { marginTop: 20 }]}>
          {state.isCreating ? 'Creating your household...' : 'Joining household...'}
        </Text>
      </View>
    );
  }

  if (state.step === 'complete') {
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeText}>Welcome to {state.householdName}! 🌱</Text>
      </View>
    );
  }

  return (
    <WebContainer>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {state.step !== 'name' && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      )}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps='handled'
      >
        {state.step === 'name' && (
          <>
            <Text style={styles.title}>Welcome to Rooted</Text>
            <Text style={styles.subtitle}>Let's get you set up with your plant care household</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.textSecondary}
              value={state.userName || ''}
              onChangeText={(text) => setState(prev => ({ ...prev, userName: text }))}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={handleNameSubmit}
            />
            
            <TouchableOpacity style={styles.button} onPress={handleNameSubmit}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {state.step === 'choice' && (
          <>
            <Text style={styles.title}>Hi {state.userName}!</Text>
            <Text style={styles.subtitle}>Would you like to create a new household or join an existing one?</Text>
            
            <TouchableOpacity style={styles.button} onPress={handleCreateHousehold}>
              <Text style={styles.buttonText}>Create a Household</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={handleJoinHousehold}>
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Join a Household</Text>
            </TouchableOpacity>
          </>
        )}

        {state.step === 'create_household' && (
          <>
            <Text style={styles.title}>Create Your Household</Text>
            <Text style={styles.subtitle}>Give your household a name that everyone will recognize</Text>
            
            <TextInput
              style={styles.input}
              placeholder="e.g., Smith Family, Apartment 4B"
              placeholderTextColor={theme.colors.textSecondary}
              value={state.householdName || ''}
              onChangeText={(text) => setState(prev => ({ ...prev, householdName: text }))}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleCreateHouseholdSubmit}
            />
            
            {state.error && <Text style={styles.errorText}>{state.error}</Text>}
            
            <TouchableOpacity style={styles.button} onPress={handleCreateHouseholdSubmit}>
              <Text style={styles.buttonText}>Create Household</Text>
            </TouchableOpacity>
          </>
        )}

        {state.step === 'join_household' && (
          <>
            <Text style={styles.title}>Join a Household</Text>
            <Text style={styles.subtitle}>Enter the household code you received</Text>

            <Text style={styles.helpText}>
              Household codes are 8 characters starting with 'H' (e.g., H7K9P3M2)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g., H7K9P3M2"
              placeholderTextColor={theme.colors.textSecondary}
              value={state.householdCode || ''}
              onChangeText={(text) => setState(prev => ({ ...prev, householdCode: text.toUpperCase() }))}
              autoCapitalize="characters"
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={handleJoinHouseholdSubmit}
            />

            {state.error && <Text style={styles.errorText}>{state.error}</Text>}

            <TouchableOpacity style={styles.button} onPress={handleJoinHouseholdSubmit}>
              <Text style={styles.buttonText}>Join Household</Text>
            </TouchableOpacity>
          </>
        )}

        {state.step === 'confirm_join' && (
          <>
            <Text style={styles.title}>Confirm Join</Text>
            <Text style={styles.subtitle}>
              Do you want to join "{state.validatedHouseholdName}"?
            </Text>

            <TouchableOpacity style={styles.button} onPress={handleConfirmJoin}>
              <Text style={styles.buttonText}>Join</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleBack}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
    </WebContainer>
  );
}