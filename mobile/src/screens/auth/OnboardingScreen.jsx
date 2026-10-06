import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Image, Dimensions,
  TouchableOpacity, StatusBar, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';

const { width, height } = Dimensions.get('window');

const IMG1 = require('../../components/08bc23de56131e68e3d7e0f6d1f399e7.jpg');
const IMG2 = require('../../components/a9833eae998777482c234a492d66aa70.jpg');
const IMG3 = require('../../components/d00ed793551c68c3998fa4f6bdb0dd5a.jpg');

export default function OnboardingScreen({ navigation }) {
  const insets   = useSafeAreaInsets();
  const btnScale = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(btnScale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true, speed: 30 }).start();

  // Responsive sizes — derived from actual screen
  const PHOTO_H    = height * 0.54;     // photos take 54% of screen height
  const LEFT_W     = width  * 0.50;
  const RIGHT_W    = width  - LEFT_W - 3; // 3 px gap
  const FONT_WM    = width  * 0.13;     // watermark font
  const FONT_BODY  = Math.max(width * 0.052, 18);   // body text — bigger
  const FONT_BTN   = Math.max(width * 0.042, 15);   // button text
  const BTN_H      = Math.max(height * 0.072, 52);  // button height
  const BOTTOM_PAD = Math.max(insets.bottom + 16, 24);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── PHOTO MOSAIC ─────────────────────────────────────────────── */}
      <View style={{ height: PHOTO_H + insets.top, flexDirection: 'row' }}>

        {/* "HOOKAH" watermark */}
        <Text
          style={[styles.watermark, { top: insets.top + 8, fontSize: FONT_WM }]}
          pointerEvents="none"
        >
          HOOKAH
        </Text>

        {/* Left: tall photo */}
        <View style={[styles.photoLeft, { width: LEFT_W, marginTop: insets.top }]}>
          <Image source={IMG1} style={styles.fill} resizeMode="cover" />
          <LinearGradient colors={['transparent', colors.bg]} style={styles.fadeBottom} />
        </View>

        {/* 3 px gap */}
        <View style={{ width: 3 }} />

        {/* Right: two stacked photos */}
        <View style={[styles.photoRight, { width: RIGHT_W, marginTop: insets.top }]}>
          {/* top right */}
          <View style={[styles.photoHalf, { marginBottom: 3 }]}>
            <Image source={IMG2} style={styles.fill} resizeMode="cover" />
            <LinearGradient colors={['transparent', colors.bg]} style={styles.fadeBottom} />
          </View>

          {/* snowflake between the two right photos */}
          <View style={styles.snowMid} pointerEvents="none">
            <Ionicons name="snow-outline" size={width * 0.055} color={colors.gold} />
          </View>

          {/* bottom right */}
          <View style={styles.photoHalf}>
            <Image source={IMG3} style={styles.fill} resizeMode="cover" />
            <LinearGradient colors={['transparent', colors.bg]} style={styles.fadeBottom} />
          </View>
        </View>

        {/* Bottom-centre snowflake on the left photo */}
        <View style={[styles.snowBottom, { left: LEFT_W / 2 - 10, top: PHOTO_H + insets.top - 28 }]}
          pointerEvents="none">
          <Ionicons name="snow-outline" size={width * 0.045} color={colors.gold} />
        </View>
      </View>

      {/* ── BOTTOM TEXT + CTA ─────────────────────────────────────────── */}
      <View style={[styles.bottom, { paddingBottom: BOTTOM_PAD, flex: 1 }]}>

        {/* Body copy */}
        <View>
          <Text style={[styles.bodyText, { fontSize: FONT_BODY, lineHeight: FONT_BODY * 1.45 }]}>
            {"The experience you've "}
            <Text style={[styles.bodyHighlight, { fontSize: FONT_BODY, lineHeight: FONT_BODY * 1.45 }]}>been waiting</Text>
            {" for is almost here"}
          </Text>
        </View>

        {/* Gold CTA button */}
        <Animated.View style={[styles.btnWrap, { transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            onPress={() => navigation.replace('Login')}
            onPressIn={pressIn}
            onPressOut={pressOut}
            activeOpacity={1}
          >
            <LinearGradient
              colors={['#C9A227', '#A68520']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.btn, { height: BTN_H }]}
            >
              <Text style={[styles.btnText, { fontSize: FONT_BTN }]}>Let's Get start</Text>
              <View style={styles.btnArrow}>
                <Ionicons name="arrow-forward" size={width * 0.045} color={colors.black} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom pill */}
        <View style={styles.pill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Watermark
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontWeight: '900',
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.07)',
    letterSpacing: 6,
    zIndex: 3,
  },

  // Photos
  photoLeft: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    flex: 1,                  // fill remaining height
  },
  photoRight: {
    flexDirection: 'column',
    flex: 1,
    position: 'relative',
  },
  photoHalf: {
    flex: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },

  // Decorative icons
  snowMid: {
    position: 'absolute',
    zIndex: 5,
    alignSelf: 'center',
    top: '50%',
    marginTop: -11,
  },
  snowBottom: {
    position: 'absolute',
    zIndex: 5,
  },

  // Bottom section
  bottom: {
    paddingHorizontal: width * 0.055,
    paddingTop: height * 0.022,
    justifyContent: 'space-between',
  },
  bodyText: {
    color: colors.textPrimary,
    fontWeight: fontWeight.light,
    lineHeight: undefined,       // let it auto-scale
  },
  bodyHighlight: {
    color: colors.textPrimary,
    fontWeight: fontWeight.light,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    textDecorationColor: colors.goldWarm,
  },

  // Button
  btnWrap: {
    shadowColor: colors.goldWarm,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 14,
    borderRadius: radius.full,   // ← pill shape matches the button
  },
  btn: {
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.06,
    gap: 10,
    overflow: 'hidden',
  },
  btnText: {
    color: colors.black,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  btnArrow: {
    width: width * 0.07,
    height: width * 0.07,
    borderRadius: (width * 0.07) / 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
});
