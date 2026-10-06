import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, shadows } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

/**
 * Semi-transparent dark card used to contain auth forms.
 * Has a thin gold top-border accent and subtle glow.
 */
export default function AuthCard({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {/* Top gold accent line */}
      <View style={styles.topAccent} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F0F0F',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    paddingTop: spacing.xl + 4,
    ...shadows.card,
    // extra gold glow on the shadow
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: '15%',
    right: '15%',
    height: 2,
    borderRadius: 2,
    backgroundColor: colors.goldWarm,
    opacity: 0.6,
  },
});
