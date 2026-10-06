import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, shadows } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

export default function Button({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'outline' | 'ghost' | 'blue'
  size = 'md',          // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon,
  iconRight,
  style,
  textStyle,
}) {
  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.base, minHeight: 38 },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl,  minHeight: 50 },
    lg: { paddingVertical: spacing.base, paddingHorizontal: spacing.xl, minHeight: 56 },
  };
  const textSizes = { sm: fontSize.sm, md: fontSize.md, lg: fontSize.lg };

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.base, sizeStyles[size], isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={gradients.gold}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color={colors.black} size="small" />
          ) : (
            <View style={styles.row}>
              {icon && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.textPrimary, { fontSize: textSizes[size] }, textStyle]}>
                {title}
              </Text>
              {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'blue') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.base, sizeStyles[size], isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={gradients.blue}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, sizeStyles[size]]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <View style={styles.row}>
              {icon && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.textBlue, { fontSize: textSizes[size] }, textStyle]}>
                {title}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.7}
        style={[
          styles.base,
          styles.outline,
          sizeStyles[size],
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.gold} size="small" />
        ) : (
          <View style={styles.row}>
            {icon && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={[styles.textOutline, { fontSize: textSizes[size] }, textStyle]}>
              {title}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.6}
      style={[styles.base, sizeStyles[size], isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.gold} size="small" />
      ) : (
        <Text style={[styles.textGhost, { fontSize: textSizes[size] }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.full,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  outline: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: 'transparent',
  },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
  textPrimary: {
    color: colors.black,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  textBlue: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  textOutline: {
    color: colors.gold,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.5,
  },
  textGhost: {
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
  },
});
