import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications, ToastType } from '@/context/NotificationContext';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

const ICON_MAP: Record<ToastType, { icon: IconName; color: string; bg: string; border: string }> = {
  queue:       { icon: 'queue',        color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  appointment: { icon: 'event',        color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  system:      { icon: 'info',         color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
  alert:       { icon: 'warning',      color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  success:     { icon: 'check-circle', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
};

const AUTO_DISMISS = 4500;

export default function NotificationToast() {
  const router        = useRouter();
  const insets        = useSafeAreaInsets();
  const { activeToast, dismissToast } = useNotifications();

  const slideY  = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeToast) return;

    // Slide in
    Animated.parallel([
      Animated.spring(slideY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    timer.current = setTimeout(slideOut, AUTO_DISMISS);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [activeToast?.id]);

  const slideOut = () => {
    if (timer.current) clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(slideY, { toValue: -160, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0,    duration: 200, useNativeDriver: true }),
    ]).start(() => {
      slideY.setValue(-160);
      opacity.setValue(0);
      dismissToast();
    });
  };

  const handleTap = () => {
    slideOut();
    setTimeout(() => router.push('/notifications' as any), 100);
  };

  if (!activeToast) return null;

  const cfg = ICON_MAP[activeToast.type] ?? ICON_MAP.system;

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { top: insets.top + 10, transform: [{ translateY: slideY }], opacity },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.card, { borderColor: cfg.border }]}
        activeOpacity={0.92}
        onPress={handleTap}
      >
        {/* Left accent bar */}
        <View style={[styles.accentBar, { backgroundColor: cfg.color }]} />

        <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
          <MaterialIcons name={cfg.icon} size={22} color={cfg.color} />
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{activeToast.title}</Text>
          <Text style={styles.body}  numberOfLines={2}>{activeToast.body}</Text>
        </View>

        <TouchableOpacity
          onPress={slideOut}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <MaterialIcons name="close" size={16} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  accentBar: {
    width: 5,
    alignSelf: 'stretch',
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 12,
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  body: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    lineHeight: 17,
  },
  closeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
