import { useEffect, useRef } from 'react';

/**
 * Traps keyboard focus within an active dialog modal and handles Escape key closing.
 *
 * @param {boolean} isOpen - Whether the dialog is currently visible
 * @param {Function} onClose - Callback invoked when Escape key is pressed
 * @returns {React.RefObject} Ref to attach to the dialog's root container
 */
export function useDialogFocusTrap(isOpen, onClose) {
  const containerRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus on first input or interactive field (only if focus is not already inside)
    const timer = setTimeout(() => {
      if (containerRef.current) {
        // If the user already focused an input inside the dialog, do not steal focus!
        if (containerRef.current.contains(document.activeElement)) {
          return;
        }

        const primaryInput = containerRef.current.querySelector(
          'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
        );
        if (primaryInput) {
          primaryInput.focus();
        } else {
          const firstFocusable = containerRef.current.querySelector(
            'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (firstFocusable) firstFocusable.focus();
        }
      }
    }, 40);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        try {
          previousActiveElementRef.current.focus();
        } catch {
          // ignore if previous element no longer exists
        }
      }
    };
  }, [isOpen]);

  return containerRef;
}

