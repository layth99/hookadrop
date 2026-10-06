import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

const STATUS_COLORS = {
  pending:    { bg: '#1A1200', border: '#FFA500', text: '#FFA500' },
  confirmed:  { bg: '#001A0D', border: '#22C55E', text: '#22C55E' },
  processing: { bg: '#00101A', border: '#00D9FF', text: '#00D9FF' },
  shipped:    { bg: '#0A0A1A', border: '#3B82F6', text: '#3B82F6' },
  delivered:  { bg: '#001A0D', border: '#22C55E', text: '#22C55E' },
  cancelled:  { bg: '#1A0000', border: '#EF4444', text: '#EF4444' },
  declined:   { bg: '#1A0000', border: '#EF4444', text: '#EF4444' },
  returned:   { bg: '#1A0A00', border: '#F59E0B', text: '#F59E0B' },
  refunded:   { bg: '#1A0A00', border: '#F59E0B', text: '#F59E0B' },
  new:        { bg: '#00101A', border: '#00D9FF', text: '#00D9FF' },
  sale:       { bg: '#1A0000', border: '#EF4444', text: '#EF4444' },
};

export default function Badge({ label, status, style }) {
  const scheme = STATUS_COLORS[status?.toLowerCase()] || STATUS_COLORS.new;

  return (
    <View style={[styles.badge, { backgroundColor: scheme.bg, borderColor: scheme.border }, style]}>
      <Text style={[styles.text, { color: scheme.text }]}>{label || status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'capitalize',
    letterSpacing: 0.4,
  },
});
