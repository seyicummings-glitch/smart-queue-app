import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (!loading) {
    if (!user) return <Redirect href="/login" />;
    const role = user.role;
    if (role === 'staff') return <Redirect href="/staff/dashboard" />;
    if (role !== 'admin' && role !== 'superadmin') return <Redirect href="/customer/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
