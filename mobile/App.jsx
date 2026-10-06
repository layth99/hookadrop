import 'react-native-gesture-handler'; // must be first import
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { useCartStore } from './src/store/cartStore';
import { useWishlistStore } from './src/store/wishlistStore';

export default function App() {
  const initAuth     = useAuthStore((s) => s.init);
  const loadCart     = useCartStore((s) => s.loadCart);
  const loadWishlist = useWishlistStore((s) => s.loadWishlist);

  useEffect(() => {
    // Rehydrate all persisted state on app launch
    initAuth();
    loadCart();
    loadWishlist();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
