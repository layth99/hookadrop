import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export default function Header({
  title,
  onBack,
  rightElement,
  transparent = false,
  titleCenter = true,
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        transparent ? styles.transparent : styles.solid,
        { paddingTop: insets.top + 8 },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.inner}>
        {/* Left */}
        <View style={styles.side}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <View style={styles.backCircle}>
                <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        {title && (
          <Text style={[styles.title, titleCenter && styles.centered]} numberOfLines={1}>
            {title}
          </Text>
        )}

        {/* Right */}
        <View style={styles.side}>
          {rightElement && <View style={styles.rightWrap}>{rightElement}</View>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    zIndex: 10,
  },
  solid: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transparent: { backgroundColor: 'transparent' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtn: { padding: 2 },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  centered: { textAlign: 'center' },
  rightWrap: { alignItems: 'flex-end' },
});
