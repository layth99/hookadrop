import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, shadows } from '../../theme/colors';
import { radius, spacing } from '../../theme/spacing';

export default function Card({ children, style, onPress, noPadding = false }) {
  const content = (
    <View style={[styles.card, !noPadding && styles.padding, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  padding: {
    padding: spacing.base,
  },
});
