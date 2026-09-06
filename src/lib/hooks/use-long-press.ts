"use client";

import { useCallback, useRef } from "react";

const LONG_PRESS_MS = 400;

interface UseLongPressOptions {
  onLongPress: () => void;
  onTap?: () => void;
}

/**
 * Distinguishes a quick tap from a press-and-hold on the same element, so a
 * photo (or the reaction button) can both react on tap and open the reaction
 * tray on hold. Also suppresses the OS "save image" menu that a long-press
 * would otherwise trigger on mobile.
 */
export function useLongPress({ onLongPress, onTap }: UseLongPressOptions) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedLongPress = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    firedLongPress.current = false;
    clear();
    timer.current = setTimeout(() => {
      firedLongPress.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [clear, onLongPress]);

  const end = useCallback(() => {
    const wasLongPress = firedLongPress.current;
    clear();
    if (!wasLongPress) onTap?.();
  }, [clear, onTap]);

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  };
}
