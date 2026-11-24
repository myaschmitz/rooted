import React, { createContext, useContext, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme, Theme } from "./ThemeContext";
import { formStyles } from "../styles/FormStyles";

interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
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
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: undefined,
    buttons: [],
  });

  const showAlert = useCallback(
    (title: string, message?: string, buttons?: AlertButton[]) => {
      setAlert({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: "OK", style: "default" }],
      });
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    setAlert((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleButtonPress = useCallback(
    (button: AlertButton) => {
      // Queue the dismiss first so React batches it with any showAlert call
      // that `onPress` may make synchronously — that way the modal updates in
      // place without a fade-out/fade-in flash. For async `onPress`, the
      // dismiss commits immediately, the modal fades out via its own
      // animation, and any later showAlert() naturally re-opens it.
      handleDismiss();
      button.onPress?.();
    },
    [handleDismiss],
  );

  const getButtonStyle = (button: AlertButton) => {
    if (button.style === "destructive") {
      return [
        styles.button,
        { backgroundColor: theme.colors.error || "#F44336" },
      ];
    }
    if (button.style === "cancel") {
      return [styles.button, { backgroundColor: theme.colors.surfaceSecondary }];
    }
    return [styles.button, { backgroundColor: theme.colors.primary }];
  };

  const getButtonTextStyle = (button: AlertButton) => {
    if (button.style === "destructive") {
      return [styles.buttonText, { color: "#FFFFFF" }];
    }
    if (button.style === "cancel") {
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

            {alert.message ? (
              <Text style={styles.message}>{alert.message}</Text>
            ) : null}

            <View
              style={
                alert.buttons.length > 2
                  ? styles.buttonColumn
                  : styles.buttonRow
              }
            >
              {alert.buttons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    getButtonStyle(button),
                    alert.buttons.length > 2
                      ? styles.buttonStacked
                      : styles.buttonRowItem,
                  ]}
                  onPress={() => handleButtonPress(button)}
                >
                  <Text style={getButtonTextStyle(button)} numberOfLines={1}>
                    {button.text}
                  </Text>
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
    overlay: formStyles(theme).dialogOverlay,
    modal: { ...formStyles(theme).dialogCard, maxWidth: Platform.OS === 'web' ? 400 : 340 },
    title: formStyles(theme).dialogTitle,
    message: formStyles(theme).dialogMessage,
    buttonRow: { flexDirection: 'row', gap: 10 },
    buttonColumn: { flexDirection: 'column', gap: 10 },
    buttonStacked: {
      alignSelf: "stretch",
    },
    buttonRowItem: {
      flex: 1,
    },
    button: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48, ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}) },
    buttonText: {
      fontSize: 16,
      fontWeight: "600",
    },
  });
