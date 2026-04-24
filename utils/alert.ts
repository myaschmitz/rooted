import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert that works on both native (iOS/Android) and web.
 * On web, Alert.alert is a no-op, so we fall back to window.confirm/window.alert.
 */
export function crossPlatformAlert(
  title: string,
  message?: string,
  buttons?: Array<{
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
  }>
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  // Web fallback
  if (!buttons || buttons.length === 0) {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  const cancelButton = buttons.find((b) => b.style === 'cancel');
  const actionButton = buttons.find((b) => b.style !== 'cancel');

  if (actionButton && cancelButton) {
    // Confirmation dialog
    const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
    if (confirmed) {
      actionButton.onPress?.();
    } else {
      cancelButton.onPress?.();
    }
  } else if (buttons.length === 1) {
    window.alert(message ? `${title}\n\n${message}` : title);
    buttons[0].onPress?.();
  } else {
    // Multiple non-cancel buttons: just use confirm for the first action
    const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
    if (confirmed && actionButton) {
      actionButton.onPress?.();
    }
  }
}
