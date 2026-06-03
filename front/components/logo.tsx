import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogoProps = {
  size?: number;
  style?: ViewStyle;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Logo({ size = 48, style }: LogoProps) {
  const fontSize = Math.round(size * 0.5);
  const borderRadius = Math.round(size * 0.25);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius,
        },
        style,
      ]}
    >
      <Text style={[styles.letter, { fontSize }]}>S</Text>
    </View>
  );
}

export default Logo;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  letter: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: -1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
