import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useBrand } from './brand';

/** Pick black or white text for readable contrast on an arbitrary background. */
function readableText(hex: string): string {
  const c = hex.replace('#', '');
  const full = c.length === 3 ? c.split('').map((x) => x + x).join('') : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? '#11181F' : '#FFFFFF';
}

/** The notify-plus logo: a simple "n" on the user-chosen background color. */
export function Logo({ size = 40, color }: { size?: number; color?: string }): React.JSX.Element {
  const { logoColor } = useBrand();
  const bg = color ?? logoColor;
  const fg = readableText(bg);
  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius: size * 0.28, backgroundColor: bg },
      ]}>
      <Text
        style={{
          color: fg,
          fontSize: size * 0.64,
          fontWeight: '800',
          lineHeight: size * 0.74,
          includeFontPadding: false,
          textAlign: 'center',
          ...Platform.select({ android: { textAlignVertical: 'center' as const } }),
        }}>
        n
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
});
