import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { SIDEBAR_HOVER_CLOSE_DELAY } from './sidebar.constants';

export function useSidebarHover(
  enabled: boolean,
  root: RefObject<HTMLElement | null>,
) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const dismissed = useRef(false);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);
  const openPreview = useCallback(() => {
    clearTimer();
    dismissed.current = false;
    if (enabled) setPreviewOpen(true);
  }, [clearTimer, enabled]);
  const closePreview = useCallback(() => {
    clearTimer();
    dismissed.current = true;
    setPreviewOpen(false);
  }, [clearTimer]);
  const scheduleClose = useCallback(() => {
    clearTimer();
    if (!hovered.current && !focused.current) {
      timer.current = setTimeout(
        () => setPreviewOpen(false),
        SIDEBAR_HOVER_CLOSE_DELAY,
      );
    }
  }, [clearTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimer();
      setPreviewOpen(false);
      hovered.current = false;
      focused.current = false;
      dismissed.current = false;
    }
    const onEscape = (event: KeyboardEvent) => {
      if (enabled && event.key === 'Escape') closePreview();
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      clearTimer();
      window.removeEventListener('keydown', onEscape);
    };
  }, [enabled, clearTimer, closePreview]);

  return {
    previewOpen: enabled && previewOpen,
    openPreview,
    closePreview,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'touch') return;
      hovered.current = true;
      openPreview();
    },
    onPointerLeave: () => {
      hovered.current = false;
      scheduleClose();
    },
    onFocusCapture: (event: FocusEvent<HTMLElement>) => {
      focused.current = true;
      clearTimer();
      if (!root.current?.contains(event.relatedTarget as Node | null))
        dismissed.current = false;
      if (!dismissed.current && enabled) setPreviewOpen(true);
    },
    onBlurCapture: (event: FocusEvent<HTMLElement>) => {
      if (root.current?.contains(event.relatedTarget as Node | null)) return;
      focused.current = false;
      scheduleClose();
    },
  };
}
