import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { HouseholdService } from '../services/HouseholdService';
import { useTheme } from '../contexts/ThemeContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkHouseholdMembership();
  }, []);

  const checkHouseholdMembership = async () => {
    try {
      const isInHousehold = await HouseholdService.isUserInHousehold();
      
      if (isInHousehold) {
        setIsAuthenticated(true);
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Error checking household membership:', error);
      router.replace('/welcome');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}