import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { DatabaseService } from '../../services/DatabaseService';

export default function SettingsScreen() {
  const handleResetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'This will delete all your plants, photos, and care events. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.resetDatabase();
              Alert.alert('Success', 'Database has been reset');
            } catch (error) {
              console.error('Failed to reset database:', error);
              Alert.alert('Error', 'Failed to reset database');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Actions</Text>
        
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/add-plant')}
        >
          <Text style={styles.buttonText}>Add New Plant</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database</Text>
        
        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={handleResetDatabase}
        >
          <Text style={[styles.buttonText, styles.dangerButtonText]}>Reset Database</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>
          Plant Care Tracker v1.0{'\n'}
          Track your plants, log care events, and keep your green friends healthy!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginBottom: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: '#F44336',
  },
  dangerButtonText: {
    color: 'white',
  },
  aboutText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
