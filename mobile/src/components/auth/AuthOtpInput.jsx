import React, { useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { View, TextInput, StyleSheet, Animated } from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius, spacing } from '../../theme/spacing';

const AuthOtpInput = forwardRef(function AuthOtpInput({ length = 4, onComplete, onChangeCode }, ref) {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const inputs              = useRef([]);
  const scales              = useRef(Array.from({ length }, () => new Animated.Value(1))).current;

  useImperativeHandle(ref, () => ({
    clear: () => {
      setDigits(Array(length).fill(''));
      inputs.current[0]?.focus();
    },
  }));

  const animateBox = (i) => {
    Animated.sequence([
      Animated.spring(scales[i], { toValue: 1.08, useNativeDriver: true, speed: 40 }),
      Animated.spring(scales[i], { toValue: 1,    useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  const handleChange = (text, i) => {
    const digit   = text.slice(-1);
    const updated = [...digits];
    updated[i]    = digit;
    setDigits(updated);
    onChangeCode?.(updated.join(''));
    if (digit) {
      animateBox(i);
      if (i < length - 1) inputs.current[i + 1]?.focus();
      if (updated.every((d) => d !== '')) onComplete?.(updated.join(''));
    }
  };

  const handleKeyPress = ({ nativeEvent }, i) => {
    if (nativeEvent.key === 'Backspace') {
      if (digits[i]) {
        const updated = [...digits];
        updated[i]    = '';
        setDigits(updated);
        onChangeCode?.(updated.join(''));
      } else if (i > 0) {
        inputs.current[i - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.row}>
      {digits.map((d, i) => (
        <Animated.View key={i} style={[styles.boxWrap, { transform: [{ scale: scales[i] }] }]}>
          <TextInput
            ref={(r) => (inputs.current[i] = r)}
            style={[styles.box, d && styles.boxFilled]}
            value={d}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectionColor={colors.gold}
            caretHidden
          />
        </Animated.View>
      ))}
    </View>
  );
});

export default AuthOtpInput;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  boxWrap: {},
  box: {
    width: 58,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1.5,
    borderColor: colors.border,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  boxFilled: {
    borderColor: colors.gold,
    backgroundColor: colors.goldBg,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
});
