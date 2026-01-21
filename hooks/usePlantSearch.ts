import { useState, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Plant } from '../types/Plant';

const FUSE_OPTIONS = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'type', weight: 0.5 },
    { name: 'location', weight: 0.3 },
  ],
  threshold: 0.4, // Lower = more strict, higher = more fuzzy
  includeScore: true,
  minMatchCharLength: 1,
};

export interface UsePlantSearchReturn {
  searchQuery: string;
  isSearching: boolean;
  searchResults: Plant[];
  handleSearchChange: (text: string) => void;
  clearSearch: () => void;
}

export const usePlantSearch = (plants: Plant[]): UsePlantSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Create Fuse instance with plants data
  const fuse = useMemo(() => new Fuse(plants, FUSE_OPTIONS), [plants]);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return fuse.search(searchQuery.trim()).map((result) => result.item);
  }, [fuse, searchQuery]);

  // Handle search input changes
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setIsSearching(text.trim().length > 0);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  return {
    searchQuery,
    isSearching,
    searchResults,
    handleSearchChange,
    clearSearch,
  };
};
