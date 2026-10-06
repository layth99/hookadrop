import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Animated, Dimensions, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from '../../components/ui/Logo';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';

const { height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Animations
  const logoScale   = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale   = useRef(new Animated.Value(0.6)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const barWidth    = useRef(new Animated.Value(0)).current;

  const { init, user } = useAuthStore();

  useEffect(() => {
    // 1. Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 52,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Decorative ring expands behind logo
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.spring(ringScale, {
          toValue: 1,
          tension: 30,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Loading bar sweeps across bottom
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(barWidth, {
        toValue: 1,
        duration: 1600,
        useNativeDriver: false,
      }),
    ]).start();

    // 4. Init auth state then navigate
    const run = async () => {
      await init();
      // Wait for the bar animation to complete
      await new Promise((r) => setTimeout(r, 2400));
      const store = useAuthStore.getState();
      if (store.user && store.token) {
        navigation.replace('MainTabs');
      } else {
        navigation.replace('Onboarding');
      }
    };
    run();
  }, []);

  const barInterpolated = barWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Decorative glow ring */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ringInner,
          {
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Logo size="xl" />
      </Animated.View>

      {/* Corner decorative dots */}
      <View style={[styles.dotTL, { top: insets.top + 30 }]} />
      <View style={styles.dotBR} />

      {/* Loading bar */}
      <View style={[styles.barTrack, { bottom: insets.bottom + 40 }]}>
        <Animated.View style={[styles.barFill, { width: barInterpolated }]} />
      </View>
    </View>
  );
}

const RING = 260;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: colors.borderGold,
  },
  ringInner: {
    position: 'absolute',
    width: RING * 0.72,
    height: RING * 0.72,
    borderRadius: (RING * 0.72) / 2,
    borderWidth: 1,
    borderColor: colors.goldWarm,
    borderStyle: 'dashed',
    opacity: 0.25,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotTL: {
    position: 'absolute',
    left: 28,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.goldWarm,
    opacity: 0.5,
  },
  dotBR: {
    position: 'absolute',
    bottom: height * 0.16,
    right: 32,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gold,
    opacity: 0.4,
  },
  barTrack: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.gold,
  },
});
