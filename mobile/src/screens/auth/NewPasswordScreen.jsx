import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Animated,
  KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackgroundCanvas from '../../components/auth/BackgroundCanvas';
import AuthCard         from '../../components/auth/AuthCard';
import AuthInput        from '../../components/auth/AuthInput';
import AuthButton       from '../../components/auth/AuthButton';
import BackBtn          from '../../components/auth/BackBtn';
import { colors }       from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing }      from '../../theme/spacing';
import { authService }  from '../../services/authService';

export default function NewPasswordScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { email = '', code = '' } = route?.params || {};

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [errors, setErrors]       = useState({});
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);

  const confirmRef = useRef(null);
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  const shake = () =>
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5,  duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,  duration: 55, useNativeDriver: true }),
    ]).start();

  const validate = () => {
    const e = {};
    if (!password)
      e.password = 'Password is required';
    else if (password.length < 6)
      e.password = 'Minimum 6 characters';
    else if (!/[A-Z]/.test(password) && password.length < 8)
      e.password = 'Use at least 8 characters for security';
    if (!confirm)
      e.confirm = 'Please confirm your password';
    else if (password !== confirm)
      e.confirm = 'Passwords do not match';
    setErrors(e);
    if (Object.keys(e).length > 0) shake();
    return Object.keys(e).length === 0;
  };

  const handleReset = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.resetPassword(email, code, password);
      setSuccess(true);
      // Navigate to Login after brief success moment
      setTimeout(() => navigation.replace('Login'), 1800);
    } catch (err) {
      setErrors({ general: err.message || 'Reset failed. The code may have expired.' });
      shake();
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <BackgroundCanvas style={styles.successRoot}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={colors.gold} />
        </View>
        <Text style={styles.successTitle}>Password Reset!</Text>
        <Text style={styles.successSub}>Redirecting you to Sign In…</Text>
      </BackgroundCanvas>
    );
  }

  return (
    <BackgroundCanvas style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <BackBtn onPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 72, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={32} color={colors.gold} />
          </View>

          {/* Headline */}
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.sub}>
            Your new password must be different from your previous password.
          </Text>

          <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
            <AuthCard>
              {errors.general ? (
                <View style={styles.apiError}>
                  <Text style={styles.apiErrorText}>{errors.general}</Text>
                </View>
              ) : null}

              <AuthInput
                label="New Password"
                value={password}
                onChangeText={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: '' })); }}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.password}
                onSubmitEditing={() => confirmRef.current?.focus()}
                returnKeyType="next"
              />

              <AuthInput
                inputRef={confirmRef}
                label="Confirm New Password"
                value={confirm}
                onChangeText={(v) => { setConfirm(v); setErrors((e) => ({ ...e, confirm: '' })); }}
                placeholder="••••••••"
                secureTextEntry
                leftIcon="lock-closed-outline"
                error={errors.confirm}
                onSubmitEditing={handleReset}
                returnKeyType="done"
              />

              {/* Password strength hint */}
              {password.length > 0 && (
                <StrengthBar password={password} />
              )}

              <AuthButton
                title="Reset Password"
                onPress={handleReset}
                loading={loading}
                size="lg"
                style={styles.btn}
              />
            </AuthCard>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </BackgroundCanvas>
  );
}

function StrengthBar({ password }) {
  const len     = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasNum   = /\d/.test(password);
  const hasSpec  = /[^A-Za-z0-9]/.test(password);
  const score    = [len >= 6, len >= 8, hasUpper, hasNum, hasSpec].filter(Boolean).length;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const barColors = ['', colors.error, colors.warning, colors.warning, colors.success, colors.gold];
  const filled = Math.round((score / 5) * 5);

  return (
    <View style={sb.wrap}>
      <View style={sb.bars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[sb.bar, i <= filled && { backgroundColor: barColors[score] }]}
          />
        ))}
      </View>
      <Text style={[sb.label, { color: barColors[score] || colors.textMuted }]}>
        {labels[score]}
      </Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.base,
    marginTop: -spacing.sm,
  },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  label: { fontSize: 10, fontWeight: '600', minWidth: 62, textAlign: 'right' },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.lg },
  successRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  successIconWrap: {
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
  },
  successSub: { color: colors.textSecondary, fontSize: fontSize.base },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.goldBg,
    borderWidth: 1.5,
    borderColor: colors.borderGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.base,
    lineHeight: 24,
    marginBottom: spacing.xl,
  },
  apiError: {
    backgroundColor: '#1A0000',
    borderWidth: 1,
    borderColor: `${colors.error}50`,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  apiErrorText: { color: colors.error, fontSize: fontSize.sm, textAlign: 'center' },
  btn: { marginTop: spacing.sm },
});
