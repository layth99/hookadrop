import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ActivityIndicator,
  View, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

export default function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',   // 'primary' | 'outline' | 'ghost'
  size = 'lg',           // 'md' | 'lg'
  style,
  textStyle,
  icon,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();

  const isDisabled = disabled || loading;
  const h = size === 'lg' ? 56 : 48;

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={isDisabled}
          activeOpacity={1}
          style={[styles.base, isDisabled && styles.disabled]}
        >
          <LinearGradient
            colors={isDisabled ? ['#555', '#444'] : gradients.goldBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.gradient, { height: h }]}
          >
            {loading ? (
              <ActivityIndicator color={colors.black} size="small" />
            ) : (
              <View style={styles.row}>
                {icon && <View style={styles.iconLeft}>{icon}</View>}
                <Text style={[styles.textPrimary, textStyle]}>{title}</Text>
              </View>
            )}
          </LinearGradient>
          {/* Gold shadow layer */}
          {!isDisabled && (
            <View style={[styles.btnShadow, { height: h }]} pointerEvents="none" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'outline') {
    return (
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={pressIn}
          onPressOut={pressOut}
          disabled={isDisabled}
          activeOpacity={0.75}
          style={[styles.base, styles.outlineWrap, { height: h }, isDisabled && styles.disabled]}
        >
          {loading ? (
            <ActivityIndicator color={colors.gold} size="small" />
          ) : (
            <Text style={[styles.textOutline, textStyle]}>{title}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ghost
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.6}
      style={[styles.ghostWrap, style]}
    >
      <Text style={[styles.textGhost, textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  btnShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: radius.full,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 0, // elevation doesn't support colour — handled via wrapper
  },
  outlineWrap: {
    borderWidth: 1.5,
    borderColor: colors.goldWarm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: 8 },
  textPrimary: {
    color: colors.black,
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.6,
  },
  textOutline: {
    color: colors.goldWarm,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  textGhost: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  disabled: { opacity: 0.45 },
});
