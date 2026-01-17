import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings';

export function useFontSizeEffect() {
  const fontSizeScale = useSettingsStore((state) => state.fontSizeScale);

  useEffect(() => {
    // We scale the base font size (16px default)
    // 1rem = 16px * scale
    const baseSize = 16 * fontSizeScale;
    document.documentElement.style.fontSize = `${baseSize}px`;
  }, [fontSizeScale]);
}
