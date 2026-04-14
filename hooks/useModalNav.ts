import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useModalContent } from '../contexts/WebModalContext';

/**
 * Returns a dismiss function that closes the modal if inside one,
 * or calls router.back() if navigated normally.
 */
export function useModalDismiss() {
  const { isInModal, closeModal } = useModalContent();

  const dismiss = useCallback(() => {
    if (isInModal) {
      closeModal();
    } else {
      router.back();
    }
  }, [isInModal, closeModal]);

  return dismiss;
}

/**
 * Returns route params from either the modal context or expo-router's useLocalSearchParams.
 * When rendered inside a web modal, params come from the modal context.
 * When rendered as a normal page, params come from the URL.
 */
export function useModalParams<T extends Record<string, string>>(): T {
  const { isInModal, params } = useModalContent();
  const routeParams = useLocalSearchParams<T>();

  if (isInModal && Object.keys(params).length > 0) {
    return params as T;
  }

  return routeParams as T;
}

/**
 * Returns a navigate function that replaces router.replace when in a modal.
 * In a modal, it closes the modal and then navigates.
 * As a normal page, calls router.replace directly.
 */
export function useModalReplace() {
  const { isInModal, closeModal } = useModalContent();

  const replace = useCallback(
    (path: string) => {
      if (isInModal) {
        closeModal();
        // Small delay so modal closes before navigation
        setTimeout(() => router.push(path), 50);
      } else {
        router.replace(path);
      }
    },
    [isInModal, closeModal]
  );

  return replace;
}
