import React, { forwardRef, useRef, useCallback } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  TextInput,
} from 'react-native';
import { useKeyboardAwareScrollView } from '../hooks/useKeyboardAwareScrollView';

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  extraScrollHeight?: number;
  enableOnAndroid?: boolean;
  keyboardVerticalOffset?: number;
  disableKeyboardAvoidingView?: boolean;
}

const KeyboardAwareScrollView = forwardRef<ScrollView, KeyboardAwareScrollViewProps>(
  (
    {
      children,
      extraScrollHeight = 50,
      enableOnAndroid = true,
      keyboardVerticalOffset = Platform.OS === 'ios' ? 100 : 0,
      disableKeyboardAvoidingView = false,
      style,
      contentContainerStyle,
      ...scrollViewProps
    },
    ref
  ) => {
    const { scrollViewRef, handleInputFocus, handleInputBlur, handleScroll } = useKeyboardAwareScrollView({
      extraScrollHeight,
      enableOnAndroid,
    });

    // Create a map to store TextInput refs
    const inputRefs = useRef<Map<string, TextInput>>(new Map());
    let inputCounter = useRef(0);

    const registerInput = useCallback((input: TextInput, inputId: string) => {
      if (input) {
        inputRefs.current.set(inputId, input);
      }
    }, []);

    const unregisterInput = useCallback((inputId: string) => {
      inputRefs.current.delete(inputId);
    }, []);

    // Clone children to add focus handlers
    const enhancedChildren = React.Children.map(children, (child) => {
      return enhanceInputs(child, handleInputFocus, handleInputBlur, registerInput, unregisterInput, inputCounter);
    });

    const scrollViewContent = (
      <ScrollView
        ref={ref || scrollViewRef}
        style={[styles.scrollView, style]}
        contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        {...scrollViewProps}
      >
        {enhancedChildren}
      </ScrollView>
    );

    if (disableKeyboardAvoidingView) {
      return scrollViewContent;
    }

    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {scrollViewContent}
      </KeyboardAvoidingView>
    );
  }
);

// Helper function to recursively enhance TextInput components
function enhanceInputs(
  element: React.ReactNode,
  onFocus: (input: TextInput) => void,
  onBlur: () => void,
  registerInput: (input: TextInput, inputId: string) => void,
  unregisterInput: (inputId: string) => void,
  inputCounter: React.MutableRefObject<number>
): React.ReactNode {
  if (!React.isValidElement(element)) {
    return element;
  }

  // Check if it's a TextInput by checking the displayName or component type
  const isTextInput = element.type === TextInput || 
                     (element.type as any)?.displayName === 'TextInput' ||
                     (element.type as any)?.name === 'TextInput';

  if (isTextInput) {
    const inputId = `input_${inputCounter.current++}`;
    
    return React.cloneElement(element as React.ReactElement<any>, {
      ref: (input: TextInput) => {
        if (input) {
          registerInput(input, inputId);
        } else {
          unregisterInput(inputId);
        }
        // Call original ref if it exists
        if (element.ref) {
          if (typeof element.ref === 'function') {
            element.ref(input);
          } else {
            element.ref.current = input;
          }
        }
      },
      onFocus: (e: any) => {
        // Call original onFocus if it exists
        if (element.props.onFocus) {
          element.props.onFocus(e);
        }
        // Get the TextInput reference and pass it to our handler
        const input = e.target as TextInput;
        if (input) {
          onFocus(input);
        }
      },
      onBlur: (e: any) => {
        // Call original onBlur if it exists
        if (element.props.onBlur) {
          element.props.onBlur(e);
        }
        // Add our blur handling
        onBlur();
      },
    });
  }

  // If it has children, recursively enhance them
  if (element.props?.children) {
    const enhancedChildren = React.Children.map(
      element.props.children,
      (child) => enhanceInputs(child, onFocus, onBlur, registerInput, unregisterInput, inputCounter)
    );

    return React.cloneElement(element as React.ReactElement<any>, {
      ...element.props,
      children: enhancedChildren,
    });
  }

  return element;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 40, // Extra bottom padding for keyboard
  },
});

KeyboardAwareScrollView.displayName = 'KeyboardAwareScrollView';

export default KeyboardAwareScrollView;