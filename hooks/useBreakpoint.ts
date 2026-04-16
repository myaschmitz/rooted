import { useWindowDimensions, Platform } from 'react-native';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

export function useBreakpoint() {
  const { width: rnWidth } = useWindowDimensions();

  // On web, useWindowDimensions can return 0 during initial hydration/refresh,
  // causing the sidebar to not render. Fall back to window.innerWidth.
  const width =
    rnWidth === 0 && Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.innerWidth
      : rnWidth;

  const breakpoint: Breakpoint =
    width >= 1024 ? 'desktop' : width >= 768 ? 'tablet' : 'mobile';

  return {
    width,
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: width >= 768, // tablet or desktop
    /** Wide enough for sidebar + content + detail panel side-by-side */
    canShowSidePanel: width >= 1200,
  };
}
