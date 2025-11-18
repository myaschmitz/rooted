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
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      marginVertical: 4,
      marginHorizontal: 16,
      alignItems: 'center',
    },
    thumbnail: {
      width: 65,
      height: 65,
      borderRadius: 8,
      marginRight: 12,
    },
    content: {
      flex: 1,
      gap: 8,
    },
    actions: {
      width: 32,
      alignItems: 'center',
      gap: 4,
    },
  });

  return (
    <View style={[styles.container, style]}>
      <Skeleton width={65} height={65} borderRadius={8} style={styles.thumbnail} />
      <View style={styles.content}>
        <Skeleton width="70%" height={18} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="90%" height={14} />
      </View>
      <View style={styles.actions}>
        <Skeleton width={16} height={16} borderRadius={8} />
        <Skeleton width={14} height={14} borderRadius={7} />
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