/**
 * Root Layout — App entry point
 *
 * Sets up AuthProvider, QueryClient, and navigation structure.
 * Redirects unauthenticated users to login.
 */
import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../hooks/useAuth';
import { Colors } from '../styles/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="item/[id]"
            options={{
              headerShown: true,
              title: 'Item Details',
              headerTintColor: Colors.textPrimary,
              headerStyle: { backgroundColor: Colors.surface },
              presentation: 'card',
            }}
          />
          <Stack.Screen
            name="outfit/[id]"
            options={{
              headerShown: true,
              title: 'Outfit Details',
              headerTintColor: Colors.textPrimary,
              headerStyle: { backgroundColor: Colors.surface },
              presentation: 'card',
            }}
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
