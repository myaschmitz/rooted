import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

interface TextSkeletonProps {
  width?: number | string;
  height?: number;
  lines?: number;
  style?: any;
}

interface PlantCardSkeletonProps {
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style 
}) => {
  const { theme } = useTheme();
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnimation]);

  const opacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const TextSkeleton: React.FC<TextSkeletonProps> = ({ 
  width = '80%', 
  height = 16,
  lines = 1,
  style 
}) => {
  const { theme } = useTheme();
  
  if (lines === 1) {
    return <Skeleton width={width} height={height} style={style} />;
  }

  return (
    <View style={[{ gap: 8 }, style]}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : width}
          height={height}
        />
      ))}
    </View>
  );
};

export const PlantCardSkeleton: React.FC<PlantCardSkeletonProps> = ({ style }) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      marginBottom: 8,
      marginHorizontal: 16,
    },
    content: {
      flex: 1,
      gap: 8,
    },
    meta: {
      flexDirection: 'row',
      gap: 8,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Skeleton width={56} height={56} borderRadius={10} />
      <View style={styles.content}>
        <Skeleton width="55%" height={16} />
        <View style={styles.meta}>
          <Skeleton width={84} height={20} borderRadius={10} />
          <Skeleton width={56} height={14} style={{ alignSelf: 'center' }} />
        </View>
      </View>
    </View>
  );
};

export const ImageSkeleton: React.FC<{ size: number; style?: any }> = ({ 
  size, 
  style 
}) => {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius={8}
      style={style}
    />
  );
};

export const ButtonSkeleton: React.FC<{ 
  width?: number | string;
  height?: number;
  style?: any;
}> = ({ 
  width = '100%', 
  height = 48,
  style 
}) => {
  return (
    <Skeleton
      width={width}
      height={height}
      borderRadius={8}
      style={style}
    />
  );
};