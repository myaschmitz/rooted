import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MonitoringService } from '../services/MonitoringService';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary error details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
    MonitoringService.captureException(error, {
      componentStack: errorInfo.componentStack,
    });
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          onRestart={this.handleRestart}
          errorMessage={this.state.error?.message}
        />
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({ onRestart, errorMessage }: {
  onRestart: () => void;
  errorMessage?: string;
}) {
  const { theme } = useTheme();
  const [showDetails, setShowDetails] = React.useState(false);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonSecondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonText: {
      color: theme.colors.textOnPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: theme.colors.text,
    },
    detailsText: {
      marginTop: 20,
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Oops! Something went wrong</Text>
      <Text style={styles.message}>
        The app encountered an unexpected error during startup.{'\n\n'}
        This might be related to cache initialization. Try restarting the app.
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onRestart}>
          <Text style={styles.buttonText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => setShowDetails(!showDetails)}
        >
          <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
            {showDetails ? 'Hide Details' : 'Details'}
          </Text>
        </TouchableOpacity>
      </View>
      {showDetails && (
        <Text style={styles.detailsText}>
          Error: {errorMessage || 'Unknown error'}{'\n\n'}
          This might be a cache initialization issue. Try restarting the app or clearing app data.
        </Text>
      )}
    </View>
  );
}