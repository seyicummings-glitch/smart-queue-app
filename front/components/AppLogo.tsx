import React from 'react';
import { View, Text } from 'react-native';

type Props = { size?: number };

export default function AppLogo({ size = 40 }: Props) {
  return (
    <View style={{
      width: size, height: size,
      backgroundColor: '#2563eb',
      borderRadius: size * 0.22,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    }}>
      <Text style={{
        fontSize: size * 0.55,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -1,
      }}>Q</Text>
    </View>
  );
}
