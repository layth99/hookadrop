import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

const PROVIDERS = {
  apple: { icon: 'logo-apple',    color: '#FFFFFF', bg: '#1C1C1E', label: 'Apple' },
  google: { icon: 'logo-google',  color: '#EA4335', bg: '#1C1C1E', label: 'Google' },
  facebook: { icon: 'logo-facebook', color: '#1877F2', bg: '#1C1C1E', label: 'Facebook' },
};

export default function SocialButton({ provider, onPress, showLabel = false }) {
  const config = PROVIDERS[provider];
  if (!config) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.btn, { backgroundColor: config.bg }]}
    >
      <Ionicons name={config.icon} size={22} color={config.color} />
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
});
