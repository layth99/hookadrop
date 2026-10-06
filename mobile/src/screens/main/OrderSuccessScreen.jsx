import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function OrderSuccessScreen({ navigation }) {
  const scale   = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#001A0D', '#0A0A0A']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <Animated.View style={[styles.iconWrap, { transform: [{ scale }] }]}>
          <LinearGradient colors={['#22C55E', '#16A34A']} style={styles.iconGradient}>
            <Ionicons name="checkmark" size={48} color={colors.white} />
          </LinearGradient>
        </Animated.View>

        <Animated.View style={{ opacity }}>
          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.subtitle}>
            Your order has been successfully placed.{'\n'}
            We'll notify you when it's on the way.
          </Text>
        </Animated.View>

        <View style={styles.btnRow}>
          <Button
            title="Track Order"
            onPress={() => navigation.replace('Orders')}
            size="lg"
            style={{ flex: 1 }}
          />
          <Button
            title="Continue Shopping"
            onPress={() => navigation.replace('MainTabs')}
            size="lg"
            variant="outline"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.base, gap: spacing.xl,
  },
  iconWrap: {
    width: 120, height: 120, borderRadius: 60,
    shadowColor: colors.success, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 24, elevation: 16,
  },
  iconGradient: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    color: colors.textPrimary, fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black, textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary, fontSize: fontSize.base,
    textAlign: 'center', lineHeight: 24,
  },
  btnRow: { flexDirection: 'row', gap: spacing.md, width: '100%' },
});
