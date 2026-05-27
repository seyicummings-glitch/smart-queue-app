import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { MessagesProvider } from '@/context/MessagesContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationToast from '@/components/NotificationToast';

/**
 * Keeps AppContext.role in sync with the authenticated user's real role.
 * This prevents the default 'admin' value from persisting after an app
 * restart where AuthContext restores the session but AppContext is fresh.
 */
function RoleSyncer() {
  const { user, loading } = useAuth();
  const { setRole } = useAppContext();

  useEffect(() => {
    if (loading) return;
    if (!user) { setRole(null); return; }
    const r = user.role;
    setRole(r as any);
  }, [user, loading]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
    <AppProvider>
    <MessagesProvider>
    <NotificationProvider>
      <RoleSyncer />
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="landing" />
          <Stack.Screen name="login" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="staff" />
          <Stack.Screen name="customer" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true }} />
        </Stack>
        <NotificationToast />
        <StatusBar style="auto" />
      </ThemeProvider>
    </NotificationProvider>
    </MessagesProvider>
    </AppProvider>
    </AuthProvider>
  );
}
