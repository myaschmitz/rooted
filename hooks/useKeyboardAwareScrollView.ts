import { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Keyboard, 
  ScrollView, 
  TextInput, 
  Platform,
  Dimensions,
  KeyboardEvent,
} from 'react-native';

interface KeyboardAwareScrollViewConfig {
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
}

export function useKeyboardAwareScrollView(
  config: KeyboardAwareScrollViewConfig = {}
) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const currentlyFocusedInput = useRef<TextInput | null>(null);
  const scrollOffset = useRef(0);
  
  const {
    extraScrollHeight = 80,
    enableOnAndroid = true,
  } = config;

  // Track current scroll position
  const handleScroll = useCallback((event: any) => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      handleKeyboardShow
    );
    
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  const handleKeyboardShow = (event: KeyboardEvent) => {
    if (!enableOnAndroid && Platform.OS === 'android') return;
    
    const { height: keyboardHeight } = event.endCoordinates;
    setKeyboardHeight(keyboardHeight);
    setKeyboardVisible(true);

    // Scroll to focused input after keyboard is shown
    setTimeout(() => {
      scrollToFocusedInput(keyboardHeight);
    }, Platform.OS === 'ios' ? 100 : 200);
  };

  const handleKeyboardHide = () => {
    setKeyboardHeight(0);
    setKeyboardVisible(false);
  };

  const scrollToFocusedInput = (keyboardHeight: number) => {
    if (!currentlyFocusedInput.current || !scrollViewRef.current) return;

    currentlyFocusedInput.current.measureInWindow((x, y, width, height) => {
      const screenHeight = Dimensions.get('window').height;
      const inputBottomY = y + height;
      const keyboardTopY = screenHeight - keyboardHeight;
      
      // Calculate how much the input is covered by keyboard
      const overlap = inputBottomY - keyboardTopY;
      
      if (overlap > 0) {
        // Calculate new scroll position
        const newScrollY = scrollOffset.current + overlap + extraScrollHeight;
        
        scrollViewRef.current?.scrollTo({
          y: newScrollY,
          animated: true,
        });
      }
    });
  };

  const handleInputFocus = (inputRef: TextInput) => {
    currentlyFocusedInput.current = inputRef;
    
    // If keyboard is already visible, scroll immediately
    if (keyboardVisible && keyboardHeight > 0) {
      setTimeout(() => {
        scrollToFocusedInput(keyboardHeight);
      }, 150);
    }
  };

  const handleInputBlur = () => {
    currentlyFocusedInput.current = null;
  };

  return {
    scrollViewRef,
    keyboardHeight,
    keyboardVisible,
    handleInputFocus,
    handleInputBlur,
    handleScroll,
  };
}