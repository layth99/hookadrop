import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

const PROVIDERS = [
  { key: 'apple',    icon: 'logo-apple',    color: '#FFFFFF', label: 'Apple'    },
  { key: 'google',   icon: 'logo-google',   color: '#EA4335', label: 'Google'   },
  { key: 'facebook', icon: 'logo-facebook', color: '#1877F2', label: 'Facebook' },
];

export default function SocialRow({ onPress, dividerLabel = 'or continue with' }) {
  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>{dividerLabel}</Text>
        <View style={styles.line} />
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        {PROVIDERS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={styles.btn}
            onPress={() => onPress?.(p.key)}
            activeOpacity={0.7}
          >
            <Ionicons name={p.icon} size={20} color={p.color} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.base },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginHorizontal: spacing.md,
    letterSpacing: 0.4,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  btn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.bgOverlay,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
