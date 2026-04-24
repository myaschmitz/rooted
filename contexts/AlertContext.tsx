import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { useTheme, Theme } from './ThemeContext';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setAlert({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK', style: 'default' }],
      });
    },
    []
  );

  const handleDismiss = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      handleDismiss();
      // Delay onPress slightly so the modal closes first
      if (button.onPress) {
        setTimeout(() => button.onPress?.(), 100);
      }
    },
    [handleDismiss]
  );

  const getButtonStyle = (button: AlertButton) => {
    if (button.style === 'destructive') {
      return [styles.button, { backgroundColor: theme.colors.error || '#F44336' }];
    }
    if (button.style === 'cancel') {
      return [styles.button, { backgroundColor: theme.colors.background }];
    }
    return [styles.button, { backgroundColor: theme.colors.primary }];
  };

  const getButtonTextStyle = (button: AlertButton) => {
    if (button.style === 'destructive') {
      return [styles.buttonText, { color: '#FFFFFF' }];
    }
    if (button.style === 'cancel') {
      return [styles.buttonText, { color: theme.colors.text }];
    }
    return [styles.buttonText, { color: theme.colors.textOnPrimary }];
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={alert.visible}
        transparent
        animationType="fade"
        onRequestClose={handleDismiss}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.title}>{alert.title}</Text>

            {alert.message ? <Text style={styles.message}>{alert.message}</Text> : null}

            <View style={styles.buttonRow}>
              {alert.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={getButtonStyle(button)}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text style={getButtonTextStyle(button)}>{button.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 24,
      minWidth: 300,
      maxWidth: Platform.OS === 'web' ? 420 : 340,
      width: '85%',
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      lineHeight: 22,
      color: theme.colors.text,
      marginBottom: 20,
      textAlign: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
