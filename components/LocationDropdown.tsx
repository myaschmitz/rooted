import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { LocationService, PlantLocation } from '../services/LocationService';

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
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState<PlantLocation[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<PlantLocation[]>([]);

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    filterLocations();
  }, [searchQuery, locations]);

  const loadLocations = async () => {
    try {
      const allLocations = await LocationService.getAllLocations();
      setLocations(allLocations);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

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
    setSearchQuery(value);
  };

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
        <Text style={styles.dropdownArrow}>▼</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
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
                  <Text style={styles.createIcon}>+</Text>
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
                  <Text style={styles.selectIcon}>📍</Text>
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
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dropdownButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  locationsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  locationCount: {
    fontSize: 14,
    color: '#666',
  },
  createNewText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4CAF50',
    marginBottom: 2,
  },
  createNewSubtext: {
    fontSize: 14,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  selectIcon: {
    fontSize: 18,
    marginLeft: 10,
  },
  createIcon: {
    fontSize: 24,
    color: '#4CAF50',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
