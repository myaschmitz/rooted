import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { PlantThumbnail } from '../../components/PlantThumbnail';
import { useTheme } from '../../contexts/ThemeContext';

// Mock dependencies
jest.mock('../../contexts/ThemeContext');
jest.mock('expo-image', () => ({
  Image: ({ onLoad, onError, source, ...props }: any) => {
    const MockImage = require('react-native').Image;
    return (
      <MockImage 
        {...props}
        source={source}
        testID="expo-image"
        onLoad={onLoad}
        onError={onError}
      />
    );
  },
}));

// Mock Lucide React Native icons
jest.mock('lucide-react-native', () => ({
  Flower2: ({ size, color, ...props }: any) => {
    const MockView = require('react-native').View;
    return (
      <MockView 
        testID="flower-icon" 
        accessibilityLabel={`Flower icon, size: ${size}, color: ${color}`}
        {...props}
      />
    );
  },
}));

const mockTheme = {
  colors: {
    primary: '#007AFF',
    surfaceSecondary: '#F2F2F7',
    text: '#000000',
  },
};

describe('PlantThumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useTheme hook
    (useTheme as jest.Mock).mockReturnValue({
      theme: mockTheme,
    });

  });

  it('renders default icon when no imageUri provided', () => {
    const { getByTestId } = render(<PlantThumbnail />);
    
    expect(getByTestId('flower-icon')).toBeTruthy();
    expect(getByTestId('flower-icon')).toHaveProp('accessibilityLabel', 'Flower icon, size: 30, color: #007AFF');
  });

  it('renders default icon with custom size', () => {
    const { getByTestId } = render(<PlantThumbnail size={80} />);
    
    expect(getByTestId('flower-icon')).toBeTruthy();
    expect(getByTestId('flower-icon')).toHaveProp('accessibilityLabel', 'Flower icon, size: 40, color: #007AFF');
  });

  it('renders image when imageUri is provided', async () => {
    const { getByTestId, queryByTestId } = render(
      <PlantThumbnail imageUri="https://example.com/plant.jpg" />
    );

    await waitFor(() => {
      expect(getByTestId('expo-image')).toBeTruthy();
    });

    expect(queryByTestId('flower-icon')).toBeNull();
  });

  it('falls back to icon when image fails to load', async () => {
    const { getByTestId, queryByTestId } = render(
      <PlantThumbnail imageUri="https://example.com/broken-image.jpg" />
    );

    await waitFor(() => {
      expect(getByTestId('expo-image')).toBeTruthy();
    });

    const image = getByTestId('expo-image');
    
    // Simulate image load error
    fireEvent(image, 'onError');

    await waitFor(() => {
      expect(queryByTestId('expo-image')).toBeNull();
      expect(getByTestId('flower-icon')).toBeTruthy();
    });
  });

  it('uses provided URI directly', async () => {
    const { getByTestId } = render(
      <PlantThumbnail imageUri="https://example.com/plant.jpg" />
    );

    await waitFor(() => {
      const image = getByTestId('expo-image');
      expect(image).toHaveProp('source', { uri: 'https://example.com/plant.jpg' });
    });
  });

  it('applies correct styles with custom size', async () => {
    const { getByTestId } = render(
      <PlantThumbnail imageUri="https://example.com/plant.jpg" size={100} />
    );

    await waitFor(() => {
      const image = getByTestId('expo-image');
      expect(image.props.style).toMatchObject({
        width: 100,
        height: 100,
        borderRadius: 8,
      });
    });
  });

  it('applies theme colors correctly', () => {
    const customTheme = {
      colors: {
        primary: '#FF6B35',
        surfaceSecondary: '#F0F0F0',
        text: '#333333',
      },
    };

    (useTheme as jest.Mock).mockReturnValue({
      theme: customTheme,
    });

    const { getByTestId } = render(<PlantThumbnail />);
    
    expect(getByTestId('flower-icon')).toHaveProp('accessibilityLabel', 'Flower icon, size: 30, color: #FF6B35');
  });

  it('handles size prop correctly for icon scaling', () => {
    const { getByTestId } = render(<PlantThumbnail size={120} />);
    
    // Icon should be 50% of the container size (120 * 0.5 = 60)
    expect(getByTestId('flower-icon')).toHaveProp('accessibilityLabel', 'Flower icon, size: 60, color: #007AFF');
  });
});