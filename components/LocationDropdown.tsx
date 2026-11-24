import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LocationService, PlantLocation } from '../services/LocationService';
import { useTheme } from '../contexts/ThemeContext';
import { BaseColors } from '../styles/theme';
import { ChevronDown, X, MapPin, Plus } from 'lucide-react-native';

import { formStyles } from '../styles/FormStyles';
interface LocationDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  style?: any;
}

export default function LocationDropdown({ 
  value, 
  onValueChange, 
  placeholder = "Select or enter location",
  style 
}: LocationDropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<PlantLocation[]>([]);

  useEffect(() => {
    let active = true;

    const loadLocations = async () => {
      try {
        const allLocations = await LocationService.getAllLocations();
        if (active) setLocations(allLocations);
      } catch (error) {
        console.error('Failed to load locations:', error);
      }
    };

    loadLocations();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    filterLocations();
  }, [searchQuery, locations]);

  const filterLocations = () => {
    if (!searchQuery.trim()) {
      setFilteredLocations(locations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = locations.filter(location =>
      location.name.toLowerCase().includes(query)
    );
    setFilteredLocations(filtered);
  };

  const handleLocationSelect = (locationName: string) => {
    onValueChange(locationName);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      onValueChange(searchQuery.trim());
      setSearchQuery('');
      setIsOpen(false);
    }
  };

  const openDropdown = () => {
    setIsOpen(true);
    setSearchQuery('');
  };

  const styles = createStyles(theme);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={openDropdown}
      >
        <Text style={[
          styles.dropdownText,
          !value && styles.placeholderText
        ]}>
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={theme.colors.textTertiary} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <X size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search or type new location..."
                autoFocus={true}
                autoCapitalize="words"
              />
            </View>

            <ScrollView style={styles.locationsList} keyboardShouldPersistTaps="handled">
              {/* Show create new option if search query doesn't match existing */}
              {searchQuery.trim() && 
               !filteredLocations.some(loc => 
                 loc.name.toLowerCase() === searchQuery.toLowerCase().trim()
               ) && (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={handleCreateNew}
                >
                  <View style={styles.locationInfo}>
                    <Text style={styles.createNewText}>
                      Create "{searchQuery.trim()}"
                    </Text>
                    <Text style={styles.createNewSubtext}>New location</Text>
                  </View>
                  <Plus size={20} color={theme.colors.primary} />
                </TouchableOpacity>
              )}

              {/* Show existing locations */}
              {filteredLocations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={styles.locationItem}
                  onPress={() => handleLocationSelect(location.name)}
                >
                  <View style={styles.locationInfo}>
                    <Text style={styles.locationName}>{location.name}</Text>
                    <Text style={styles.locationCount}>
                      {location.plant_count} plant{location.plant_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <MapPin size={18} color={theme.colors.textTertiary} />
                </TouchableOpacity>
              ))}

              {filteredLocations.length === 0 && !searchQuery.trim() && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No locations yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Start typing to create your first location
                  </Text>
                </View>
              )}

              {filteredLocations.length === 0 && searchQuery.trim() && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No matching locations</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Tap "Create" above to add this location
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdownButton: { ...formStyles(theme).input, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  placeholderText: {
    color: theme.colors.textTertiary,
  },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  keyboardAvoidingView: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 440 },
  modalContent: { backgroundColor: theme.colors.surface, borderRadius: 20, maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 20, paddingRight: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  modalTitle: formStyles(theme).sheetTitle,
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: { ...formStyles(theme).input, backgroundColor: theme.colors.surfaceSecondary, borderColor: 'transparent' },
  locationsList: { maxHeight: 320, paddingHorizontal: 16, paddingBottom: 8 },
  locationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  locationInfo: {
    flex: 1,
  },
  locationName: { fontSize: 16, color: theme.colors.text },
  locationCount: { fontSize: 13, color: theme.colors.textTertiary, marginTop: 1 },
  createNewText: { fontSize: 16, fontWeight: '600', color: theme.colors.primary },
  createNewSubtext: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
  emptyState: { paddingVertical: 32, paddingHorizontal: 16, alignItems: 'center', gap: 4 },
  emptyStateText: { fontSize: 15, fontWeight: '600', color: theme.colors.textSecondary },
  emptyStateSubtext: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
