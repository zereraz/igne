import FocusTrap from 'focus-trap-react';
import type { ReactNode } from 'react';

interface FocusTrapWrapperProps {
  children: ReactNode;
  active?: boolean;
}

/**
 * Thin wrapper around focus-trap-react for modal dialogs.
 * Prevents keyboard focus from escaping the modal while it's open.
 */
export function FocusTrapWrapper({ children, active = true }: FocusTrapWrapperProps) {
  return (
    <FocusTrap
      active={active}
      focusTrapOptions={{
        escapeDeactivates: false,   // modals handle Escape themselves
        allowOutsideClick: true,    // overlay click-to-close still works
        fallbackFocus: '[role="dialog"]',
      }}
    >
      {children}
    </FocusTrap>
  );
}
