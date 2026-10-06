import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * ─────────────────────────────────────────────
 *  To swap the logo: replace assets/logo.png
 *  with your new image file (same name).
 * ─────────────────────────────────────────────
 */

const LOGO = require('../../../assets/logo.png');

const SIZES = {
  sm: 80,
  md: 130,
  lg: 180,
  xl: 220,
};

export default function Logo({ size = 'md', style }) {
  const dim = typeof size === 'number' ? size : (SIZES[size] || 130);

  return (
    <View style={[styles.container, style]}>
      <Image
        source={LOGO}
        style={{ width: dim, height: dim }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
