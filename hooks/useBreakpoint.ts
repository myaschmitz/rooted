import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  const breakpoint: Breakpoint =
    width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

  return {
    width,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: width >= 768, // tablet or desktop
  };
}
