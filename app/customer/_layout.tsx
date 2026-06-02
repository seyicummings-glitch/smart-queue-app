import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function CustomerLayout() {
  const { user, loading } = useAuth();

  if (loading) return <View style={{ flex: 1, backgroundColor: '#f8fafc' }} />;
  if (!user)   return <Redirect href="/login" />;

  const role = user.role;
  if (role === 'admin' || role === 'superadmin' || role === 'super_admin') return <Redirect href="/admin/dashboard" />;
  if (role === 'staff')                                                     return <Redirect href="/staff/dashboard" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ticket" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
