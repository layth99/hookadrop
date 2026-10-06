import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Clean, static dark background — pure near-black, no yellow/gold animations.
 * Just a solid deep dark that makes gold elements pop.
 */
export default function BackgroundCanvas({ children, style }) {
  return (
    <View style={[styles.root, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg, // #080808
  },
});
