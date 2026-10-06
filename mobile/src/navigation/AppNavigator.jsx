import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Auth screens
import SplashScreen      from '../screens/auth/SplashScreen';
import OnboardingScreen  from '../screens/auth/OnboardingScreen';
import LoginScreen       from '../screens/auth/LoginScreen';
import RegisterScreen    from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import VerifyCodeScreen  from '../screens/auth/VerifyCodeScreen';
import NewPasswordScreen from '../screens/auth/NewPasswordScreen';

// Main screens
import HomeScreen         from '../screens/main/HomeScreen';
import ProductsScreen     from '../screens/main/ProductsScreen';
import ProductDetailScreen from '../screens/main/ProductDetailScreen';
import CartScreen         from '../screens/main/CartScreen';
import CheckoutScreen     from '../screens/main/CheckoutScreen';
import OrderSuccessScreen from '../screens/main/OrderSuccessScreen';
import OrdersScreen       from '../screens/main/OrdersScreen';
import OrderDetailScreen  from '../screens/main/OrderDetailScreen';
import WishlistScreen     from '../screens/main/WishlistScreen';
import ProfileScreen      from '../screens/main/ProfileScreen';

import { colors } from '../theme/colors';
import { fontSize, fontWeight } from '../theme/typography';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ─── Bottom Tab Navigator ────────────────────────────────────────────────────
function MainTabs() {
  const cartCount = useCartStore((s) => s.cartCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <LinearGradient
            colors={['#111111', '#0A0A0A']}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor:   colors.gold,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':     iconName = focused ? 'home'         : 'home-outline';     break;
            case 'Products': iconName = focused ? 'grid'         : 'grid-outline';     break;
            case 'Cart':     iconName = focused ? 'bag'          : 'bag-outline';      break;
            case 'Orders':   iconName = focused ? 'receipt'      : 'receipt-outline';  break;
            case 'Profile':  iconName = focused ? 'person'       : 'person-outline';   break;
            default:         iconName = 'ellipse-outline';
          }
          return (
            <View style={styles.tabIconWrap}>
              {focused && <View style={styles.tabActiveGlow} />}
              <Ionicons name={iconName} size={22} color={color} />
              {route.name === 'Cart' && cartCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen}    options={{ title: 'Home' }} />
      <Tab.Screen name="Products" component={ProductsScreen} options={{ title: 'Shop' }} />
      <Tab.Screen name="Cart"     component={CartScreen}    options={{ title: 'Cart' }} />
      <Tab.Screen name="Orders"   component={OrdersScreen}  options={{ title: 'Orders' }} />
      <Tab.Screen name="Profile"  component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Root Stack ──────────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user, token } = useAuthStore();
  const isAuthed = !!(user && token);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        {/* Always render Splash first — it decides where to route */}
        <Stack.Screen name="Splash"          component={SplashScreen} />

        {/* Auth flow — only accessible when not authenticated */}
        <Stack.Screen name="Onboarding"      component={OnboardingScreen}     options={{ animation: 'fade' }} />
        <Stack.Screen name="Login"           component={LoginScreen}          options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Register"        component={RegisterScreen}       options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="VerifyCode"      component={VerifyCodeScreen}     options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="NewPassword"     component={NewPasswordScreen}    options={{ animation: 'slide_from_right' }} />

        {/* Main app — only accessible when authenticated */}
        <Stack.Screen name="MainTabs"        component={MainTabs}             options={{ animation: 'fade' }} />
        <Stack.Screen name="ProductDetail"   component={ProductDetailScreen}  options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Checkout"        component={CheckoutScreen}       options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="OrderSuccess"    component={OrderSuccessScreen}   options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="OrderDetail"     component={OrderDetailScreen}    options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Wishlist"        component={WishlistScreen}       options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
    elevation: 20,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: 2,
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActiveGlow: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold,
    opacity: 0.12,
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  tabBadgeText: {
    color: colors.black,
    fontSize: 9,
    fontWeight: fontWeight.black,
  },
});
