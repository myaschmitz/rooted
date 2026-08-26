import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useTheme } from './ThemeContext';

type ModalScreen =
  | 'add-plant'
  | 'edit-plant'
  | 'log-care'
  | 'edit-care-event'
  | 'event'
  | 'add-tag'
  | 'edit-tag'
  | 'propagate'
  | 'link-propagation';

interface WebModalState {
  screen: ModalScreen;
  params: Record<string, string>;
}

interface WebModalContextValue {
  /** Open a screen as a modal. Returns true if opened as modal, false if caller should navigate normally. */
  openModal: (screen: ModalScreen, params?: Record<string, string>) => boolean;
  closeModal: () => void;
  /** True if the current component is rendered inside a web modal */
  isInModal: boolean;
  /** Params passed to the modal screen */
  modalParams: Record<string, string>;
}

const WebModalContext = createContext<WebModalContextValue>({
  openModal: () => false,
  closeModal: () => {},
  isInModal: false,
  modalParams: {},
});

export function useWebModal() {
  return useContext(WebModalContext);
}

// Use synchronous require() to avoid Metro's async bundle fetching on web,
// deferred to render time to avoid circular dependency at module load.
function getScreenComponent(screen: ModalScreen): React.ComponentType<any> {
  switch (screen) {
    case 'add-plant': return require('../app/add-plant').default;
    case 'edit-plant': return require('../app/edit-plant').default;
    case 'log-care': return require('../app/log-care').default;
    case 'edit-care-event': return require('../app/edit-care-event').default;
    case 'event': return require('../app/event/[id]').default;
    case 'add-tag': return require('../app/add-tag').default;
    case 'edit-tag': return require('../app/edit-tag').default;
    case 'propagate': return require('../app/propagate').default;
    case 'link-propagation': return require('../app/link-propagation').default;
  }
}

// Inner context to mark children as being inside a modal
const ModalContentContext = createContext<{
  isInModal: boolean;
  params: Record<string, string>;
  closeModal: () => void;
}>({ isInModal: false, params: {}, closeModal: () => {} });

export function useModalContent() {
  return useContext(ModalContentContext);
}

export function WebModalProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = useState<WebModalState | null>(null);
  const { isWide } = useBreakpoint();
  const { theme } = useTheme();
  const isDesktopWeb = Platform.OS === 'web' && isWide;

  const openModal = useCallback(
    (screen: ModalScreen, params: Record<string, string> = {}) => {
      if (!isDesktopWeb) return false;
      setModalState({ screen, params });
      return true;
    },
    [isDesktopWeb]
  );

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  const ScreenComponent = modalState ? getScreenComponent(modalState.screen) : null;

  return (
    <WebModalContext.Provider
      value={{
        openModal,
        closeModal,
        isInModal: false,
        modalParams: {},
      }}
    >
      {children}

      {modalState && ScreenComponent && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={closeModal}
        >
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.modalCard,
                { backgroundColor: theme.colors.background },
              ]}
            >
              <ModalContentContext.Provider
                value={{
                  isInModal: true,
                  params: modalState.params,
                  closeModal,
                }}
              >
                  <ScreenComponent />
              </ModalContentContext.Provider>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </WebModalContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '90%',
    maxWidth: 600,
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
